import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("asset_snapshot_kinds")
    .addColumn("id", "uuid", (col) => col.notNull().primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("tax_advantaged", "boolean", (col) => col.notNull())
    .addColumn("currency", sql`currency`, (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("asset_snapshots")
    .addColumn("id", "uuid", (col) => col.notNull().primaryKey())
    .addColumn("amount", "double precision", (col) => col.notNull())
    .addColumn("when", "timestamp(0)", (col) => col.notNull())
    .execute();
  return db.schema
    .createIndex("asset_snapshots_when_index")
    .on("asset_snapshots")
    .column("when")
    .using("btree")
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropIndex("asset_snapshots_when_index").execute();
  await db.schema.dropTable("asset_snapshots").execute();
  return db.schema.dropTable("asset_snapshot_kinds").execute();
}
