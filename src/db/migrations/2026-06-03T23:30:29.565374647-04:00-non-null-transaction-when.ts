import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>) {
  return db.schema
    .alterTable("transactions")
    .alterColumn("when", (col) => col.setNotNull())
    .execute();
}

export async function down(db: Kysely<unknown>) {
  return db.schema
    .alterTable("transactions")
    .alterColumn("when", (col) => col.dropNotNull())
    .execute();
}
