import type { Kysely, ReferenceExpression } from "kysely";
import type { DB } from "kysely-codegen";

const TABLES: (keyof DB)[] = ["asset", "asset_snapshot", "transaction", "transaction_category"];

export async function up(db: Kysely<unknown>) {
  for (const table of TABLES) {
    await db.schema.alterTable(table).dropColumn("inserted_at").execute();
  }
}

export async function down(db: Kysely<DB>) {
  const now = new Date();
  for (const table of TABLES) {
    await db.schema.alterTable(table).addColumn("inserted_at", "timestamp(0)").execute();
    await db
      .updateTable(table)
      .set("inserted_at" as ReferenceExpression<DB, keyof DB>, now)
      .execute();
    await db.schema
      .alterTable(table)
      .alterColumn("inserted_at", (col) => col.setNotNull())
      .execute();
  }
}
