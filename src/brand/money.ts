/** £99, or £99.50. */
export const money = (pence: number): string => `£${(pence / 100).toFixed(pence % 100 ? 2 : 0)}`
