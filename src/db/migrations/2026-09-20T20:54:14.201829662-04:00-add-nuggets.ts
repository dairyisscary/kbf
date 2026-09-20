import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("nugget")
    .addColumn("id", "uuid", (col) => col.notNull().primaryKey())
    .addColumn("note", "varchar(255)")
    .addColumn("amount", "double precision", (col) => col.notNull())
    .addColumn("currency", sql`currency`, (col) => col.notNull())
    .addColumn("when", "date", (col) => col.notNull())
    .addColumn("inserted_at", "timestamptz(0)", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz(0)", (col) => col.notNull())
    .execute();
  await db.schema.createIndex("nugget_when").on("nugget").column("when").using("btree").execute();

  await db.schema
    .createTable("nugget_tag")
    .addColumn("id", "uuid", (col) => col.notNull().primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("color_code", "integer", (col) => col.notNull())
    .addColumn("inserted_at", "timestamp(0)", (col) => col.notNull())
    .addColumn("updated_at", "timestamp(0)", (col) => col.notNull())
    .execute();
  await db.schema
    .createIndex("nugget_tag_name")
    .on("nugget_tag")
    .column("name")
    .unique()
    .using("btree")
    .execute();

  await db.schema
    .createTable("nugget_to_nugget_tag")
    .addColumn("nugget_id", "uuid", (col) =>
      col.references("nugget.id").onDelete("cascade").notNull(),
    )
    .addColumn("nugget_tag_id", "uuid", (col) =>
      col.references("nugget_tag.id").onDelete("cascade").notNull(),
    )
    .execute();
  return db.schema
    .createIndex("nugget_to_nugget_tag_nugget_id")
    .on("nugget_to_nugget_tag")
    .column("nugget_id")
    .using("btree")
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropIndex("nugget_to_nugget_tag_nugget_id").execute();
  await db.schema.dropTable("nugget_to_nugget_tag").execute();

  await db.schema.dropIndex("nugget_tag_name").execute();
  await db.schema.dropTable("nugget_tag").execute();

  await db.schema.dropIndex("nugget_when").execute();
  return db.schema.dropTable("nugget").execute();
}
