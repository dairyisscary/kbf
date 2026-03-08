import { sql, type Kysely } from "kysely";
import type { Categories, DB } from "kysely-codegen";

const KIND_COLUMN_NAME = "kind";
const KIND_TYPE_NAME = "category_kind";
const IGNORED_BREAKDOWN_COLUMN_NAME = "ignored_for_breakdown_reporting";

type ModDB = Omit<DB, "categories"> & {
  categories: Categories & { ignored_for_breakdown_reporting: boolean };
};

export async function up(db: Kysely<ModDB>) {
  await db.schema.createType(KIND_TYPE_NAME).asEnum(["basic", "payment"]).execute();

  await db.schema
    .alterTable("categories")
    .addColumn(KIND_COLUMN_NAME, sql`category_kind`, (col) => col.defaultTo("basic").notNull())
    .execute();

  await db
    .updateTable("categories")
    .set(KIND_COLUMN_NAME, "payment")
    .where(IGNORED_BREAKDOWN_COLUMN_NAME, "=", true)
    .execute();

  await db.schema
    .alterTable("categories")
    .alterColumn(KIND_COLUMN_NAME, (col) => col.dropDefault())
    .execute();

  return db.schema.alterTable("categories").dropColumn(IGNORED_BREAKDOWN_COLUMN_NAME).execute();
}

export async function down(db: Kysely<ModDB>) {
  await db.schema
    .alterTable("categories")
    .addColumn(IGNORED_BREAKDOWN_COLUMN_NAME, "boolean", (col) => col.defaultTo(false).notNull())
    .execute();

  await db
    .updateTable("categories")
    .set(IGNORED_BREAKDOWN_COLUMN_NAME, true)
    .where(KIND_COLUMN_NAME, "=", "payment")
    .execute();

  await db.schema.alterTable("categories").dropColumn(KIND_COLUMN_NAME).execute();

  return db.schema.dropType(KIND_TYPE_NAME).execute();
}
