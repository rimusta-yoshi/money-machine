import type { TradeConfig } from '../types'
import type { OpeningHours, Review } from './schema'

/**
 * Placeholder content shown only in the builder, always flagged as an example.
 * It is never published: see resolveContent.
 */
export interface ExampleContent {
  badges: string[]
  areas: string[]
  hours: OpeningHours[]
  emergency: boolean
  jobsDone: string
  rating: { score: number; count: number }
  reviews: Review[]
}

const AREAS = ['Town Centre', 'North District', 'East Side', 'West End', 'South Quarter', 'Old Town', 'New Estate', 'Riverside']

const HOURS: OpeningHours[] = [
  { day: 'Mon – Fri', time: '7:00 – 18:00' },
  { day: 'Saturday', time: '8:00 – 16:00' },
  { day: 'Sunday', time: 'Closed' },
]

const REVIEWS: Review[] = [
  { author: 'Sarah M.', location: 'Local area', rating: 5, text: 'Professional from start to finish. Fast response, fair price, no fuss.' },
  { author: 'James O.', location: 'Nearby', rating: 5, text: 'Quote was clear, timeline was honest, finish is spotless. Already booked again.' },
  { author: 'Priya K.', location: 'Local area', rating: 5, text: 'Answered straight away, came out and sorted it. Didn’t overcharge.' },
  { author: 'Tom R.', location: 'Nearby', rating: 5, text: 'Honest, polite and properly skilled. Our regular from now on.' },
]

export function exampleContent(trade: TradeConfig): ExampleContent {
  return {
    badges: trade.trustSignals,
    areas: AREAS,
    hours: HOURS,
    emergency: true,
    jobsDone: '2,800+',
    rating: { score: 4.9, count: 312 },
    reviews: REVIEWS,
  }
}
