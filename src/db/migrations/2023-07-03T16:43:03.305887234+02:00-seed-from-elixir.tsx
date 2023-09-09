import type { Kysely } from "kysely";
import type { DataTypeExpression } from "kysely/dist/cjs/parser/data-type-parser";

export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("categories")
    .addColumn("id", "uuid", (col) => col.notNull().primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("color_code", "integer", (col) => col.notNull())
    .addColumn("inserted_at", "timestamp(0)", (col) => col.notNull())
    .addColumn("updated_at", "timestamp(0)", (col) => col.notNull())
    .addColumn("ignored_for_breakdown_reporting", "boolean", (col) =>
      col.defaultTo(false).notNull(),
    )
    .execute();
  await db.schema
    .createIndex("categories_name_index")
    .on("categories")
    .column("name")
    .unique()
    .using("btree")
    .execute();

  await db.schema.createType("currency").asEnum(["usd", "euro"]).execute();
  await db.schema
    .createTable("transactions")
    .addColumn("id", "uuid", (col) => col.notNull().primaryKey())
    .addColumn("description", "text", (col) => col.notNull())
    .addColumn("amount", "double precision", (col) => col.notNull())
    .addColumn("when", "date")
    .addColumn("inserted_at", "timestamp(0)", (col) => col.notNull())
    .addColumn("updated_at", "timestamp(0)", (col) => col.notNull())
    .addColumn("currency", "currency" as DataTypeExpression, (col) => col.notNull())
    .execute();
  await db.schema
    .createIndex("transactions_when_index")
    .on("transactions")
    .column("when")
    .using("btree")
    .execute();

  await db.schema
    .createTable("categories_transactions")
    .addColumn("category_id", "uuid", (col) =>
      col.references("categories.id").onDelete("cascade").notNull(),
    )
    .addColumn("transaction_id", "uuid", (col) =>
      col.references("transactions.id").onDelete("cascade").notNull(),
    )
    .execute();
  await db.schema
    .createIndex("categories_transactions_category_id_index")
    .on("categories_transactions")
    .column("category_id")
    .using("btree")
    .execute();
  await db.schema
    .createIndex("categories_transactions_transaction_id_index")
    .on("categories_transactions")
    .column("transaction_id")
    .using("btree")
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropIndex("categories_transactions_category_id_index").execute();
  await db.schema.dropIndex("categories_transactions_transaction_id_index").execute();
  await db.schema.dropTable("categories_transactions").execute();

  await db.schema.dropType("currency").execute();
  await db.schema.dropIndex("transactions_when_index").execute();
  await db.schema.dropTable("transactions").execute();

  await db.schema.dropIndex("categories_name_index").execute();
  await db.schema.dropTable("categories").execute();
}
