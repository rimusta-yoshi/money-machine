/** Groups on the /websites-for/ hub, in this order. */
export const CATEGORIES = {
  trade: 'Building and repair trades',
  outdoor: 'Gardens and outdoors',
  'home-service': 'Home services',
  personal: 'Hair, beauty and wellbeing',
  creative: 'Creative and events',
  food: 'Food and drink',
} as const
export type Category = keyof typeof CATEGORIES
