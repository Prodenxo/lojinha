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

export function buildEmail({ title, text, buttonLabel, buttonUrl }) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
  <p style="font-size:14px;color:#0f5a3a;font-weight:bold;margin:0 0 16px">${STORE}</p>
  <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
  <p style="font-size:15px;line-height:1.5;margin:0 0 20px">${escapeHtml(text)}</p>
  <a href="${buttonUrl}" style="display:inline-block;background:#c9a24b;color:#000;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">${escapeHtml(buttonLabel)}</a>
  <p style="font-size:12px;color:#666;margin:24px 0 0">Se o botão não abrir, copie este endereço: ${buttonUrl}</p>
</div>`;
  return { subject: `${title} | ${STORE}`, html, text: `${title}\n\n${text}\n\n${buttonLabel}: ${buttonUrl}` };
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

export const sendPaidEmail = (order) =>
  send(
    order.customer_email,
    buildEmail({
      title: "Pagamento aprovado",
      text: `Recebemos o pagamento de "${order.product_name}". Estamos preparando a entrega e avisamos por e-mail assim que estiver pronta.`,
      buttonLabel: "Acompanhar pedido",
      buttonUrl: orderUrl(order.code),
    }),
  );

// O e-mail leva só o link: login e senha ficam na página do pedido, não na caixa de entrada.
export const sendDeliveredEmail = (order) =>
  send(
    order.customer_email,
    buildEmail({
      title: "Seu pedido foi entregue",
      text: `"${order.product_name}" já está disponível. Abra a página do pedido para ver os dados de acesso.`,
      buttonLabel: "Ver minha entrega",
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
