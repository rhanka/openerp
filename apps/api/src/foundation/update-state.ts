import type { SupportWindow } from "@sentropic/openerp-domain";

export function classifySupportWindow(monthsBehind: number): SupportWindow {
  if (monthsBehind < 12) return "under_12_months";
  if (monthsBehind <= 24) return "between_12_and_24_months";
  return "over_24_months";
}
