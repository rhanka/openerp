-- Statutory invoice identity snapshots (D8 — additive/reversible).
-- Values remain NULL for existing rows and are frozen when a draft is issued.

alter table invoices
  add column issuer_snapshot jsonb,
  add column customer_snapshot jsonb;
