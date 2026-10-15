# One-click domains (Domain Connect)

Customers connect their own domain from **Use your own domain** (the edit link, or the go-live
step once paid). For most people that's one record to add at their domain company, and the page
shows that company's own steps. **Domain Connect** turns it into one click: the customer presses
**Connect automatically with GoDaddy**, signs in to GoDaddy, approves the change, and comes back to
us. GoDaddy adds the record for them.

It only works with a DNS provider once **they have approved our template**, which takes days to
weeks per provider. Until then nothing changes for customers: they get the step-by-step guide,
which always works. Each provider is switched on separately, so one approval doesn't wait for the
others.

## What's built

- **Our template**: [`server/domainconnect/localblocks.co.uk.website.json`](../server/domainconnect/localblocks.co.uk.website.json).
  One record: a `CNAME` from the host the customer connects (usually `www`) to
  `domains.localblocks.co.uk`, our Cloudflare for SaaS target. No variables, no TXT validation
  record: once the CNAME points at us, Cloudflare checks the domain and issues its certificate by
  itself (HTTP validation). `hostRequired` is on, so it's always applied to `www` (or a subdomain),
  never the bare domain. `syncPubKeyDomain` is `localblocks.co.uk`: every request is signed.
- **Discovery** (`server/core/domainConnect.ts`): when a customer types their domain we read the
  `_domainconnect` TXT record of that domain, fetch the provider's settings, and ask whether they
  take our template. If the provider is switched on (`DC_PROVIDERS`) and says yes, the page shows
  the big button. Anything failing along the way just means the guide.
- **Signing**: the apply link is signed with our private key (RS256), as the spec asks and as
  GoDaddy and Cloudflare require. The key's name (`key=_dck1`) and the signature (`sig=`) come
  last. The private key is the `DC_PRIVATE_KEY` secret; the public key is TXT records at
  `_dck1.localblocks.co.uk`.
- **Coming back**: the provider sends the customer to `https://localblocks.co.uk/build/?domain=back`
  (with `error=…` if they didn't approve). The page says so and checks the domain again straight
  away; the background check (every 15 minutes) and the "your domain is live" email do the rest.

## Settings

| Setting | Where | Meaning |
|---|---|---|
| `DC_PROVIDERS` | `server/wrangler.api.jsonc` | Providers switched on, comma-separated, lower case: their Domain Connect `providerId` (or `providerName`) as their settings give it, e.g. `godaddy,ionos`. Empty: off for everyone. |
| `DC_PRIVATE_KEY` | API secret | Signs the requests. Unset: off, whatever `DC_PROVIDERS` says. |
| `DC_KEY_HOST` | `server/wrangler.api.jsonc` | Where the public key lives under `localblocks.co.uk` (`_dck1`). |

To find a provider's id: in PowerShell, `Resolve-DnsName -Type TXT _domainconnect.<a domain they host>`
gives a host such as `domainconnect.api.godaddy.com`; open `https://<that host>/v2/<that domain>/settings`
in a browser and use its `providerId`.

## Your steps

### 1. Make the signing key (once)

From the project folder, with `$env:CLOUDFLARE_API_TOKEN` set as for deploying:

```bash
node scripts/domain-connect-key.mjs
```

It stores the private key as the API worker's `DC_PRIVATE_KEY` secret (it never appears on screen
or in a file) and prints two or three lines like `p=1,a=RS256,d=MIIBIjANBg…`.

Then Cloudflare → **localblocks.co.uk** → **DNS** → **Records**. For each printed line:
**Add record**, type **TXT**, name `_dck1`, content: the whole line, TTL Auto → **Save**.

Check: `Resolve-DnsName -Type TXT _dck1.localblocks.co.uk` lists them all.

If the key is ever lost or leaked, run the script again and replace the `_dck1` records with the
new ones (delete the old ones). Nothing else changes.

### 2. Submit the template (Templates repository)

1. Go to https://github.com/Domain-Connect/Templates and press **Fork**.
2. In your fork, **Add file → Upload files**: upload
   `server/domainconnect/localblocks.co.uk.website.json` exactly as it is (the file name must stay
   `localblocks.co.uk.website.json`).
3. The logo: the template points at `https://localblocks.co.uk/icon-512.png`, which is live
   already. Check it opens.
4. **Commit changes** on a new branch, then **Contribute → Open pull request**. Title:
   `Add localblocks.co.uk website template`. Description: the first paragraph of the emails below.
