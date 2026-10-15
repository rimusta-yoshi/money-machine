import type { ProviderId } from './providers'

/**
 * Each domain company's own steps, short and in their words, for adding our record. The page
 * shows only the customer's company (found from their nameservers), or the general steps.
 * In the text: {host} is www (or their subdomain's part), {hostname} www.example.co.uk,
 * {domain} example.co.uk. The record itself (with copy buttons) goes where `record` is set.
 */

export interface GuideStep {
  text: string
  /** Show the record to add (type, name, value, with copy buttons) under this step. */
  record?: boolean
}

export interface ProviderGuide {
  /** Where they sign in. */
  signIn: string
  steps: GuideStep[]
  /** Pointing the bare domain at www: their name for it and where it is. */
  forwarding: string
}

const RECORD = 'Add a new record with these details, then save. If there’s already a record called {host}, edit that one instead (there can only be one).'

export const PROVIDER_GUIDES: Record<ProviderId, ProviderGuide> = {
  godaddy: {
    signIn: 'https://sso.godaddy.com/',
    steps: [
      { text: 'Sign in to GoDaddy and open **My Products**. Next to {domain}, choose **DNS**.' },
      { text: 'Under **DNS Records**, look for a record named **{host}**. If there is one, select the pencil to edit it. If not, select **Add New Record**.' },
      { text: 'Fill it in like this and select **Save**:', record: true },
    ],
    forwarding: 'In GoDaddy, open {domain} and go to **Forwarding**. Select **Add Forwarding**, choose **https://** and type {hostname}, pick **Permanent (301)** and save.',
  },
  ionos: {
    signIn: 'https://login.ionos.co.uk/',
    steps: [
      { text: 'Log in to IONOS and open **Domains & SSL**. Select the cog next to {domain}, then **DNS**.' },
      { text: 'Select **Add record**, then **CNAME**.' },
      { text: 'Fill it in like this and select **Save**. If IONOS says a {host} record already exists, let it replace it:', record: true },
    ],
    forwarding: 'In IONOS, select the cog next to {domain}, then **Redirect domain** (or **Forward**). Choose an HTTP redirect to https://{hostname}, type **301**, and save.',
  },
  '123-reg': {
    signIn: 'https://www.123-reg.co.uk/secure/',
    steps: [
      { text: 'Log in to 123-reg, choose **Manage** next to {domain}, then **Manage DNS** (sometimes called **DNS settings**).' },
      { text: 'Open the **Advanced DNS** tab. If there’s a row for **{host}**, delete it first.' },
      { text: 'Add a new row like this and select **Add**:', record: true },
    ],
    forwarding: 'In 123-reg, open {domain} and choose **Web forwarding**. Forward it to https://{hostname} and save.',
  },
  fasthosts: {
    signIn: 'https://login.fasthosts.co.uk/',
    steps: [
      { text: 'Log in to Fasthosts and go to **Domains**. Select {domain}, then **DNS settings**.' },
      { text: 'Choose **Advanced DNS** (or **Add record**). If there’s already a record for **{host}**, edit it instead.' },
      { text: 'Fill it in like this and save:', record: true },
    ],
    forwarding: 'In Fasthosts, open {domain} and choose **Web forwarding**. Forward it to https://{hostname} and save.',
  },
  namecheap: {
    signIn: 'https://www.namecheap.com/myaccount/login/',
    steps: [
      { text: 'Sign in to Namecheap, open **Domain List** and select **Manage** next to {domain}.' },
      { text: 'Open the **Advanced DNS** tab. Delete any existing **{host}** record (often a parking page), then select **Add New Record**.' },
      { text: 'Choose **CNAME Record**, fill it in like this and select the tick to save:', record: true },
    ],
    forwarding: 'On the same **Advanced DNS** page, add a **URL Redirect Record**: host **@**, value https://{hostname}, **Permanent (301)**, and save.',
  },
  cloudflare: {
    signIn: 'https://dash.cloudflare.com/',
    steps: [
      { text: 'Log in to Cloudflare and select {domain}. Go to **DNS**, then **Records**.' },
      { text: 'If there are records named **{host}** or **{domain}** (shown as @), delete or edit them. Select **Add record** for each record below.' },
      { text: 'Fill them in like this, with **Proxy status** set to **DNS only** (grey cloud), and save:', record: true },
    ],
    forwarding: 'Nothing to do: with Cloudflare, {domain} itself is connected too and goes to {hostname}.',
  },
  squarespace: {
    signIn: 'https://account.squarespace.com/domains',
    steps: [
      { text: 'Log in to Squarespace Domains and select {domain}. Open **DNS**, then **DNS Settings**.' },
      { text: 'Under **Custom records**, select **Add record**. If a **{host}** record is already there, delete it first.' },
      { text: 'Fill it in like this and select **Save**:', record: true },
    ],
    forwarding: 'In Squarespace Domains, open {domain} and choose **Domain forwarding**. Forward it to https://{hostname} with a permanent (301) redirect, and save.',
  },
}

/** For any other company. */
export const GENERAL_GUIDE: ProviderGuide = {
  signIn: '',
  steps: [
    { text: 'Log in where you bought {domain} and find its **DNS settings**. They may be called DNS management, Zone file or Advanced DNS.' },
    { text: RECORD },
    { text: 'The record:', record: true },
  ],
  forwarding: 'Look for **Forwarding** or **Redirect** in your domain company’s settings for {domain}, and send it to https://{hostname} as a permanent (301) redirect.',
}

/** Fills {host}, {hostname} and {domain} in a step. */
export const fillStep = (text: string, d: { host: string; hostname: string; domain: string }): string =>
  text.replace(/\{(host|hostname|domain)\}/g, (_, k: 'host' | 'hostname' | 'domain') => d[k])
