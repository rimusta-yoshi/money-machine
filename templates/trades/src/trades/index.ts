import { painter } from './painter'
import { roofer } from './roofer'
import { electrician } from './electrician'
import { landscaper } from './landscaper'
import type { TradeConfig, TradeId } from '../types'

export const trades: TradeConfig[] = [painter, roofer, electrician, landscaper]

export const tradeById: Record<TradeId, TradeConfig> = {
  painter,
  roofer,
  electrician,
  landscaper,
}
