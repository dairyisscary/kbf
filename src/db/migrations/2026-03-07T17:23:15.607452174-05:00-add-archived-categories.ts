import type { Kysely } from "kysely";

const ARCHIVED_COLUMN_NAME = "archived";

export function up(db: Kysely<unknown>) {
  return db.schema
    .alterTable("categories")
    .addColumn(ARCHIVED_COLUMN_NAME, "boolean", (col) => col.defaultTo(false).notNull())
    .execute();
}

export function down(db: Kysely<unknown>) {
  return db.schema.alterTable("categories").dropColumn(ARCHIVED_COLUMN_NAME).execute();
}
