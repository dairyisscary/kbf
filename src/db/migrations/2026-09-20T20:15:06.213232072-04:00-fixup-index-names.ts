import { sql, type Kysely } from "kysely";

const INDEXES: [oldName: string, newName: string][] = [
  ["assets_pkey", "asset_pkey"],

  ["asset_snapshots_pkey", "asset_snapshot_pkey"],
  ["asset_snapshots_when_index", "asset_snapshot_when"],
  ["asset_snapshots_asset_when_unique_index", "asset_snapshot_asset_when_unique"],

  ["categories_pkey", "transaction_category_pkey"],
  ["categories_name_index", "transaction_category_name"],

  [
    "categories_transactions_category_id_index",
    "transaction_category_to_transaction_transaction_category_id",
  ],
  [
    "categories_transactions_transaction_id_index",
    "transaction_category_to_transaction_transaction_id",
  ],

  ["mass_import_rules_pkey", "mass_import_rule_pkey"],

  ["transactions_pkey", "transaction_pkey"],
  ["transactions_when_index", "transaction_when"],
];

export async function up(db: Kysely<unknown>) {
  for (const [oldName, newName] of INDEXES) {
    // oxlint-disable-next-line no-await-in-loop
    await sql`ALTER INDEX ${sql.id(oldName)} RENAME TO ${sql.id(newName)}`.execute(db);
  }
}

export async function down(db: Kysely<unknown>) {
  for (const [oldName, newName] of INDEXES) {
    // oxlint-disable-next-line no-await-in-loop
    await sql`ALTER INDEX ${sql.id(newName)} RENAME TO ${sql.id(oldName)}`.execute(db);
  }
}
