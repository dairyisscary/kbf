import { v7 } from "uuid";
import * as z from "zod";

import { allAssets } from "#/asset";
import { db } from "#/db";

type BaseFilters = {
  onOrBefore?: string | null;
  onOrAfter?: string | null;
};

const INPUT_SCHEMA = z.object({
  assetId: z.string().trim(),
  when: z.string().trim().min(1),
  amount: z.coerce.number(),
});
const DEFAULT_SELECT = ["id", "amount", "when", "asset_id as assetId"] as const;

function allContributionsQueryBase(filters?: BaseFilters) {
  let query = db.selectFrom("contribution").select(DEFAULT_SELECT);
  if (filters?.onOrBefore) {
    query = query.where("when", "<=", filters.onOrBefore);
  }
  if (filters?.onOrAfter) {
    query = query.where("when", ">=", filters.onOrAfter);
  }
  return query;
}

export async function addContribution(inputs: Record<string, unknown>) {
  const contribution = INPUT_SCHEMA.parse(inputs);
  const id = v7();
  await db
    .insertInto("contribution")
    .values({
      id,
      when: contribution.when,
      amount: contribution.amount,
      asset_id: contribution.assetId,
      updated_at: new Date(),
    })
    .execute();
  return id;
}

export async function editContribution(contributionId: string, inputs: Record<string, unknown>) {
  const contribution = INPUT_SCHEMA.parse(inputs);
  await db
    .updateTable("contribution")
    .set({
      when: contribution.when,
      amount: contribution.amount,
      asset_id: contribution.assetId,
      updated_at: new Date(),
    })
    .where("id", "=", contributionId)
    .returning(["id"])
    .executeTakeFirstOrThrow();
  return contributionId;
}

export async function deleteContribution(contributionId: string) {
  await db
    .deleteFrom("contribution")
    .where("id", "=", contributionId)
    .returning(["id"])
    .executeTakeFirstOrThrow();
  return contributionId;
}

export async function allContributionsByAsset(filters?: BaseFilters) {
  const [contributions, assets] = await Promise.all([
    allContributionsQueryBase(filters).orderBy("when", "desc").execute(),
    allAssets(),
  ]);
  return assets.map((asset) => {
    const { id: assetId } = asset;
    return {
      contributions: contributions.filter((contribution) => contribution.assetId === assetId),
      asset,
    };
  });
}
