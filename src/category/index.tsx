"use server";
import type { SelectQueryBuilder } from "kysely";
import type { CategoryKind } from "kysely-codegen";
import { v4 } from "uuid";
import * as z from "zod";

import { db, type KBFDatabase, type DBTransaction } from "~/db";
import { checkSession } from "~/session";

export type CategoryFilter = {
  includeKinds?: CategoryKind[];
  excludeArchived?: boolean;
};

const MAX_COLOR_CODE = 11;
const INPUT_SCHEMA = z.object({
  name: z.string().trim().min(1),
  predicates: z.array(z.string()),
  colorCode: z.coerce.number().min(0).max(MAX_COLOR_CODE),
  kind: z.enum(["basic", "payment"]),
  archived: z.preprocess((val) => val === "on" || val, z.boolean()).optional(),
});
const DEFAULT_SELECT = ["id", "name", "archived", "kind", "color_code as colorCode"] as const;
const UNCATEGORIZED_CATEGORY = {
  id: "uncategorized",
  name: "Uncategorized",
  colorCode: -1,
  archived: false,
  kind: "basic" as const,
};

function uniq<T>(input: T[]): T[] {
  return Array.from(new Set(input));
}

function byName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name);
}

function addFilters<Cols>(
  query: SelectQueryBuilder<KBFDatabase, "categories", Cols>,
  filter: CategoryFilter | undefined,
) {
  if (filter?.includeKinds?.length) {
    query = query.where("kind", "in", uniq(filter.includeKinds));
  }
  if (filter?.excludeArchived) {
    query = query.where("archived", "=", false);
  }
  return query;
}

async function addPredicates(trx: DBTransaction, categoryId: string, predicates: string[]) {
  if (predicates.length) {
    const rules = predicates.map((predicate) => ({
      id: v4(),
      predicate,
      category_id: categoryId,
    }));
    await trx.insertInto("mass_import_rules").values(rules).execute();
  }
}

async function predicatesByCategory(): Promise<Record<string, undefined | string[]>> {
  const rules = await db
    .selectFrom("mass_import_rules")
    .select(["predicate", "category_id"])
    .execute();
  const result: Record<string, undefined | string[]> = {};
  for (const rule of rules) {
    const cur = (result[rule.category_id] ||= []);
    cur.push(rule.predicate);
  }
  return result;
}

async function countsOfTransactions() {
  const countItems = await db
    .selectFrom("categories_transactions")
    .select((builder) => [
      "category_id as categoryId",
      builder.fn.count<number>("transaction_id").as("count"),
    ])
    .groupBy("category_id")
    .execute();
  return Object.fromEntries(countItems.map((item) => [item.categoryId, item.count]));
}

export async function categoriesForTransactionIds(
  transactionIds: string[],
  filter?: CategoryFilter,
) {
  await checkSession();
  const links = transactionIds.length
    ? await db
        .selectFrom("categories_transactions")
        .selectAll()
        .where("transaction_id", "in", uniq(transactionIds))
        .execute()
    : [];

  const categoriesQuery = links.length
    ? addFilters(
        db
          .selectFrom("categories")
          .select(DEFAULT_SELECT)
          .where("id", "in", uniq(links.map((r) => r.category_id))),
        filter,
      )
    : undefined;
  const categories = categoriesQuery ? await categoriesQuery.execute() : [];

  const result: Record<string, typeof categories> = {};
  for (const transactionId of transactionIds) {
    const catsForId = links.flatMap((link) => {
      if (link.transaction_id !== transactionId) {
        return [];
      }
      const found = categories.find((category) => category.id === link.category_id);
      return found ? [found] : [];
    });
    result[transactionId] = catsForId.length
      ? catsForId.toSorted(byName)
      : [UNCATEGORIZED_CATEGORY];
  }
  return result;
}

export async function allCategoriesByName(
  filter?: { includeUncategorized?: boolean } & CategoryFilter,
) {
  await checkSession();
  const results = await addFilters(
    db.selectFrom("categories").select(DEFAULT_SELECT).orderBy("name"),
    filter,
  ).execute();
  return filter?.includeUncategorized ? results.concat(UNCATEGORIZED_CATEGORY) : results;
}

export async function allCategoriesWithCounts() {
  await checkSession();
  const [categories, counts, predicates] = await Promise.all([
    allCategoriesByName(),
    countsOfTransactions(),
    predicatesByCategory(),
  ]);
  return categories.map((category) => ({
    ...category,
    transactionCount: counts[category.id] || 0,
    predicates: predicates[category.id] || [],
  }));
}

export async function deleteCategory(categoryId: string) {
  await checkSession();
  await db.deleteFrom("categories").where("id", "=", categoryId).executeTakeFirstOrThrow();
}

export async function editCategory(categoryId: string, inputs: Record<string, unknown>) {
  await checkSession();
  const now = new Date();
  const category = INPUT_SCHEMA.parse(inputs);
  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("categories")
      .set({
        name: category.name,
        color_code: category.colorCode,
        archived: Boolean(category.archived),
        kind: category.kind,
        updated_at: now,
      })
      .where("id", "=", categoryId)
      .executeTakeFirstOrThrow();
    await trx.deleteFrom("mass_import_rules").where("category_id", "=", categoryId).execute();
    await addPredicates(trx, categoryId, category.predicates);
  });
  return categoryId;
}

export async function addCategory(inputs: Record<string, unknown>) {
  await checkSession();
  const now = new Date();
  const categoryId = v4();
  const category = INPUT_SCHEMA.parse(inputs);
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("categories")
      .values({
        id: categoryId,
        name: category.name,
        color_code: category.colorCode,
        archived: Boolean(category.archived),
        kind: category.kind,
        inserted_at: now,
        updated_at: now,
      })
      .executeTakeFirstOrThrow();
    await addPredicates(trx, categoryId, category.predicates);
  });
  return categoryId;
}
