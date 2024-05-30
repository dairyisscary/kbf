import { z } from "zod";
import { v4 } from "uuid";

import { categoriesForTransactionIds } from "~/category";
import { db, type DBTransaction } from "~/db";

import { parse } from "./csv";
import { generateReportingData } from "./reporting";

type Categories = Awaited<ReturnType<typeof categoriesForTransactionIds>>[string];
type BaseFilters = {
  onOrBefore?: string | null;
  onOrAfter?: string | null;
  categoryIds?: string[];
};

const MASS_IMPORT_INPUT_SCHEMA = z.object({
  csv: z.string().trim().min(1),
  currency: z.enum(["euro", "usd"]),
  invertAmounts: z.preprocess((val) => val === "on" || val, z.boolean()).optional(),
  categoryIds: z.preprocess((val) => (val === undefined ? [] : val), z.array(z.string())),
});
const INPUT_SCHEMA = z.object({
  description: z.string().trim().min(1),
  when: z.string().trim(),
  amount: z.coerce.number(),
  currency: z.enum(["euro", "usd"]),
  categoryIds: z.preprocess((val) => (val === undefined ? [] : val), z.array(z.string())),
});
const DEFAULT_SELECT = ["id", "description", "when", "amount", "currency"] as const;

function allTransactionQueryBase(filter?: BaseFilters) {
  let query = db.selectFrom("transactions").select(DEFAULT_SELECT);
  if (filter?.onOrBefore) {
    query = query.where("when", "<=", filter.onOrBefore);
  }
  if (filter?.onOrAfter) {
    query = query.where("when", ">=", filter.onOrAfter);
  }
  return query;
}

async function insertCategoryRelationsForMassImport(
  trx: DBTransaction,
  transactions: { id: string; description: string }[],
  hardcodedCategoryIds: string[],
) {
  const rules = await trx
    .selectFrom("mass_import_rules")
    .select(["category_id", "predicate"])
    .execute();
  const processedRules = rules.map((rule) => ({
    category_id: rule.category_id,
    predicate: rule.predicate.toLowerCase(),
  }));
  const relations = transactions.flatMap((transaction) => {
    const hardcodedRelations = hardcodedCategoryIds.map((categoryId) => ({
      category_id: categoryId,
      transaction_id: transaction.id,
    }));
    const matchedRelations = processedRules
      .filter((rule) => {
        return (
          !hardcodedCategoryIds.includes(rule.category_id) &&
          transaction.description.toLowerCase().includes(rule.predicate)
        );
      })
      .map((rule) => ({ category_id: rule.category_id, transaction_id: transaction.id }));
    return hardcodedRelations.concat(matchedRelations);
  });
  if (relations.length) {
    await trx.insertInto("categories_transactions").values(relations).execute();
  }
}

async function transactionsWithCategories<T extends { id: string }>(
  transactions: T[],
  options?: Parameters<typeof categoriesForTransactionIds>[1],
  transactionOptions?: { includeIds?: string[] },
): Promise<(T & { categories: Categories })[]> {
  const categoriesMap = await categoriesForTransactionIds(
    transactions.map((t) => t.id),
    options,
  );
  const transactionsWithCategories = transactions.map((transaction) => ({
    ...transaction,
    categories: categoriesMap[transaction.id] || [],
  }));
  const includeIds = transactionOptions?.includeIds;
  return includeIds?.length
    ? transactionsWithCategories.filter((transaction) => {
        return transaction.categories.some((category) => includeIds.includes(category.id));
      })
    : transactionsWithCategories;
}

export async function allTransactionsFromFilters(filter?: BaseFilters) {
  const transactions = await allTransactionQueryBase(filter).orderBy("when", "desc").execute();
  return transactionsWithCategories(transactions, undefined, { includeIds: filter?.categoryIds });
}

export async function transactionDataForReporting(
  reportingOptions: Parameters<typeof generateReportingData>[0],
) {
  return generateReportingData(reportingOptions, async (baseFilter) => {
    return transactionsWithCategories(await allTransactionQueryBase(baseFilter).execute(), {
      excludeBreakdownIgnoredCategories: true,
    });
  });
}

export async function deleteTransaction(transactionId: string) {
  await db.deleteFrom("transactions").where("id", "=", transactionId).executeTakeFirstOrThrow();
  return transactionId;
}

async function insertCategoryRelations(
  trx: DBTransaction,
  transactionId: string,
  categoryIds: string[],
) {
  if (!categoryIds.length) {
    return [];
  }
  return trx
    .insertInto("categories_transactions")
    .values(
      categoryIds.map((categoryId) => ({
        category_id: categoryId,
        transaction_id: transactionId,
      })),
    )
    .execute();
}

export async function editTransaction(transactionId: string, inputs: Record<string, unknown>) {
  const now = new Date();
  const transaction = INPUT_SCHEMA.parse(inputs);
  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("transactions")
      .set({
        description: transaction.description,
        when: transaction.when,
        amount: transaction.amount,
        currency: transaction.currency,
        updated_at: now,
      })
      .where("id", "=", transactionId)
      .executeTakeFirstOrThrow();
    await trx
      .deleteFrom("categories_transactions")
      .where("transaction_id", "=", transactionId)
      .execute();
    return insertCategoryRelations(trx, transactionId, transaction.categoryIds);
  });
  return transactionId;
}

export async function addTransaction(inputs: Record<string, unknown>) {
  const now = new Date();
  const id = v4();
  const transaction = INPUT_SCHEMA.parse(inputs);
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("transactions")
      .values({
        id,
        description: transaction.description,
        when: transaction.when,
        amount: transaction.amount,
        currency: transaction.currency,
        inserted_at: now,
        updated_at: now,
      })
      .executeTakeFirstOrThrow();
    return insertCategoryRelations(trx, id, transaction.categoryIds);
  });
  return id;
}

export async function massImport(inputs: Record<string, unknown>) {
  const { categoryIds, csv, currency, invertAmounts } = MASS_IMPORT_INPUT_SCHEMA.parse(inputs);
  const csvParsedTransactions = parse(csv, { invertAmounts });
  const now = new Date();
  return db.transaction().execute(async (trx) => {
    const dupesFromDb = await trx
      .selectFrom("transactions")
      .select(["id", "amount", "currency", "when"])
      .where((eb) =>
        eb.or(
          csvParsedTransactions.map((parsedTransaction) =>
            eb.and([
              eb("when", "=", parsedTransaction.when),
              eb("amount", "=", parsedTransaction.amount),
              eb("currency", "=", currency),
            ]),
          ),
        ),
      )
      .execute();
    const nonDupedParsedTransactions = csvParsedTransactions.filter(({ amount, when }) => {
      return !dupesFromDb.some(
        (dupeCheck) =>
          dupeCheck.amount === amount && dupeCheck.when === when && dupeCheck.currency === currency,
      );
    });
    if (nonDupedParsedTransactions.length) {
      const insertTransactions = nonDupedParsedTransactions.map((parsedTransaction) => ({
        id: v4(),
        description: parsedTransaction.description,
        when: parsedTransaction.when,
        amount: parsedTransaction.amount,
        currency,
        inserted_at: now,
        updated_at: now,
      }));
      await trx.insertInto("transactions").values(insertTransactions).execute();
      await insertCategoryRelationsForMassImport(trx, insertTransactions, categoryIds);
    }
    return {
      insertedCount: nonDupedParsedTransactions.length,
      skippedCount: csvParsedTransactions.length - nonDupedParsedTransactions.length,
    };
  });
}
