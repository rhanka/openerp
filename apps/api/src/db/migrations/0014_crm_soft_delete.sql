-- DS 2.3: soft-delete support for CRM entities.
-- Per crm-customer-timeline spec line ~144: deleting a CRM record is a
-- soft-delete that hides it from default reads while preserving audit and
-- timeline history. This migration is purely additive — existing RLS
-- tenant policies still apply.

alter table companies     add column deleted_at timestamptz;
alter table contacts      add column deleted_at timestamptz;
alter table opportunities add column deleted_at timestamptz;
alter table leads         add column deleted_at timestamptz;

-- Partial indexes to keep default filtered reads fast.
create index companies_active_idx      on companies     (organization_id) where deleted_at is null;
create index contacts_active_idx       on contacts      (organization_id) where deleted_at is null;
create index opportunities_active_idx  on opportunities (organization_id) where deleted_at is null;
create index leads_active_idx          on leads         (organization_id) where deleted_at is null;
