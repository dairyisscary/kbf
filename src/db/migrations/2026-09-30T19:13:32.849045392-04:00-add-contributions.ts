import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("contribution")
    .addColumn("id", "uuid", (col) => col.notNull().primaryKey())
    .addColumn("amount", "double precision", (col) => col.notNull())
    .addColumn("when", "date", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz(0)", (col) => col.notNull())
    .addColumn("asset_id", "uuid", (col) =>
      col.references("asset.id").onDelete("cascade").notNull(),
    )
    .execute();

  await db.schema
    .createIndex("contribution_when_index")
    .on("contribution")
    .column("when")
    .using("btree")
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropIndex("contribution_when_index").execute();

  await db.schema.dropTable("contribution").execute();
}
