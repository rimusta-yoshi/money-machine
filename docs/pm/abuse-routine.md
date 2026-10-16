# Abuse reports: what to do

Reports arrive at abuse@localblocks.co.uk (your Gmail notifies you for abuse@ only). Cloudflare may also forward reports about our sites (Cloudflare dashboard → Manage account → Abuse reports). Aim to look within 24 hours; anything that looks like phishing or fraud, as soon as you see it.

## 1. Check
- Open the site the report is about. Note the address (`name.localblocks.co.uk` or the customer's own domain) and take a screenshot.
- Find the site: on the admin dashboard, type its address into **Find a site** (the `name.localblocks.co.uk` address, or their own domain). Or from the command line: `npm run site -- show <address>`. It shows the owner's email, whether it's paid, and any earlier take-downs.
- Decide:
  - **Clearly harmful** (phishing, fake bank/login pages, scams, malware, illegal content, someone impersonating another business): take it down now, then tell the owner.
  - **Disputed** (copyright photo, a complaint about wording, a review the business disagrees with): don't take down yet; email the owner asking them to fix it within 7 days, then decide.
  - **Not ours or not a problem:** reply politely and close.

## 2. Take down
- **On the dashboard:** find the site (Find a site, or its row in Sites to review), press **Take down**, write one line on why ("Phishing: copies a bank's login page"), then **Yes, take it down**. Or from the command line: `npm run site -- takedown <address> "<why>"`.
- What happens, within a minute or two:
  - every page of its address and its own domain says "This site isn't available";
  - its own domain is paused, kept to put back;
  - the owner's edit link says the site has been taken down and to email hello@; they can't change, publish, download or refund it;
  - nothing is deleted, no refund is made, and **no email is sent**: write to the owner yourself (step 3);
  - one exception: if they were mid-checkout and the payment lands after the take-down, it's refunded automatically and they get a short "your payment has been refunded, this site can't be published" email (no reason given). Restoring such a site brings it back unpaid.
- The reason, who did it and when are kept on the site's record (Find a site shows them).
- **Made a mistake, or they fixed it?** Press **Restore** (or `npm run site -- restore <address>`). The site comes back exactly as it was; its own domain comes back once Cloudflare has checked it again (a few minutes).
- **Refund as well?** Only if it's right to (say, a genuine customer whose site broke our terms by mistake): refund in the Stripe dashboard (Payments → the payment → Refund). Their own refund link stays blocked while the site is down, so this is the only way. A refunded site stays down for good, even if you press Restore; so does one whose payment dispute was lost.

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
