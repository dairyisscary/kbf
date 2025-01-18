import { sql, type Kysely } from "kysely";

export function up(db: Kysely<unknown>) {
  return db.schema
    .createTable("asset_snapshot_kinds")
    .addColumn("id", "uuid", (col) => col.notNull().primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("tax_advantaged", "boolean", (col) => col.notNull())
    .addColumn("currency", sql`currency`, (col) => col.notNull())
    .addColumn("inserted_at", "timestamptz(0)", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz(0)", (col) => col.notNull())
    .execute();
}

export function down(db: Kysely<unknown>) {
  return db.schema.dropTable("asset_snapshot_kinds").execute();
}
