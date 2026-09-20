import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>) {
  await db.schema.alterTable("categories").renameTo("transaction_category").execute();
  await db.schema.alterTable("transactions").renameTo("transaction").execute();
  await db.schema
    .alterTable("categories_transactions")
    .renameColumn("category_id", "transaction_category_id")
    .execute();
  await db.schema
    .alterTable("categories_transactions")
    .renameTo("transaction_category_to_transaction")
    .execute();

  await db.schema
    .alterTable("mass_import_rules")
    .renameColumn("category_id", "transaction_category_id")
    .execute();
  await db.schema.alterTable("mass_import_rules").renameTo("mass_import_rule").execute();

  await db.schema.alterTable("assets").renameTo("asset").execute();
  await db.schema.alterTable("asset_snapshots").renameTo("asset_snapshot").execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.alterTable("asset_snapshot").renameTo("asset_snapshots").execute();
  await db.schema.alterTable("asset").renameTo("assets").execute();

  await db.schema.alterTable("mass_import_rule").renameTo("mass_import_rules").execute();
  await db.schema
    .alterTable("mass_import_rules")
    .renameColumn("transaction_category_id", "category_id")
    .execute();

  await db.schema
    .alterTable("transaction_category_to_transaction")
    .renameTo("categories_transactions")
    .execute();
  await db.schema
    .alterTable("categories_transactions")
    .renameColumn("transaction_category_id", "category_id")
    .execute();
  await db.schema.alterTable("transaction").renameTo("transactions").execute();
  await db.schema.alterTable("transaction_category").renameTo("categories").execute();
}
