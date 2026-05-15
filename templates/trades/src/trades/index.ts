import { painter } from './painter'
import { roofer } from './roofer'
import { electrician } from './electrician'
import { landscaper } from './landscaper'
import { plumber } from './plumber'
import { barber } from './barber'
import type { TradeConfig, TradeId } from '../types'

export const trades: TradeConfig[] = [painter, roofer, electrician, landscaper, plumber, barber]

export const tradeById: Record<TradeId, TradeConfig> = {
  painter,
  roofer,
  electrician,
  landscaper,
  plumber,
  barber,
}
