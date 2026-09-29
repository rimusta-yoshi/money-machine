import { COUNTER_FROM } from '../../site/limits'

/** Props that link a field to its counter, only while the counter is showing. */
export const counted = (id: string, value: string, max: number) =>
  ({ maxLength: max, 'aria-describedby': value.length >= Math.ceil(max * COUNTER_FROM) ? id : undefined })
