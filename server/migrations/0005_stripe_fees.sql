-- Stripe's fee on each sale (pence), from the payment's balance transaction, for the dashboard's
-- net after fees. Null until known (Stripe can take a moment; the daily cron fills gaps).
ALTER TABLE drafts ADD COLUMN stripe_fee INTEGER;
