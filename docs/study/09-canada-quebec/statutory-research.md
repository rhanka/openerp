# Canada And Quebec Statutory Research

## Progress

Fait: Initial official-source research completed for Canada/Quebec payroll deductions, Quebec source deductions, GST/QST, pay slips, wage registers, vacation, and statutory holidays.
À faire: Convert this research into module-level specs and test cases before any native payroll or statutory accounting implementation; overall study is about 99.5% complete.
Attendu: Keep native Quebec/Canada payroll out of MVP until official formulas, year-specific rates, remittance calendars, slips, and edge cases are specified as versioned rules.

## Source Scope

Checked on: 2026-05-08.

Official sources used:

| Authority | Source | Product Area |
| --- | --- | --- |
| Canada Revenue Agency | https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/remitting-source-deductions.html | Federal payroll remittance workflow. |
| Canada Revenue Agency | https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/remitting-source-deductions/how-when-remit-more-information.html | Federal payroll remitter types and AMWA thresholds. |
| Canada Revenue Agency | https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/calculating-deductions.html | Federal payroll deduction calculation entry point. |
| Canada Revenue Agency | https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/file-information-returns-slip-summaries.html | Federal payroll slips and summaries. |
| Canada Revenue Agency | https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/when-register-charge.html | GST/HST registration and small supplier rule. |
| Canada Revenue Agency | https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate.html | GST/HST charge, invoice, trust, and record rules. |
| Revenu Quebec | https://www.revenuquebec.ca/en/businesses/source-deductions-and-employer-contributions/calculating-source-deductions-and-contributions/ | Quebec source deductions and employer contributions. |
| Revenu Quebec | https://www.revenuquebec.ca/en/businesses/source-deductions-and-employer-contributions/remitting-source-deductions-and-employer-contributions/ | Quebec remittance obligations. |
| Revenu Quebec | https://www.revenuquebec.ca/en/businesses/source-deductions-and-employer-contributions/remitting-source-deductions-and-employer-contributions/frequency-of-remittances/ | Quebec remittance frequency and due dates. |
| Revenu Quebec | https://www.revenuquebec.ca/en/online-services/tools/webras/ | Quebec WebRAS and formula references. |
| Revenu Quebec | https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/ | Quebec GST/HST and QST obligations. |
| Revenu Quebec | https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/basic-rules-for-applying-the-gsthst-and-qst/types-of-supplies/taxable-supplies/ | GST/QST rates and taxable supply treatment. |
| Revenu Quebec | https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/reporting-gsthst-and-qst/ | GST/QST reporting, net tax, electronic filing. |
| CNESST | https://www.cnesst.gouv.qc.ca/en/working-conditions/wage-and-pay/pay/pay-slip | Quebec pay slip content. |
| CNESST | https://www.cnesst.gouv.qc.ca/en/definition/wage-register | Quebec wage register requirement. |
| CNESST | https://www.cnesst.gouv.qc.ca/en/working-conditions/leave/annual-vacation | Quebec annual vacation and vacation indemnity. |
| CNESST | https://www.cnesst.gouv.qc.ca/en/working-conditions/leave/statutory-holidays | Quebec statutory holidays and holiday indemnity. |

## Product Conclusion

Open source payroll references are not enough for Quebec/Canada compliance. They explain generic payroll structure, but the product needs official-source rule packs for:

- federal income tax, CPP, EI, payroll remittances, slips, and summaries;
- Quebec income tax, QPP, QPIP, health services fund, labour standards contribution, WSDRF where applicable, RL slips, and RL-1 summary;
- GST/HST and QST registration, collection, invoice disclosure, net tax, input tax credits/refunds, return filing, and remittance;
- CNESST labour standards that affect pay slips, wage registers, vacation, statutory holidays, and leave.

Therefore the MVP should support payroll-prep exports and integrations first. Native payroll can be added only after year-specific rule packs are written with acceptance tests.

## Federal Payroll Requirements

| Area | Requirement Seeds |
| --- | --- |
| Payroll account | Employer needs a CRA payroll program account before first remittance due date. |
| Deduction calculation | System must model federal income tax, CPP, EI, taxable benefits, special payments, province of employment, and corrections. |
| Remitter type | Federal remittance frequency depends on remitter type and average monthly withholding amount. Remitter type is separate from employee pay period. |
| Due-date handling | Product must calculate due dates by remitter type and support nil/final remittance workflows. |
| Remittance data | Product must preserve payroll account, payday dates, remitting period end date, gross payroll, employee count, remitter type, due date, and payment evidence. |
| Slips and summaries | T4/T4A-style annual return workflows must be modeled separately from periodic remittance. |
| Corrections | Under-remittance, over-remittance, and filing amendments need separate states and audit trails. |

## Quebec Payroll Requirements

