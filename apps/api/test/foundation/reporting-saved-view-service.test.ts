import { describe, expect, it } from "vitest";

import type { SavedView } from "@sentropic/openerp-domain/reporting";
import type { Queryable } from "../../src/db/client";
import {
  SavedViewForbiddenError,
  SavedViewNotFoundError,
  createSavedView,
  deleteSavedView,
  listSavedViews,
  updateSavedView
} from "../../src/reporting/saved-view-service";

interface AuditRow {
  organizationId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeSummary: unknown;
  afterSummary: unknown;
}

function makeFakeDb() {
  const views: SavedView[] = [];
  const audits: AuditRow[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into saved_views")) {
        const [
          organizationId,
          ownerUserId,
          resourceType,
          name,
          filters,
          columns,
          sortBy,
          isShared
        ] = values as [string, string | null, string, string, string, string, string | null, boolean];
        const row: SavedView = {
          id: `sv_${views.length + 1}`,
          organizationId,
          ownerUserId,
          resourceType,
          name,
          filters: JSON.parse(filters as string) as Record<string, unknown>,
          columns: JSON.parse(columns as string) as string[],
          sortBy,
          isShared,
          createdAt: "2026-05-29T08:00:00.000Z",
          updatedAt: "2026-05-29T08:00:00.000Z"
        };
        views.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from saved_views") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = views.find(
          (v) =>
            v.id === id &&
            v.organizationId === organizationId &&
            !(v as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from saved_views") && t.includes("order by name")) {
        const [organizationId, filterResourceType, _filterOwnerUserId, _filterShared, limit, offset] = values as [
          string,
          string | null,
          string | null,
          boolean | null,
          number,
          number
        ];
        const filtered = views
          .filter((v) => v.organizationId === organizationId)
          .filter((v) => !(v as unknown as { _deleted?: boolean })._deleted)
          .filter((v) => (filterResourceType ? v.resourceType === filterResourceType : true))
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update saved_views") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = views.findIndex(
          (v) =>
            v.id === id &&
            v.organizationId === organizationId &&
            !(v as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (views[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: views[idx]!.id } as unknown as T] };
      }

      if (t.includes("update saved_views")) {
        const [id, organizationId] = values as [string, string];
        const idx = views.findIndex(
          (v) =>
            v.id === id &&
            v.organizationId === organizationId &&
            !(v as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<SavedView> = {};
        if (t.includes("name = $")) {
          const candidate = trailing.find((v) => typeof v === "string" && !v.startsWith("{") && !v.startsWith("["));
          if (candidate) patch.name = candidate as string;
        }
        if (t.includes("is_shared = $")) {
          const candidate = trailing.find((v) => typeof v === "boolean");
          if (candidate !== undefined) patch.isShared = candidate as boolean;
        }
        views[idx] = { ...views[idx]!, ...patch, updatedAt: "2026-05-29T08:05:00.000Z" };
        return { rows: [views[idx]! as unknown as T] };
      }

      if (t.includes("insert into audit_events")) {
        // audit-emit positional shape (see audit-emit.ts).
        const [
          organizationId,
          actorUserId,
          _actorType,
          action,
          resourceType,
          resourceId,
          beforeSummary,
          afterSummary
        ] = values as [string, string, string, string, string, string, unknown, unknown];
        void _actorType;
        audits.push({
          organizationId,
          actorUserId,
          action,
          resourceType,
          resourceId,
          beforeSummary,
          afterSummary
        });
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db, views, audits };
}

const context = { organizationId: "org_1", actorUserId: "user_actor" };
const contextB = { organizationId: "org_1", actorUserId: "user_other" };

describe("SavedViewService (Reporting Demo Slice 5.0)", () => {
  it("creates a saved view and emits reporting.saved_view.created", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createSavedView(db, context, {
      resourceType: "crm.opportunity",
      name: "Open opportunities"
    });
    expect(created.name).toBe("Open opportunities");
    expect(created.resourceType).toBe("crm.opportunity");
    expect(created.isShared).toBe(false);
    expect(audits).toHaveLength(1);
    expect(audits[0]!.action).toBe("reporting.saved_view.created");
    expect(audits[0]!.resourceId).toBe(created.id);
    expect(audits[0]!.afterSummary).toMatchObject({
      name: "Open opportunities",
      resourceType: "crm.opportunity"
    });
  });

  it("updates a saved view and emits reporting.saved_view.updated with before/after", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createSavedView(db, context, {
      resourceType: "crm.opportunity",
      name: "Open opportunities"
    });
    const updated = await updateSavedView(db, context, created.id, {
      name: "All opportunities",
      isShared: true
    });
    expect(updated.name).toBe("All opportunities");
    const updateAudit = audits.find((a) => a.action === "reporting.saved_view.updated");
    expect(updateAudit).toBeDefined();
    expect(updateAudit!.beforeSummary).toMatchObject({ name: "Open opportunities" });
    expect(updateAudit!.afterSummary).toMatchObject({ name: "All opportunities" });
  });

  it("throws SavedViewNotFoundError on missing id (update)", async () => {
    const { db } = makeFakeDb();
    await expect(
      updateSavedView(db, context, "sv_nope", { name: "X" })
    ).rejects.toBeInstanceOf(SavedViewNotFoundError);
  });

  it("lists saved views ordered by name with resourceType filter", async () => {
    const { db } = makeFakeDb();
    await createSavedView(db, context, { resourceType: "crm.opportunity", name: "Bravo" });
    await createSavedView(db, context, { resourceType: "crm.opportunity", name: "Alpha" });
    await createSavedView(db, context, { resourceType: "billing.invoice", name: "Invoices" });

    const all = await listSavedViews(db, context);
    expect(all).toHaveLength(3);
    expect(all.map((v) => v.name)).toEqual(["Alpha", "Bravo", "Invoices"]);

    const filtered = await listSavedViews(db, context, { resourceType: "crm.opportunity" });
    expect(filtered).toHaveLength(2);
    expect(filtered.map((v) => v.name)).toEqual(["Alpha", "Bravo"]);
  });

  it("soft-deletes a saved view: emits reporting.saved_view.deleted and hides it from default reads", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createSavedView(db, context, {
      resourceType: "crm.opportunity",
      name: "ToDelete"
    });

    await deleteSavedView(db, context, created.id);

    const deleteAudit = audits.find((a) => a.action === "reporting.saved_view.deleted");
    expect(deleteAudit).toBeDefined();
    expect(deleteAudit!.resourceId).toBe(created.id);
    expect(deleteAudit!.beforeSummary).toMatchObject({ name: "ToDelete" });

    const list = await listSavedViews(db, context);
    expect(list.find((v) => v.id === created.id)).toBeUndefined();
  });

  it("throws SavedViewNotFoundError when deleting a non-existent saved view", async () => {
    const { db } = makeFakeDb();
    await expect(deleteSavedView(db, context, "sv_nope")).rejects.toBeInstanceOf(
      SavedViewNotFoundError
    );
  });

  it("ownership enforcement: shared SavedView non-owner update throws SavedViewForbiddenError", async () => {
    const { db } = makeFakeDb();
    // Create a shared view owned by user_actor
    const created = await createSavedView(db, context, {
      resourceType: "crm.opportunity",
      name: "Shared view",
      isShared: true,
      ownerUserId: "user_actor"
    });
    // user_other tries to update
    await expect(
      updateSavedView(db, contextB, created.id, { name: "Hacked" })
    ).rejects.toBeInstanceOf(SavedViewForbiddenError);
  });

  it("ownership enforcement: shared SavedView non-owner delete throws SavedViewForbiddenError", async () => {
    const { db } = makeFakeDb();
    const created = await createSavedView(db, context, {
      resourceType: "crm.opportunity",
      name: "Shared delete test",
      isShared: true,
      ownerUserId: "user_actor"
    });
    await expect(
      deleteSavedView(db, contextB, created.id)
    ).rejects.toBeInstanceOf(SavedViewForbiddenError);
  });
});
