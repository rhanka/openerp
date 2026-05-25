import { describe, expect, it } from "vitest";

import type { ProjectTask } from "@sentropic/openerp-domain/project";

import type { Queryable } from "../../src/db/client";
import {
  ProjectTaskNotFoundError,
  createProjectTask,
  deleteProjectTask,
  listProjectTasks,
  updateProjectTask
} from "../../src/project/project-task-service";

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
  const tasks: ProjectTask[] = [];
  const audits: AuditRow[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into project_tasks")) {
        const [
          organizationId,
          projectId,
          title,
          description,
          status,
          assigneeUserId,
          dueDate,
          parentTaskId
        ] = values as [
          string,
          string,
          string,
          string | null,
          string,
          string | null,
          string | null,
          string | null
        ];
        const row: ProjectTask = {
          id: `tk_${tasks.length + 1}`,
          organizationId,
          projectId,
          title,
          description,
          status: status as ProjectTask["status"],
          assigneeUserId,
          dueDate,
          completedAt: null,
          parentTaskId,
          createdAt: "2026-05-25T08:00:00.000Z",
          updatedAt: "2026-05-25T08:00:00.000Z"
        };
        tasks.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from project_tasks") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = tasks.find(
          (tk) =>
            tk.id === id &&
            tk.organizationId === organizationId &&
            !(tk as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from project_tasks") && t.includes("order by created_at desc")) {
        const [organizationId, projectIdFilter, statusFilter, limit, offset] = values as [
          string,
          string | null,
          string | null,
          number,
          number
        ];
        const filtered = tasks
          .filter((tk) => tk.organizationId === organizationId)
          .filter((tk) => !(tk as unknown as { _deleted?: boolean })._deleted)
          .filter((tk) => (projectIdFilter ? tk.projectId === projectIdFilter : true))
          .filter((tk) => (statusFilter ? tk.status === statusFilter : true))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update project_tasks") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = tasks.findIndex(
          (tk) =>
            tk.id === id &&
            tk.organizationId === organizationId &&
            !(tk as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (tasks[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: tasks[idx]!.id } as unknown as T] };
      }

      if (t.includes("update project_tasks")) {
        const [id, organizationId] = values as [string, string];
        const idx = tasks.findIndex((tk) => tk.id === id && tk.organizationId === organizationId);
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<ProjectTask> = {};
        if (t.includes("title = $")) {
          const titleVal = trailing.find((v) => typeof v === "string" && v.length > 0);
          if (titleVal !== undefined) patch.title = String(titleVal);
        }
        if (t.includes("status = $")) {
          const statusVal = trailing.find((v) =>
            ["todo", "in_progress", "blocked", "done", "cancelled"].includes(v as string)
          );
          if (statusVal !== undefined) patch.status = statusVal as ProjectTask["status"];
        }
        if (t.includes("completed_at = $")) {
          const completedAtVal = trailing.find((v) => typeof v === "string" && v.includes("T"));
          if (completedAtVal !== undefined) patch.completedAt = String(completedAtVal);
        }
        tasks[idx] = { ...tasks[idx]!, ...patch, updatedAt: "2026-05-25T08:05:00.000Z" };
        return { rows: [tasks[idx]! as unknown as T] };
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

      if (t.includes("insert into timeline_entries")) {
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db, tasks, audits };
}

const context = { organizationId: "org_1", actorUserId: "user_actor" };

describe("ProjectTaskService (DS 3.1)", () => {
  it("creates a task and emits project.task.created", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createProjectTask(db, context, {
      projectId: "proj_1",
      title: "Write unit tests"
    });
    expect(created.title).toBe("Write unit tests");
    expect(created.status).toBe("todo");
    expect(created.projectId).toBe("proj_1");
    const createAudit = audits.find((a) => a.action === "project.task.created");
    expect(createAudit).toBeDefined();
    expect(createAudit!.resourceType).toBe("project_task");
    expect(createAudit!.resourceId).toBe(created.id);
  });

  it("updates a task and emits project.task.updated with before/after", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createProjectTask(db, context, {
      projectId: "proj_1",
      title: "Draft spec"
    });
    const updated = await updateProjectTask(db, context, created.id, {
      title: "Draft spec v2",
      status: "in_progress"
    });
    expect(updated.title).toBe("Draft spec v2");
    expect(updated.status).toBe("in_progress");
    const updateAudit = audits.find((a) => a.action === "project.task.updated");
    expect(updateAudit).toBeDefined();
    expect(updateAudit!.beforeSummary).toMatchObject({ title: "Draft spec", status: "todo" });
    expect(updateAudit!.afterSummary).toMatchObject({ title: "Draft spec v2", status: "in_progress" });
    // No completed event since status != done
    expect(audits.find((a) => a.action === "project.task.completed")).toBeUndefined();
  });

  it("setting status to done emits both project.task.updated and project.task.completed", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createProjectTask(db, context, {
      projectId: "proj_1",
      title: "Implement feature"
    });
    const updated = await updateProjectTask(db, context, created.id, { status: "done" });
    expect(updated.status).toBe("done");
    expect(audits.filter((a) => a.action === "project.task.updated")).toHaveLength(1);
    const completedAudit = audits.find((a) => a.action === "project.task.completed");
    expect(completedAudit).toBeDefined();
    expect(completedAudit!.resourceType).toBe("project_task");
    expect(completedAudit!.resourceId).toBe(created.id);
  });

  it("throws ProjectTaskNotFoundError on missing id", async () => {
    const { db } = makeFakeDb();
    await expect(
      updateProjectTask(db, context, "tk_nope", { title: "X" })
    ).rejects.toBeInstanceOf(ProjectTaskNotFoundError);
  });

  it("lists tasks with projectId filter", async () => {
    const { db } = makeFakeDb();
    await createProjectTask(db, context, { projectId: "proj_1", title: "Task A" });
    await createProjectTask(db, context, { projectId: "proj_2", title: "Task B" });
    const all = await listProjectTasks(db, context);
    expect(all.length).toBe(2);
    const scoped = await listProjectTasks(db, context, { projectId: "proj_1" });
    expect(scoped.map((t) => t.title)).toEqual(["Task A"]);
  });

  it("soft-deletes a task: emits project.task.deleted and hides it from default reads", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createProjectTask(db, context, {
      projectId: "proj_1",
      title: "To be deleted"
    });
    await deleteProjectTask(db, context, created.id);
    const deleteAudit = audits.find((a) => a.action === "project.task.deleted");
    expect(deleteAudit).toBeDefined();
    expect(deleteAudit!.resourceId).toBe(created.id);
    expect(deleteAudit!.beforeSummary).toMatchObject({ title: "To be deleted" });
    const list = await listProjectTasks(db, context);
    expect(list.find((t) => t.id === created.id)).toBeUndefined();
  });

  it("throws ProjectTaskNotFoundError when deleting a non-existent task", async () => {
    const { db } = makeFakeDb();
    await expect(deleteProjectTask(db, context, "tk_nope")).rejects.toBeInstanceOf(
      ProjectTaskNotFoundError
    );
  });
});
