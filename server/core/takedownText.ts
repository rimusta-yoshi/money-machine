import type { Config } from './config'

/** What a taken-down site's owner is told (server/core/takedown.ts): no other imports, so anything can use it. */

/** The bare support address (SUPPORT_EMAIL may be "Name <address>"). */
export const supportAddress = (c: Config): string => c.email.support.replace(/^.*<([^>]+)>$/, '$1')

/** The builder's taken-down screen, refused API calls and the refund link all say this. */
export const takenDownMessage = (c: Config): string =>
  `Your site has been taken down because it breaks our terms. If you think this is a mistake, email ${supportAddress(c)}.`
