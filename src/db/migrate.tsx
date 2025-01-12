import * as path from "node:path";
import { promises as fs } from "node:fs";
import { Migrator, FileMigrationProvider, MigrationResultSet } from "kysely";

import { db } from "~/db";

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
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, "./migrations"),
    }),
  });
  const operation = process.argv[2];
  const migrateOperation =
    operation === "down" ? migrator.migrateDown() : migrator.migrateToLatest();
  return processMigrationResultSet(await migrateOperation);
}

main().catch(() => process.exit(1));
