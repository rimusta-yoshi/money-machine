import { painter } from './painter'
import { roofer } from './roofer'
import { electrician } from './electrician'
import { landscaper } from './landscaper'
import { plumber } from './plumber'
import type { TradeConfig, TradeId } from '../types'

export const trades: TradeConfig[] = [plumber, painter, roofer, electrician, landscaper]

export const tradeById: Record<TradeId, TradeConfig> = {
  plumber,
  painter,
  roofer,
  electrician,
  landscaper,
}
