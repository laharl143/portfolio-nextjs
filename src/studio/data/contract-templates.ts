import "server-only";
import "@/studio/marker";
import { and, asc, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/studio/db/client";
import { contractTemplates } from "@/studio/db/schema";
import { DuplicateTemplateName, StaleRecord, TemplateNotFound, isUniqueViolation } from "./errors";
import { isUuid, isVersion, parseTemplateInput, type TemplateFormInput } from "./input";
import { getWorkspaceId } from "./workspace";

// Contract templates (spec 0007, AC-1). Archived templates count as not found; there is no delete.

export type ContractTemplate = typeof contractTemplates.$inferSelect;

export const TEMPLATE_PAGE_SIZE = 25;
const NAME_CONSTRAINT = "contract_templates_workspace_name_uq";

export type TemplateRow = { id: string; name: string; description: string | null; updatedAt: Date };
export type TemplateList = { rows: TemplateRow[]; total: number; page: number; pageSize: number };

export async function listTemplates(page: number): Promise<TemplateList> {
  const workspaceId = await getWorkspaceId();
  const where = and(eq(contractTemplates.workspaceId, workspaceId), isNull(contractTemplates.archivedAt));
  const db = getDb();
  const [rows, [counted]] = await Promise.all([
    db
      .select({
        id: contractTemplates.id,
        name: contractTemplates.name,
        description: contractTemplates.description,
        updatedAt: contractTemplates.updatedAt,
      })
      .from(contractTemplates)
      .where(where)
      .orderBy(desc(contractTemplates.updatedAt), asc(contractTemplates.id))
      .limit(TEMPLATE_PAGE_SIZE)
      .offset((page - 1) * TEMPLATE_PAGE_SIZE),
    db.select({ total: sql<number>`count(*)::int` }).from(contractTemplates).where(where),
  ]);
  return { rows, total: counted?.total ?? 0, page, pageSize: TEMPLATE_PAGE_SIZE };
}

// The new contract form's template picker.
export async function listLiveTemplateOptions(): Promise<{ id: string; name: string }[]> {
  const workspaceId = await getWorkspaceId();
  return getDb()
    .select({ id: contractTemplates.id, name: contractTemplates.name })
    .from(contractTemplates)
    .where(and(eq(contractTemplates.workspaceId, workspaceId), isNull(contractTemplates.archivedAt)))
    .orderBy(sql`lower(${contractTemplates.name})`, asc(contractTemplates.id));
}

export async function getTemplate(templateId: string) {
  if (!isUuid(templateId)) {
    throw new TemplateNotFound();
  }
  const workspaceId = await getWorkspaceId();
  const [template] = await getDb()
    .select({
      id: contractTemplates.id,
      name: contractTemplates.name,
      description: contractTemplates.description,
      body: contractTemplates.body,
      version: sql<string>`${contractTemplates.updatedAt}::text`,
    })
    .from(contractTemplates)
    .where(
      and(
        eq(contractTemplates.id, templateId),
        eq(contractTemplates.workspaceId, workspaceId),
        isNull(contractTemplates.archivedAt),
      ),
    );
  if (!template) {
    throw new TemplateNotFound();
  }
  return template;
}

// The live template's body, read inside the contract's create transaction (spec 0007, Value sourcing).
export async function readLiveTemplateBody(tx: Tx, templateId: string, workspaceId: string): Promise<string> {
  if (!isUuid(templateId)) {
    throw new TemplateNotFound();
  }
  const [template] = await tx
    .select({ body: contractTemplates.body })
    .from(contractTemplates)
    .where(
      and(
        eq(contractTemplates.id, templateId),
        eq(contractTemplates.workspaceId, workspaceId),
        isNull(contractTemplates.archivedAt),
      ),
    );
  if (!template) {
    throw new TemplateNotFound();
  }
  return template.body;
}

async function assertNameFree(tx: Tx, workspaceId: string, name: string, exceptId?: string) {
  const [taken] = await tx
    .select({ id: contractTemplates.id })
    .from(contractTemplates)
    .where(
      and(
        eq(contractTemplates.workspaceId, workspaceId),
        isNull(contractTemplates.archivedAt),
        sql`lower(${contractTemplates.name}) = lower(${name})`,
        exceptId ? ne(contractTemplates.id, exceptId) : undefined,
      ),
    )
    .limit(1);
  if (taken) {
    throw new DuplicateTemplateName();
  }
}

function translateNameRace(err: unknown): never {
  if (isUniqueViolation(err, NAME_CONSTRAINT)) {
    throw new DuplicateTemplateName();
  }
  throw err;
}

// `opts.id` is for the seed only, so its row keeps a fixed id.
export async function createTemplate(input: TemplateFormInput, opts: { id?: string } = {}): Promise<ContractTemplate> {
  const values = parseTemplateInput(input);
  const workspaceId = await getWorkspaceId();
  try {
    return await getDb().transaction(async (tx) => {
      await assertNameFree(tx, workspaceId, values.name);
      const [template] = await tx
        .insert(contractTemplates)
        .values({ ...(opts.id ? { id: opts.id } : {}), workspaceId, ...values })
        .returning();
      return template;
    });
  } catch (err) {
    translateNameRace(err);
  }
}

async function lockTemplate(tx: Tx, templateId: string, workspaceId: string) {
  if (!isUuid(templateId)) {
    throw new TemplateNotFound();
  }
  const [template] = await tx
    .select()
    .from(contractTemplates)
    .where(and(eq(contractTemplates.id, templateId), eq(contractTemplates.workspaceId, workspaceId)))
    .for("update");
  if (!template) {
    throw new TemplateNotFound();
  }
  return template;
}

export async function updateTemplate(
  templateId: string,
  version: string,
  input: TemplateFormInput,
): Promise<ContractTemplate> {
  const values = parseTemplateInput(input);
  const workspaceId = await getWorkspaceId();
  try {
    return await getDb().transaction(async (tx) => {
      const template = await lockTemplate(tx, templateId, workspaceId);
      if (template.archivedAt) {
        throw new TemplateNotFound();
      }
      if (!isVersion(version)) {
        throw new StaleRecord();
      }
      await assertNameFree(tx, workspaceId, values.name, template.id);
      const [updated] = await tx
        .update(contractTemplates)
        .set(values)
        .where(and(eq(contractTemplates.id, template.id), sql`${contractTemplates.updatedAt} = ${version}::timestamptz`))
        .returning();
      if (!updated) {
        throw new StaleRecord();
      }
      return updated;
    });
  } catch (err) {
    translateNameRace(err);
  }
}

// Never touches a contract: each contract holds its own copy of the body. A repeat archive returns the row unchanged.
export async function archiveTemplate(templateId: string): Promise<ContractTemplate> {
  const workspaceId = await getWorkspaceId();
  return getDb().transaction(async (tx) => {
    const template = await lockTemplate(tx, templateId, workspaceId);
    if (template.archivedAt) {
      return template;
    }
    const [archived] = await tx
      .update(contractTemplates)
      .set({ archivedAt: sql`now()` })
      .where(eq(contractTemplates.id, template.id))
      .returning();
    return archived;
  });
}
