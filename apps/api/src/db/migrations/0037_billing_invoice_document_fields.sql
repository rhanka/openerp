-- Invoice document fields (billing P1 — Wave parity, additive/reversible).
-- notes + po_number are free-text document fields; payment_terms_days drives the
-- due_date derivation at issue time (due_date = issue_date + payment_terms_days).
-- Additive ALTER: existing rows get NULL (no data loss, no behaviour change).
-- NOTE: issuer/customer identity snapshot and TPS/TVQ registration numbers are
-- deliberately NOT added here — they depend on open decisions D4/D8
-- (docs/studies/2026-07-11-wave-replacement-decisions.md).

alter table invoices
  add column notes text,
  add column po_number text,
  add column payment_terms_days integer check (payment_terms_days is null or payment_terms_days >= 0);
