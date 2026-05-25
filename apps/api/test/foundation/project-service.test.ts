import { describe, expect, it } from "vitest";

import type { Project } from "@sentropic/openerp-domain/project";

import type { Queryable } from "../../src/db/client";
import {
  ProjectNotFoundError,
  createProject,
  deleteProject,
  listProjects,
  updateProject
} from "../../src/project/project-service";

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
  const projects: Project[] = [];
  const audits: AuditRow[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into projects")) {
        const [organizationId, name, description, code, companyId, ownerUserId, startDate, endDate] =
          values as [string, string, string | null, string | null, string | null, string | null, string | null, string | null];
        const row: Project = {
          id: `pr_${projects.length + 1}`,
          organizationId,
          name,
          description,
          status: "active",
          code,
          companyId,
          ownerUserId,
          startDate,
          endDate,
          createdAt: "2026-05-25T08:00:00.000Z",
          updatedAt: "2026-05-25T08:00:00.000Z"
        };
        projects.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from projects") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = projects.find(
          (p) =>
            p.id === id &&
            p.organizationId === organizationId &&
            !(p as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from projects") && t.includes("order by created_at")) {
        const [organizationId, status, limit, offset] = values as [string, string | null, number, number];
        const filtered = projects
          .filter((p) => p.organizationId === organizationId)
          .filter((p) => !(p as unknown as { _deleted?: boolean })._deleted)
          .filter((p) => (status ? p.status === status : true))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update projects") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = projects.findIndex(
          (p) =>
            p.id === id &&
            p.organizationId === organizationId &&
            !(p as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (projects[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: projects[idx]!.id } as unknown as T] };
      }

      if (t.includes("update projects")) {
        const [id, organizationId] = values as [string, string];
        const idx = projects.findIndex((p) => p.id === id && p.organizationId === organizationId);
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<Project> = {};
        if (t.includes("name = $")) {
          patch.name = trailing[0] as string;
        }
        if (t.includes("status = $")) {
          const candidate = trailing.find(
            (v) => v === "draft" || v === "active" || v === "on_hold" || v === "completed" || v === "cancelled"
          );
          if (candidate) patch.status = candidate as Project["status"];
        }
        projects[idx] = { ...projects[idx]!, ...patch, updatedAt: "2026-05-25T08:05:00.000Z" };
        return { rows: [projects[idx]! as unknown as T] };
      }

      if (t.includes("insert into audit_events")) {
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
        audits.push({ organizationId, actorUserId, action, resourceType, resourceId, beforeSummary, afterSummary });
        return { rows: [] };
      }

      if (t.includes("insert into timeline_entries")) {
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db, projects, audits };
}

const context = { organizationId: "org_1", actorUserId: "user_actor" };

describe("ProjectService (DS 3.0)", () => {
  it("creates a project and emits project.project.created", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createProject(db, context, { name: "Northwind Delivery" });
    expect(created.name).toBe("Northwind Delivery");
    expect(created.status).toBe("active");
    expect(audits).toHaveLength(1);
    expect(audits[0]!.action).toBe("project.project.created");
    expect(audits[0]!.resourceId).toBe(created.id);
    expect(audits[0]!.afterSummary).toMatchObject({ name: "Northwind Delivery", status: "active" });
  });

  it("updates a project and emits project.project.updated with before/after", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createProject(db, context, { name: "Northwind Delivery" });
    const updated = await updateProject(db, context, created.id, { name: "Northwind Delivery v2" });
    expect(updated.name).toBe("Northwind Delivery v2");
    const updateAudit = audits.find((a) => a.action === "project.project.updated");
    expect(updateAudit).toBeDefined();
    expect(updateAudit!.beforeSummary).toMatchObject({ name: "Northwind Delivery" });
    expect(updateAudit!.afterSummary).toMatchObject({ name: "Northwind Delivery v2" });
  });

  it("throws ProjectNotFoundError on missing id", async () => {
    const { db } = makeFakeDb();
    await expect(
      updateProject(db, context, "pr_nope", { name: "X" })
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it("lists projects with status filter", async () => {
    const { db } = makeFakeDb();
    await createProject(db, context, { name: "Alpha" });
    await createProject(db, context, { name: "Beta" });
    const list = await listProjects(db, context);
    expect(list).toHaveLength(2);

    const onHold = await listProjects(db, context, { status: "on_hold" });
    expect(onHold).toEqual([]);
  });

  it("soft-deletes a project: emits project.project.deleted and hides it from default reads", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createProject(db, context, { name: "ToDelete" });

    await deleteProject(db, context, created.id);

    const deleteAudit = audits.find((a) => a.action === "project.project.deleted");
    expect(deleteAudit).toBeDefined();
    expect(deleteAudit!.resourceId).toBe(created.id);
    expect(deleteAudit!.beforeSummary).toMatchObject({ name: "ToDelete" });

    const list = await listProjects(db, context);
    expect(list.find((p) => p.id === created.id)).toBeUndefined();
  });

  it("throws ProjectNotFoundError when deleting a non-existent project", async () => {
    const { db } = makeFakeDb();
    await expect(deleteProject(db, context, "pr_nope")).rejects.toBeInstanceOf(
      ProjectNotFoundError
    );
  });
});
