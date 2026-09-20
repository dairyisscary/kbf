import { v7 } from "uuid";
import * as z from "zod";

import { db, type DBTransaction } from "#/db";
import { nuggetTagsForNuggets } from "#/nugget-tag";

type BaseFilters = {
  onOrBefore?: string | null;
  onOrAfter?: string | null;
  tagIds?: string[];
};

const INPUT_SCHEMA = z.object({
  note: z.string().trim().optional(),
  when: z.string().trim(),
  amount: z.coerce.number().min(0.01),
  currency: z.enum(["euro", "usd"]),
  tagIds: z.preprocess((val) => (val === undefined ? [] : val), z.array(z.string())),
});
const DEFAULT_SELECT = ["id", "note", "when", "amount", "currency"] as const;

function allNuggetQueryBase(filter?: BaseFilters) {
  let query = db.selectFrom("nugget").select(DEFAULT_SELECT);
  if (filter?.onOrBefore) {
    query = query.where("when", "<=", filter.onOrBefore);
  }
  if (filter?.onOrAfter) {
    query = query.where("when", ">=", filter.onOrAfter);
  }
  return query;
}

async function insertTagRelations(trx: DBTransaction, nuggetId: string, tagIds: string[]) {
  if (!tagIds.length) {
    return [];
  }
  return trx
    .insertInto("nugget_to_nugget_tag")
    .values(
      tagIds.map((tagId) => ({
        nugget_id: nuggetId,
        nugget_tag_id: tagId,
      })),
    )
    .execute();
}

async function nuggetsWithTags<T extends { id: string }>(nuggets: T[]) {
  const tags = await nuggetTagsForNuggets(nuggets.map((nugget) => nugget.id));
  return nuggets.map((nugget) => ({
    ...nugget,
    tags: tags.get(nugget.id),
  }));
}

export async function allNuggetsFromFilters(filter?: BaseFilters) {
  const nuggets = await allNuggetQueryBase(filter).orderBy("when", "desc").execute();
  return nuggetsWithTags(nuggets);
}

export async function addNugget(inputs: Record<string, unknown>) {
  const now = new Date();
  const id = v7();
  const nugget = INPUT_SCHEMA.parse(inputs);
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("nugget")
      .values({
        id,
        note: nugget.note,
        when: nugget.when,
        amount: nugget.amount,
        currency: nugget.currency,
        inserted_at: now,
        updated_at: now,
      })
      .executeTakeFirstOrThrow();
    return insertTagRelations(trx, id, nugget.tagIds);
  });
  return id;
}

export async function editNugget(nuggetId: string, inputs: Record<string, unknown>) {
  const now = new Date();
  const nugget = INPUT_SCHEMA.parse(inputs);
  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("nugget")
      .set({
        note: nugget.note,
        when: nugget.when,
        amount: nugget.amount,
        currency: nugget.currency,
        updated_at: now,
      })
      .where("id", "=", nuggetId)
      .executeTakeFirstOrThrow();
    await trx.deleteFrom("nugget_to_nugget_tag").where("nugget_id", "=", nuggetId).execute();
    return insertTagRelations(trx, nuggetId, nugget.tagIds);
  });
  return nuggetId;
}

export async function deleteNugget(nuggetId: string) {
  await db.deleteFrom("nugget").where("id", "=", nuggetId).executeTakeFirstOrThrow();
  return nuggetId;
}
