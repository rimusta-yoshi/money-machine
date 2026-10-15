-- Customers' own domains (Cloudflare for SaaS custom hostnames). One per site. Only adds a table.
-- No foreign key on purpose: a row whose site has gone is found by the cron, which removes the
-- hostname from Cloudflare first (so we never keep serving or paying for it), then the row.
CREATE TABLE custom_domains (
  ref TEXT PRIMARY KEY,                -- the site (drafts.ref)
  hostname TEXT NOT NULL UNIQUE,       -- what visitors use and we serve: www.example.co.uk
  domain TEXT NOT NULL,                -- the registered domain: example.co.uk
  apex TEXT UNIQUE,                    -- the bare domain, when it's connected too (redirects to hostname)
  cf_id TEXT,                          -- Cloudflare's custom hostname id for hostname
  cf_apex_id TEXT,                     -- and for apex
  status TEXT NOT NULL,                -- pending | active | paused (dispute open) | removing (Cloudflare still to delete)
  provider TEXT,                       -- the domain company, from its nameservers (godaddy, ionos…), if known
  dc_provider_id TEXT,                 -- one-click (Domain Connect): the DNS provider's id, when it offers our template
  dc_provider_name TEXT,               -- and its name
  dc_sync_url TEXT,                    -- and its urlSyncUX
  dns_seen TEXT,                       -- where the hostname pointed at the last check, if anywhere
  created_at INTEGER NOT NULL,         -- ms since epoch
  checked_at INTEGER,                  -- last asked Cloudflare
  active_at INTEGER,
  live_email_at INTEGER                -- the "your domain is live" email, sent once
);
CREATE INDEX custom_domains_status ON custom_domains (status, checked_at);
