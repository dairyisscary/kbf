"use server";
import { z } from "zod";
import { v7 } from "uuid";

import { db } from "~/db";
import { checkSession } from "~/session";

import { allAssetSnapshotKinds } from "./kind";

const INPUT_SCHEMA = z.object({
  when: z.string().trim().min(1),
  amount: z.coerce.number(),
  assetSnapshotKindId: z.string().trim().min(1),
});

export async function addAssetSnapshot(inputs: Record<string, unknown>) {
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
      asset_snapshot_kind_id: snapshot.assetSnapshotKindId,
      updated_at: now,
      inserted_at: now,
    })
    .execute();
  return id;
}

export async function editAssetSnapshot(snapshotId: string, inputs: Record<string, unknown>) {
  await checkSession();
  const snapshot = INPUT_SCHEMA.parse(inputs);
  await db
    .updateTable("asset_snapshots")
    .set({
      when: snapshot.when,
      amount: snapshot.amount,
      asset_snapshot_kind_id: snapshot.assetSnapshotKindId,
      updated_at: new Date(),
    })
    .where("id", "=", snapshotId)
    .execute();
  return snapshotId;
}

export async function deleteAssetSnapshot(assetSnapshotId: string) {
  await checkSession();
  await db
    .deleteFrom("asset_snapshots")
    .where("id", "=", assetSnapshotId)
    .executeTakeFirstOrThrow();
  return assetSnapshotId;
}

export async function allAssetSnapshots(filters?: { onOrAfter?: string | null }) {
  await checkSession();
  let select = db
    .selectFrom("asset_snapshots")
    .select(["id", "amount", "when", "asset_snapshot_kind_id as assetSnapshotKindId"]);
  if (filters?.onOrAfter) {
    select = select.where("when", ">=", filters.onOrAfter);
  }
  const fetchedSnapshots = await select.orderBy("when", "desc").execute();

  const fetchedKinds = await allAssetSnapshotKinds(
    fetchedSnapshots.map((s) => s.assetSnapshotKindId),
  );
  const snapshotKinds = fetchedKinds.reduce<Record<string, (typeof fetchedKinds)[number]>>(
    (accum, kind) => {
      return { ...accum, [kind.id]: kind };
    },
    {},
  );

  return fetchedSnapshots.map((s) => ({
    ...s,
    kind: snapshotKinds[s.assetSnapshotKindId]!,
  }));
}
