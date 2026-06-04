"use server";
import { v7 } from "uuid";
import { z } from "zod";

import { db } from "~/db";
import { checkSession } from "~/session";

const INPUT_SCHEMA = z.object({
  name: z.string().trim().min(1),
  currency: z.enum(["euro", "usd"]),
  taxAdvantaged: z.preprocess((val) => val === "on" || val, z.boolean()).optional(),
});
const DEFAULT_SELECT = ["id", "name", "currency", "tax_advantaged as taxAdvantaged"] as const;

export async function addAsset(inputs: Record<string, unknown>) {
  await checkSession();
  const asset = INPUT_SCHEMA.parse(inputs);
  const id = v7();
  const now = new Date();
  await db
    .insertInto("assets")
    .values({
      id,
      name: asset.name,
      currency: asset.currency,
      tax_advantaged: asset.taxAdvantaged || false,
      updated_at: now,
      inserted_at: now,
    })
    .execute();
  return id;
}

export async function editAsset(assetId: string, inputs: Record<string, unknown>) {
  await checkSession();
  const asset = INPUT_SCHEMA.parse(inputs);
  await db
    .updateTable("assets")
    .set({
      name: asset.name,
      currency: asset.currency,
      tax_advantaged: asset.taxAdvantaged || false,
      updated_at: new Date(),
    })
    .where("id", "=", assetId)
    .execute();
  return assetId;
}

export async function deleteAsset(assetId: string) {
  await checkSession();
  await db.deleteFrom("assets").where("id", "=", assetId).executeTakeFirstOrThrow();
  return assetId;
}

export async function allAssets() {
  await checkSession();
  return db.selectFrom("assets").select(DEFAULT_SELECT).orderBy("name").execute();
}
