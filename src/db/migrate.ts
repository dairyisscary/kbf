// oxlint-disable no-console
import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { Migrator, FileMigrationProvider, type MigrationResultSet } from "kysely/migration";

// @ts-expect-error -- so node can import it without a build tool
import { db } from "#/db/index.ts";

function processMigrationResultSet({ error, results }: MigrationResultSet) {
  for (const { status, migrationName } of results || []) {
    if (status === "Success") {
      console.log(`* Migration "${migrationName}" was executed successfully.`);
    } else if (status === "Error") {
      console.error(`* Failed to execute migration "${migrationName}".`);
    }
  }

  if (error) {
    console.error("Failed to migrate!");
    console.error(error);
    throw error as Error;
  }

  return results;
}

async function main() {
  console.log("Starting migrations");
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs: { readdir },
      path: { join },
      migrationFolder: join(import.meta.dirname, "./migrations"),
    }),
  });
  const operation = process.argv[2];
  const migrateOperation =
    operation === "down" ? migrator.migrateDown() : migrator.migrateToLatest();
  processMigrationResultSet(await migrateOperation);
  console.log("Finished migrations");
}

main()
  .then(() => db.destroy())
  .catch(() => process.exit(1));
