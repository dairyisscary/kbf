import * as path from "node:path";
import { promises as fs } from "node:fs";
import { Migrator, FileMigrationProvider } from "kysely";

import { db } from "~/db";

export async function migrateToLatest() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, "./migrations"),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

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

migrateToLatest().catch(() => process.exit(1));
