import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>) {
  await db.schema
    .alterTable("transaction_category")
    .alterColumn("color_code", (col) => col.setDataType("smallint"))
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema
    .alterTable("transaction_category")
    .alterColumn("color_code", (col) => col.setDataType("integer"))
    .execute();
}
