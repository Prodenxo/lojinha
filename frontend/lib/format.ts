const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatBRL = (value: number) => brl.format(Number(value));

export function durationLabel(days: number | null) {
  if (!days) return null;
  if (days >= 360 && days % 360 < 30) {
    const years = Math.round(days / 360);
    return years === 1 ? "12 meses" : `${years} anos`;
  }
  if (days >= 30) {
    const months = Math.round(days / 30);
    return months === 1 ? "1 mês" : `${months} meses`;
  }
  return `${days} dias`;
}

const DELIVERY: Record<string, string> = {
  LINK: "Link de ativação",
  READY_ACCOUNT: "Conta pronta",
  COUPON: "Código / cupom",
};

export const deliveryLabel = (type: string | null) => (type ? (DELIVERY[type] ?? type) : null);

// Cor estável por categoria, para os cards sem foto.
export function categoryHue(category: string) {
  let hash = 0;
  for (const char of category) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}
