import { z } from "zod";
import { v4 } from "uuid";

import { db, type DBTransaction } from "~/db";

type TransactionCategoryFilters = {
  excludeBreakdownIgnoredCategories?: boolean;
};

const MAX_COLOR_CODE = 11;
const INPUT_SCHEMA = z.object({
  name: z.string().trim().nonempty(),
  predicates: z.array(z.string()),
  colorCode: z.coerce.number().min(0).max(MAX_COLOR_CODE),
  ignoredForBreakdownReporting: z.preprocess((val) => val === "on" || val, z.boolean()).optional(),
});
const DEFAULT_SELECT = [
  "id",
  "name",
  "color_code as colorCode",
  "ignored_for_breakdown_reporting as ignoredForBreakdownReporting",
] as const;
const UNCATEGORIZED_CATEGORY = {
  id: "uncategorized",
  name: "Uncategorized",
  colorCode: -1,
  ignoredForBreakdownReporting: false,
};

function uniq(input: string[]): string[] {
  return Array.from(new Set(input));
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
  filter?: TransactionCategoryFilters,
) {
  const links = transactionIds.length
    ? await db
        .selectFrom("categories_transactions")
        .selectAll()
        .where("transaction_id", "in", uniq(transactionIds))
        .execute()
    : [];
  const categories = links.length
    ? await db
        .selectFrom("categories")
        .select(DEFAULT_SELECT)
        .where("id", "in", uniq(links.map((r) => r.category_id)))
        .execute()
    : [];

  const excludeBreakdownCategories = Boolean(filter?.excludeBreakdownIgnoredCategories);
  const result: Record<string, typeof categories> = {};
  for (const id of transactionIds) {
    const catsForId = links.flatMap((link) => {
      if (link.transaction_id !== id) {
        return [];
      }
      const found = categories.find((category) => category.id === link.category_id)!;
      return excludeBreakdownCategories && found.ignoredForBreakdownReporting ? [] : [found];
    });
    result[id] = catsForId.length ? catsForId : [UNCATEGORIZED_CATEGORY];
  }
  return result;
}

export async function allCategoriesByName(filter?: {
  includeUncategorized?: boolean;
  excludeIgnoredForBreakdown?: boolean;
}) {
  let query = db.selectFrom("categories").select(DEFAULT_SELECT).orderBy("name");
  if (filter?.excludeIgnoredForBreakdown) {
    query = query.where("ignored_for_breakdown_reporting", "=", false);
  }
  const results = await query.execute();
  return filter?.includeUncategorized ? results.concat(UNCATEGORIZED_CATEGORY) : results;
}

export async function allCategoriesWithCounts() {
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
  await db.deleteFrom("categories").where("id", "=", categoryId).executeTakeFirstOrThrow();
  return categoryId;
}

export async function editCategory(categoryId: string, inputs: Record<string, unknown>) {
  const now = new Date();
  const category = INPUT_SCHEMA.parse(inputs);
  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("categories")
      .set({
        name: category.name,
        color_code: category.colorCode,
        ignored_for_breakdown_reporting: Boolean(category.ignoredForBreakdownReporting),
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
        ignored_for_breakdown_reporting: Boolean(category.ignoredForBreakdownReporting),
        inserted_at: now,
        updated_at: now,
      })
      .executeTakeFirstOrThrow();
    await addPredicates(trx, categoryId, category.predicates);
  });
  return categoryId;
}
