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
  await db
    .insertInto("asset_snapshot_kinds")
    .values({
      id: v7(),
      name: kind.name,
      currency: kind.currency,
      tax_advantaged: kind.taxAdvantaged || false,
    })
    .execute();
}

export async function allAssetSnapshotKinds() {
  await checkSession();
  return db.selectFrom("asset_snapshot_kinds").select(DEFAULT_SELECT).orderBy("name").execute();
}
