import nodemailer from "nodemailer";

const STORE = "Lojinha do Leonardo Mohammed";

export const mailConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);

let transporter;
function getTransporter() {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

const publicUrl = () => process.env.PUBLIC_URL?.replace(/\/$/, "") ?? "";

const escapeHtml = (text) =>
  String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Texto da entrega em HTML: preserva quebras de linha e torna os links clicáveis.
const deliveryHtml = (text) =>
  escapeHtml(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#0f5a3a;word-break:break-all">$1</a>')
    .replace(/\n/g, "<br>");

// rows: linhas "rótulo: valor" do resumo; box: bloco destacado (a entrega).
export function buildEmail({ title, text, rows = [], box, buttonLabel, buttonUrl }) {
  const summary = rows.length
    ? `<table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px">${rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">${escapeHtml(label)}</td><td style="padding:8px 0;text-align:right;font-weight:bold;border-bottom:1px solid #eee">${escapeHtml(value)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const boxHtml = box
    ? `<div style="background:#f6f3ea;border:1px solid #c9a24b;border-radius:10px;padding:16px;margin:0 0 20px">
    <p style="font-size:13px;font-weight:bold;color:#0f5a3a;margin:0 0 8px">${escapeHtml(box.title)}</p>
    <div style="font-family:Consolas,Menlo,monospace;font-size:14px;line-height:1.6">${deliveryHtml(box.text)}</div>
  </div>`
    : "";
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a">
  <p style="font-size:14px;color:#0f5a3a;font-weight:bold;margin:0 0 16px">${STORE}</p>
  <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
  <p style="font-size:15px;line-height:1.5;margin:0 0 20px">${escapeHtml(text)}</p>
  ${summary}${boxHtml}
  <a href="${buttonUrl}" style="display:inline-block;background:#c9a24b;color:#000;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">${escapeHtml(buttonLabel)}</a>
  <p style="font-size:12px;color:#666;margin:24px 0 0">Se o botão não abrir, copie este endereço: ${buttonUrl}</p>
</div>`;
  const plain = [
    title,
    text,
    rows.map(([label, value]) => `${label}: ${value}`).join("\n"),
    box ? `${box.title}\n${box.text}` : "",
    `${buttonLabel}: ${buttonUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { subject: `${title} | ${STORE}`, html, text: plain };
}

// Falha de e-mail nunca derruba o pedido: só registra no log.
async function send(to, email) {
  if (!mailConfigured()) return false;
  try {
    await getTransporter().sendMail({ from: process.env.MAIL_FROM, to, ...email });
    return true;
  } catch (err) {
    console.error(`E-mail para ${to} falhou:`, err.message);
    return false;
  }
}

const orderUrl = (code) => `${publicUrl()}/pedido/${code}`;

const money = (cents) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const orderRows = (order) => [
  ["Produto", order.product_name],
  ["Valor", money(order.amount_cents)],
  ["Pedido", order.code.slice(0, 8).toUpperCase()],
];

export const sendPaidEmail = (order) =>
  send(
    order.customer_email,
    buildEmail({
      title: "Pagamento aprovado",
      text: "Recebemos seu pagamento. Estamos preparando a entrega e avisamos por e-mail assim que estiver pronta.",
      rows: orderRows(order),
      buttonLabel: "Acompanhar pedido",
      buttonUrl: orderUrl(order.code),
    }),
  );

// Leva a entrega completa (link, código ou login e senha) no corpo do e-mail.
export const sendDeliveredEmail = (order, delivery) =>
  send(
    order.customer_email,
    buildEmail({
      title: "Seu pedido foi entregue",
      text: "Obrigado pela compra! Seus dados de acesso estão abaixo. Eles também ficam guardados em \"Meus pedidos\", na loja.",
      rows: orderRows(order),
      box: { title: "Sua entrega", text: delivery },
      buttonLabel: "Ver pedido na loja",
      buttonUrl: orderUrl(order.code),
    }),
  );

export const sendResetEmail = (to, token) =>
  send(
    to,
    buildEmail({
      title: "Redefinir sua senha",
      text: "Use o botão abaixo para criar uma nova senha. O link vale por 1 hora. Se você não pediu, ignore este e-mail.",
      buttonLabel: "Criar nova senha",
      buttonUrl: `${publicUrl()}/recuperar-senha?token=${token}`,
    }),
  );
