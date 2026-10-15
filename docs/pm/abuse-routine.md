# Abuse reports: what to do

Reports arrive at abuse@localblocks.co.uk (your Gmail notifies you for abuse@ only). Cloudflare may also forward reports about our sites (Cloudflare dashboard → Manage account → Abuse reports). Aim to look within 24 hours; anything that looks like phishing or fraud, as soon as you see it.

## 1. Check
- Open the site the report is about. Note the address (`name.localblocks.co.uk` or the customer's own domain) and take a screenshot.
- Find the site: `npm run test-sites` lists sites before launch; after launch, use the admin dashboard (or ask Claude to look it up by address).
- Decide:
  - **Clearly harmful** (phishing, fake bank/login pages, scams, malware, illegal content, someone impersonating another business): take it down now, then tell the owner.
  - **Disputed** (copyright photo, a complaint about wording, a review the business disagrees with): don't take down yet; email the owner asking them to fix it within 7 days, then decide.
  - **Not ours or not a problem:** reply politely and close.

## 2. Take down
- **Today (until the admin takedown tool exists):** refund the payment in the Stripe dashboard (Payments → the payment → Refund). A refund takes the site down at once and disconnects any own domain. Our terms allow ending the service for breaches; the refund keeps it simple and fair.
- **Planned:** an admin "take down" action that pauses a site without refunding (for fraud, where a refund could be abused) and can restore it. See the build list.

## 3. Reply
To the reporter:
> Thanks for letting us know. We've looked at the site and [taken it down / asked the owner to fix it / found it doesn't break our terms]. Local Blocks

To the site owner (take-down):
> Your site at [address] has been taken down because it breaks our terms ([one line on why]). [Your payment has been refunded.] If you think this is a mistake, reply to this email. Local Blocks

## 4. Keep a note
One line per report in a simple log (date, address, what it was, what you did). If anyone reports a crime or the police ask, keep the screenshot and the log, and don't delete the site's records until it's resolved.

## Help
- The banned-word check (mobile builder work) flags suspicious sites on the dashboard before anyone reports them.
- Unsure whether something is illegal: take it down if it could hurt people, and ask for advice afterwards (Ideas Factory, or a solicitor).
