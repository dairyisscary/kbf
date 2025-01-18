"use server";
import { z } from "zod";
import { v7 } from "uuid";

import { db } from "~/db";
import { checkSession } from "~/session";

const INPUT_SCHEMA = z.object({
  name: z.string().trim().min(1),
  currency: z.enum(["euro", "usd"]),
  taxAdvantaged: z.preprocess((val) => val === "on" || val, z.boolean()).optional(),
});
const DEFAULT_SELECT = ["id", "name", "currency", "tax_advantaged as taxAdvantaged"] as const;

export async function addAssetSnapshotKind(inputs: Record<string, unknown>) {
  await checkSession();
  const kind = INPUT_SCHEMA.parse(inputs);
  const id = v7();
  const now = new Date();
  await db
    .insertInto("asset_snapshot_kinds")
    .values({
      id,
      name: kind.name,
      currency: kind.currency,
      tax_advantaged: kind.taxAdvantaged || false,
      updated_at: now,
      inserted_at: now,
    })
    .execute();
  return id;
}

export async function editAssetSnapshotKind(
  assetSnapshotKindId: string,
  inputs: Record<string, unknown>,
) {
  await checkSession();
  const kind = INPUT_SCHEMA.parse(inputs);
  await db
    .updateTable("asset_snapshot_kinds")
    .set({
      name: kind.name,
      currency: kind.currency,
      tax_advantaged: kind.taxAdvantaged || false,
      updated_at: new Date(),
    })
    .where("id", "=", assetSnapshotKindId)
    .execute();
  return assetSnapshotKindId;
}

export async function deleteAssetSnapshotKind(assetSnapshotKindId: string) {
  await checkSession();
  await db
    .deleteFrom("asset_snapshot_kinds")
    .where("id", "=", assetSnapshotKindId)
    .executeTakeFirstOrThrow();
  return assetSnapshotKindId;
}

export async function allAssetSnapshotKinds(ids?: string[]) {
  await checkSession();
  let select = db.selectFrom("asset_snapshot_kinds").select(DEFAULT_SELECT);
  if (ids?.length) {
    select = select.where("id", "in", [...new Set(ids)]);
  }
  return select.orderBy("name").execute();
}
