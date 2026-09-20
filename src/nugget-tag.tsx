import { v7 } from "uuid";
import * as z from "zod";

import { uniq } from "#/array";
import { MAX_COLOR_CODE } from "#/color-code";
import { db } from "#/db";

const DEFAULT_SELECT = ["id", "name", "color_code as colorCode"] as const;
const DEFAULT_LINK_SELECT = ["nugget_id as nuggetId", "nugget_tag_id as nuggetTagId"] as const;
const INPUT_SCHEMA = z.object({
  name: z.string().trim().min(1),
  colorCode: z.coerce.number().min(0).max(MAX_COLOR_CODE),
});

export async function nuggetTagsForNuggets(nuggetIds: string[]) {
  const links = nuggetIds.length
    ? await db
        .selectFrom("nugget_to_nugget_tag")
        .select(DEFAULT_LINK_SELECT)
        .where("nugget_id", "in", uniq(nuggetIds))
        .execute()
    : [];

  const tags = links.length
    ? await db
        .selectFrom("nugget_tag")
        .select(DEFAULT_SELECT)
        .where("id", "in", uniq(links.map((link) => link.nuggetTagId)))
        .execute()
    : [];

  const lookup = new Map<string, typeof tags>();
  for (const nuggetId of nuggetIds) {
    const tagsForId = links.flatMap((link) => {
      if (link.nuggetId !== nuggetId) {
        return [];
      }
      const foundTag = tags.find((tag) => tag.id === link.nuggetTagId);
      return foundTag ? [foundTag] : [];
    });
    lookup.set(nuggetId, tagsForId);
  }

  return {
    get(nuggetId: string) {
      return lookup.get(nuggetId) || [];
    },
  };
}

async function countsOfNuggets() {
  const countItems = await db
    .selectFrom("nugget_to_nugget_tag")
    .select((builder) => [
      "nugget_tag_id as nuggetTagId",
      builder.fn.count<number>("nugget_id").as("count"),
    ])
    .groupBy("nugget_tag_id")
    .execute();
  return new Map(countItems.map((item) => [item.nuggetTagId, item.count]));
}

export async function allNuggetTagsByName() {
  return db.selectFrom("nugget_tag").select(DEFAULT_SELECT).orderBy("name").execute();
}

export async function allNuggetTagsWithCounts() {
  const [nuggetTags, counts] = await Promise.all([allNuggetTagsByName(), countsOfNuggets()]);
  return nuggetTags.map((nuggetTag) => ({
    ...nuggetTag,
    nuggetCount: counts.get(nuggetTag.id) || 0,
  }));
}

export async function addNuggetTag(inputs: Record<string, unknown>) {
  const now = new Date();
  const nuggetTagId = v7();
  const nuggetTag = INPUT_SCHEMA.parse(inputs);
  await db
    .insertInto("nugget_tag")
    .values({
      id: nuggetTagId,
      name: nuggetTag.name,
      color_code: nuggetTag.colorCode,
      inserted_at: now,
      updated_at: now,
    })
    .executeTakeFirstOrThrow();
  return nuggetTagId;
}

export async function editNuggetTag(nuggetTagId: string, inputs: Record<string, unknown>) {
  const now = new Date();
  const nuggetTag = INPUT_SCHEMA.parse(inputs);
  await db
    .updateTable("nugget_tag")
    .set({
      name: nuggetTag.name,
      color_code: nuggetTag.colorCode,
      updated_at: now,
    })
    .where("id", "=", nuggetTagId)
    .executeTakeFirstOrThrow();
  return nuggetTagId;
}

export async function deleteNuggetTag(nuggetTagId: string) {
  await db.deleteFrom("nugget_tag").where("id", "=", nuggetTagId).executeTakeFirstOrThrow();
  return nuggetTagId;
}
