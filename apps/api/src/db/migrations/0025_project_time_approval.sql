-- DS 3.5 TimeApproval: wire Project time submitted->approved over Foundation ApprovalRequest.
-- Additive ALTER only. Existing rows get NULL (no approval yet). No RLS change needed (inherits
-- from time_entries row-level policy). The FK is nullable so legacy direct-flip flows stay valid.

alter table time_entries
  add column approval_request_id uuid references approval_requests(id);
