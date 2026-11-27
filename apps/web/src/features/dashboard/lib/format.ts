/** ETB currency formatting — demo values are always labeled as such in UI. */
const etbFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatETB(amount: number): string {
  return `ETB ${etbFormatter.format(amount)}`;
}
