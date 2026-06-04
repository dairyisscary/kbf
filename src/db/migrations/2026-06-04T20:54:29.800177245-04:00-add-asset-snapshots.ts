import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("asset_snapshots")
    .addColumn("id", "uuid", (col) => col.notNull().primaryKey())
    .addColumn("amount", "double precision", (col) => col.notNull())
    .addColumn("when", "date", (col) => col.notNull())
    .addColumn("inserted_at", "timestamptz(0)", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz(0)", (col) => col.notNull())
    .addColumn("asset_id", "uuid", (col) =>
      col.references("assets.id").onDelete("cascade").notNull(),
    )
    .execute();
  await db.schema
    .createIndex("asset_snapshots_when_index")
    .on("asset_snapshots")
    .column("when")
    .using("btree")
    .execute();
  return db.schema
    .createIndex("asset_snapshots_asset_when_unique_index")
    .unique()
    .on("asset_snapshots")
    .columns(["when", "asset_id"])
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropIndex("asset_snapshots_when_index").execute();
  return db.schema.dropTable("asset_snapshots").execute();
}