| Area | Requirement Seeds |
| --- | --- |
| Quebec source deductions | Quebec payroll must calculate Quebec income tax, QPP, QPIP, and related employee deductions. |
| Employer contributions | Employer-side calculations must include employer QPP, employer QPIP, health services fund, contribution related to labour standards, WSDRF where applicable, and other applicable employer contributions. |
| QPP | QPP applies to eligible employees, has employee and employer sides, and stops when the annual pensionable earnings ceiling is reached. |
| WebRAS/formulas | Product must not hard-code informal examples. It needs versioned formulas aligned with Revenu Quebec WebRAS and formula publications. |
| Remittance frequency | Quebec remittance frequency and due dates must be modeled independently from federal remitter type. |
| Annual balancing | RL-1 summary, source deduction balances, health services fund actual contribution, labour standards contribution, and WSDRF timing must be handled as annual processes. |
| Electronic/payment thresholds | Payment and filing methods depend on Revenu Quebec rules, including electronic payment requirements for high remittance amounts. |

## GST/HST And QST Requirements

| Area | Requirement Seeds |
| --- | --- |
| Registration | System must track GST/HST and QST registration status, effective dates, and small supplier thresholds. |
| Taxability | Product/service catalog needs taxable, zero-rated, exempt, and place-of-supply classification. |
| Rates | Quebec taxable supplies generally require GST 5% and QST 9.975% unless exempt or zero-rated. Rates must be versioned, not hard-coded in business logic. |
| Invoice disclosure | Invoices must indicate whether GST/HST/QST applies, whether tax is included or added separately, and the applicable amount or rate where required. |
| Trust accounting | Collected tax is held for remittance; accounting must separate tax liability from revenue. |
| Net tax | Reporting must calculate collected or collectible tax and eligible input tax credits/refunds for each reporting period. |
| Filing | GST/QST registrants generally file each reporting period; Quebec GST/QST returns can be combined and electronic filing is required for most registrants from 2024 reporting periods onward. |
| Due dates | Filing frequency and remittance due dates are separate configuration and must be stored per registration. |

## CNESST Payroll And HR Requirements

| Area | Requirement Seeds |
| --- | --- |
| Pay slip | Each pay must produce a pay slip/statement of earnings with employer, worker, job, pay date, work period, hours, overtime, premiums/allowances/commissions, wage rate, gross wages, deductions, net wages, and tips where applicable. |
| Wage register | Employer must keep a wage register/registration system with required worker and pay-period details. |
| Pay frequency | Quebec labour standards constrain wage payment intervals; payroll design must support pay calendars and late/correction handling. |
| Vacation | Vacation entitlement and indemnity depend on reference year, uninterrupted service, and gross wages. Basic percentages include 4% and 6% depending on service length. |
| Statutory holidays | Quebec has 8 paid statutory holidays, with special handling for Quebec National Holiday and compensatory treatment when work is required. |
| Holiday indemnity | Statutory holiday indemnity uses wages from the 4 complete weeks of pay preceding the holiday week. |
| Leave | Leave types must be modeled as protected employment events where relevant; detailed paid/unpaid rules remain a separate spec. |

## MVP Boundary

Build in MVP:

- employee master data;
- time entries and approval;
- payroll-prep export fields;
- pay-period calendar primitives;
- project/time billing bridge;
- tax registration settings for GST/HST/QST;
- invoice tax disclosure fields;
- accounting tax liability accounts;
- audit trails for payroll-prep, invoice tax, and remittance-export actions.

Do not build in MVP:

- native federal/Quebec payroll calculation engine;
- native T4/RL slip e-filing;
- native remittance submission;
- CNESST contribution filing;
- full leave law engine;
- tax advice or statutory filing certification.

## Implementation Spec Backlog

1. `tax-registration` spec: GST/HST/QST accounts, effective dates, filing frequency, tax numbers, and small supplier state.
2. `tax-engine-minimal` spec: product tax category, place-of-supply hook, tax line calculation interface, and accounting postings.
3. `payroll-prep-export` spec: employee, pay period, gross pay, time, deductions placeholder, employer contribution placeholder, and audit export.
4. `pay-slip-data-model` spec: CNESST-required statement-of-earnings fields without native payroll calculation.
5. `wage-register` spec: Quebec wage register fields, retention, employee access/export, and audit.
6. `statutory-rule-pack` spec: versioned formula source, effective dates, official-source citation, tests, and migration policy.
7. `remittance-calendar` spec: federal and Quebec remittance frequencies, due dates, weekend/holiday adjustment, and payment evidence.
8. `slips-and-summaries` spec: T4/T4A/RL-1 data preparation, review states, corrections, and external filing handoff.

## Acceptance Criteria For Future Native Payroll

Native payroll cannot enter implementation until:

- official annual formula sources are captured for the target year;
- federal and Quebec rule packs have effective dates and expiry/review dates;
- test fixtures cover ordinary salary, hourly pay, overtime, taxable benefits, vacation pay, statutory holiday pay, QPP/QPIP/CPP/EI boundaries, year-to-date ceilings, remittance timing, and correction cases;
- payroll results can be reconciled against CRA PDOC where applicable and Revenu Quebec WebRAS/formulas for Quebec deductions;
- audit logs show inputs, rule-pack version, calculation steps, overrides, approvals, and generated exports;
- legal/accounting review approves the first supported payroll jurisdiction.

## Open Questions

- Which payroll provider integrations should be supported first for Quebec employers?
- Should the MVP include tax-line calculation only for Quebec, or a broader Canada place-of-supply abstraction from the start?
- What accounting export format is required by early pilots?
- Do first pilots need RL/T4 data prep, or is time/payroll-prep export enough?
- Which CNESST leave categories are needed before a full leave-law engine?
