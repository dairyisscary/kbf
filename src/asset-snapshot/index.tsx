"use server";
import { v7 } from "uuid";
import { z } from "zod";

import { allAssets } from "~/asset";
import { db } from "~/db";
import { checkSession } from "~/session";

type BaseFilters = {
  onOrBefore?: string | null;
  onOrAfter?: string | null;
};

const INPUT_SCHEMA = z.object({
  when: z.string().trim().min(1),
  amount: z.coerce.number(),
});
const DEFAULT_SELECT = ["id", "amount", "when", "asset_id as assetId"] as const;

export async function addAssetSnapshot(assetId: string, inputs: Record<string, unknown>) {
  await checkSession();
  const snapshot = INPUT_SCHEMA.parse(inputs);
  const id = v7();
  const now = new Date();
  await db
    .insertInto("asset_snapshots")
    .values({
      id,
      when: snapshot.when,
      amount: snapshot.amount,
      asset_id: assetId,
      updated_at: now,
      inserted_at: now,
    })
    .execute();
  return id;
}

export async function editAssetSnapshot(assetSnapshotId: string, inputs: Record<string, unknown>) {
  await checkSession();
  const snapshot = INPUT_SCHEMA.parse(inputs);
  await db
    .updateTable("asset_snapshots")
    .set({
      when: snapshot.when,
      amount: snapshot.amount,
      updated_at: new Date(),
    })
    .where("id", "=", assetSnapshotId)
    .returning(["id"])
    .executeTakeFirstOrThrow();
  return assetSnapshotId;
}

export async function deleteAssetSnapshot(assetSnapshotId: string) {
  await checkSession();
  await db
    .deleteFrom("asset_snapshots")
    .where("id", "=", assetSnapshotId)
    .returning(["id"])
    .executeTakeFirstOrThrow();
  return assetSnapshotId;
}

function allAssetSnapshotsQueryBase(filters?: BaseFilters) {
  let query = db.selectFrom("asset_snapshots").select(DEFAULT_SELECT);
  if (filters?.onOrBefore) {
    query = query.where("when", "<=", filters.onOrBefore);
  }
  if (filters?.onOrAfter) {
    query = query.where("when", ">=", filters.onOrAfter);
  }
  return query;
}

export async function allAssetSnapshotsByAsset(filters?: BaseFilters) {
  await checkSession();
  const [fetchedSnapshots, fetchedAssets] = await Promise.all([
    allAssetSnapshotsQueryBase(filters).orderBy("when", "desc").execute(),
    allAssets(),
  ]);
  return fetchedAssets.map((asset) => {
    const { id: assetId } = asset;
    return {
      snapshots: fetchedSnapshots.filter((snapshot) => snapshot.assetId === assetId),
      asset,
    };
  });
}