5. The repository runs its linter on the pull request; if it complains, send me the message.
   (Cloudflare asks that it pass with its `-cloudflare` option too.) Wait for it to be merged.

### 3. Email the providers

Send each one once the pull request is open (Cloudflare asks for it to be merged first). Send from
`hello@localblocks.co.uk`. Replace `<PR link>` with the pull request's address.

| Provider | Address | Covers |
|---|---|---|
| GoDaddy | domainconnect@godaddy.com | GoDaddy. Ask whether 123-reg (GoDaddy-owned) is covered too. |
| IONOS | domain_connect_admin@domain.ionos.com | IONOS. Ask whether Fasthosts (same group) is covered too. |
| Cloudflare | domain-connect@cloudflare.com | Customers whose DNS is on Cloudflare. |
| Squarespace | not listed on domainconnect.org | Ask through their partner or support channel whether they onboard Domain Connect templates. |

These addresses are from https://www.domainconnect.org/dns-providers/ (October 2026). 123-reg,
Fasthosts and Squarespace aren't listed there, so the PM's "IONOS family" assumption needs their
answer.

**GoDaddy and IONOS:**

> Subject: Domain Connect template onboarding: localblocks.co.uk (website)
>
> Hello,
>
> We're Local Blocks (https://localblocks.co.uk), a UK website builder for small local
> businesses: plumbers, cleaners, hairdressers and the like. Our customers pay once and their site
> is hosted with us. Many of them already own a domain with you and want their site on it, but
> aren't comfortable editing DNS records, so we'd like to offer one-click connecting with Domain
> Connect.
>
> Our template is in this pull request to the Domain-Connect/Templates repository: <PR link>
> It is synchronous only, adds one CNAME (the host the customer chooses, usually www, to
> domains.localblocks.co.uk), has no variables, and requires a host. Requests are signed:
> syncPubKeyDomain is localblocks.co.uk and the public key is at _dck1.localblocks.co.uk.
> The redirect after applying goes to https://localblocks.co.uk/build/ (syncRedirectDomain
> localblocks.co.uk).
>
> Could you onboard it, and let us know if you need anything else from us (a logo, a test
> account, a contact)? We'd also like to know whether your approval covers any other brands you
> run, such as <123-reg | Fasthosts>.
>
> Thank you,
> Rob
> Local Blocks, hello@localblocks.co.uk

**Cloudflare** (after the pull request is merged):

> Subject: Domain Connect template onboarding: localblocks.co.uk (website)
>
> Hello,
>
> We're Local Blocks (https://localblocks.co.uk), a UK website builder for small local
> businesses. Customers whose domains are on Cloudflare DNS would like to point them at the site
> they made with us in one click, so we'd like to onboard a Domain Connect template.
>
> - Template (merged): <PR link>, file localblocks.co.uk.website.json
> - syncPubKeyDomain TXT lookups: _dck1.localblocks.co.uk
> - Logo: https://localblocks.co.uk/icon-512.png (we can send an SVG if you prefer)
> - Default proxy status for the CNAME: DNS only (not proxied). Our target is itself on
>   Cloudflare for SaaS (custom hostnames on localblocks.co.uk).
> - We don't use APEXCNAME, REDIR301/302, TXT or SPF records.
>
> Please let us know if you need anything else.
>
> Thank you,
> Rob
> Local Blocks, hello@localblocks.co.uk

### 4. Switch a provider on

When a provider says the template is live with them:

1. Add their id to `DC_PROVIDERS` in `server/wrangler.api.jsonc` (comma-separated, lower case),
   for example `"DC_PROVIDERS": "godaddy"`.
2. Merge and deploy the API worker (`npm run cf:deploy`).
3. Try it on a test site with a domain at that provider: **Use your own domain** should show
   **Connect automatically with …**.

If something goes wrong with one provider, take it out of `DC_PROVIDERS` and redeploy: their
customers get the step-by-step guide again.

## Open points

- **Bare domains.** The template only sets `www` (or a subdomain). Customers still switch on
  forwarding from the bare domain themselves, and the page and email remind them. The spec has
  optional `REDIR301` records, which some providers support, so a second template could do the
  forwarding too; worth asking GoDaddy and IONOS once the first is approved.
- **Proxy status at Cloudflare.** We've asked for DNS only (grey cloud), which is what our
  step-by-step guide says too.
