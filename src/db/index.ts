import { Kysely, PostgresDialect, type Transaction as KyselyDBTransaction } from "kysely";
import type { AssetSnapshot, DB, Nugget, Transaction } from "kysely-codegen";
import { types, Pool } from "pg";

export type KBFDatabase = Omit<DB, "nugget" | "transaction" | "asset_snapshot"> & {
  transaction: Omit<Transaction, "when"> & {
    when: string;
  };
  asset_snapshot: Omit<AssetSnapshot, "when"> & {
    when: string;
  };
  nugget: Omit<Nugget, "when"> & {
    when: string;
  };
};

export type DBTransaction = KyselyDBTransaction<KBFDatabase>;

function construct() {
  const { PGUSER, PGHOST, PGPORT, PGMAX, PGPASSWORD, PGDATABASE } = process.env;
  types.setTypeParser(types.builtins.DATE, (v) => v);
  return new Kysely<KBFDatabase>({
    dialect: new PostgresDialect({
      pool: new Pool({
        database: PGDATABASE,
        host: PGHOST,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        max: Number(PGMAX),
      }),
    }),
  });
}

export const db = construct();
