import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("asset_snapshots")
    .addColumn("id", "uuid", (col) => col.notNull().primaryKey())
    .addColumn("amount", "double precision", (col) => col.notNull())
    .addColumn("when", "date", (col) => col.notNull())
    .addColumn("inserted_at", "timestamptz(0)", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz(0)", (col) => col.notNull())
    .addColumn("asset_snapshot_kind_id", "uuid", (col) =>
      col.references("asset_snapshot_kinds.id").onDelete("cascade").notNull(),
    )
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
  return db.schema.dropTable("asset_snapshots").execute();
}
