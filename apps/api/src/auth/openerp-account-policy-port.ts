import type {
  AuthHonoAccountPolicyDecision,
  AuthHonoAccountPolicyPort,
  AuthHonoAccountStatus,
  AuthHonoUserRecord,
} from "@sentropic/auth-hono";

// AuthHonoAccountPolicyPort for OpenERP.
// Normalizes email, derives display names, assigns roles, and gates auth by status.

export function createOpenERPAccountPolicyPort(): AuthHonoAccountPolicyPort {
  return {
    normalizeEmail(email: string): string {
      return email.trim().toLowerCase();
    },

    deriveDisplayName(email: string): string {
      const local = email.split("@")[0] ?? email;
      // Capitalize first letter of each word separated by . or _
      return local
        .replace(/[._]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
    },

    roleForNewUser(_input: { email: string; isFirstUser: boolean }): string {
      return "user";
    },

    statusForNewUser(_input: {
      email: string;
      isFirstUser: boolean;
      now: Date;
    }): { accountStatus: AuthHonoAccountStatus; approvalDueAt: Date | null } {
      // v1: all new users immediately active (IdP-verified OIDC RP model).
      return { accountStatus: "active", approvalDueAt: null };
    },

    canAuthenticate(
      user: AuthHonoUserRecord,
      _now: Date
    ): AuthHonoAccountPolicyDecision {
      if (user.accountStatus === "active") {
        return { allowed: true };
      }
      const status =
        user.accountStatus === "disabled_by_admin"
          ? 403
          : user.accountStatus === "disabled_by_user"
          ? 403
          : 403;
      return {
        allowed: false,
        status,
        code: "account_not_active",
        message: `Account status '${user.accountStatus}' does not permit authentication.`,
      };
    },

    resolveSessionRole(user: AuthHonoUserRecord, _now: Date): string {
      return user.role;
    },
  };
}
