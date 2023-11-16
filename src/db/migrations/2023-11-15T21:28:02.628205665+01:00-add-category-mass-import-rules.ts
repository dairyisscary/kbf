import type { Kysely } from "kysely";

export function up(db: Kysely<unknown>) {
  return db.schema
    .createTable("mass_import_rules")
    .addColumn("id", "uuid", (col) => col.notNull().primaryKey())
    .addColumn("predicate", "varchar(255)", (col) => col.notNull())
    .addColumn("category_id", "uuid", (col) =>
      col.references("categories.id").onDelete("cascade").notNull(),
    )
    .execute();
}

export function down(db: Kysely<unknown>) {
  return db.schema.dropTable("mass_import_rules").execute();
}
