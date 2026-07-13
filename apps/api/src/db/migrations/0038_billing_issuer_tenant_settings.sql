-- Billing issuer statutory identity (D4 — additive/reversible).
-- Existing tenant settings rows retain NULL for all new fields.

alter table tenant_settings
  add column gst_registration_number text,
  add column qst_registration_number text,
  add column issuer_address jsonb;
