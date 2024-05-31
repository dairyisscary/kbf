import PG from "pg";
import { Kysely, PostgresDialect, type Transaction } from "kysely";
import type { DB, Transactions } from "kysely-codegen";

type KBFDatabase = Omit<DB, "transactions"> & {
  transactions: Omit<Transactions, "when"> & {
    when: string;
  };
};
export type DBTransaction = Transaction<KBFDatabase>;

const { types, Pool } = PG;

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
