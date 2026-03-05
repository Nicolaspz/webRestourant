export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "AOA", // kwanza
  }).format(value)
}