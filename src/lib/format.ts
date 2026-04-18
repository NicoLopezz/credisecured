// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatARS(value: any): string {
  if (value === null || value === undefined) return "$0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-AR").format(value);
}

export function formatCuit(cuit: string): string {
  if (cuit.length === 11) {
    return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
  }
  return cuit;
}
