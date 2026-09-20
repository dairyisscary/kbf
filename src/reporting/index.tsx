import { allAssetSnapshotsByAsset, mostRecentSnapshotsAsOf } from "#/asset-snapshot";
import type { CategoryFilter } from "#/category";
import { allNuggetsFromFilters } from "#/nugget";
import { type Options as IntervalOptions, type Interval, makeInterval } from "#/reporting/interval";
import { getTransactionsWithCategoryFilters } from "#/transaction";

type ReportableTransaction = {
  when: string;
  amount: number;
  currency: "usd" | "euro";
  categories: { id: string; name: string; colorCode: number }[];
};

type Options = {
  assetSnapshot: {
    interval: IntervalOptions;
  };
  nugget: {
    interval: IntervalOptions;
  };
  transaction: {
    interval: IntervalOptions;
    categoryFilter: CategoryFilter;
  };
};

function makeCategorySum(transactions: ReportableTransaction[]) {
  const aggregate = { total: 0, count: 0 };
  for (const { amount } of transactions) {
    aggregate.total += amount;
    aggregate.count++;
  }
  return aggregate;
}

function makeViewIntervals(interval: Interval, transactions: ReportableTransaction[]) {
  return interval.groupDataInto((matchesWhen) => {
    const aggregate = { income: 0, spend: 0 };
    for (const transaction of transactions) {
      if (!matchesWhen(transaction.when)) {
        continue;
      }
      if (transaction.amount >= 0) {
        aggregate.income += transaction.amount;
      } else {
        aggregate.spend += transaction.amount * -1;
      }
    }
    return aggregate;
  });
}

async function getReportingNuggets(interval: Interval) {
  const nuggets = await allNuggetsFromFilters(interval.queryFilters);

  type TagAggregate = {
    tag: (typeof nuggets)[number]["tags"][number];
    euro: ReturnType<typeof makeCategorySum>;
    usd: ReturnType<typeof makeCategorySum>;
  };
  const tagToNuggets = new Map<string, TagAggregate>();
  for (const { amount, currency, tags } of nuggets) {
    for (const tag of tags) {
      let current = tagToNuggets.get(tag.id);
      if (!current) {
        current = { tag, euro: { total: 0, count: 0 }, usd: { total: 0, count: 0 } };
        tagToNuggets.set(tag.id, current);
      }
      current[currency].total += amount;
      current[currency].count++;
    }
  }

  return {
    labels: interval.labels,
    intervals: interval.groupDataInto((matchesWhen) => {
      const aggregate = { euro: 0, usd: 0 };
      for (const nugget of nuggets) {
        if (matchesWhen(nugget.when)) {
          aggregate[nugget.currency] += nugget.amount;
        }
      }
      return aggregate;
    }),
    sumsPerTag: Array.from(tagToNuggets.values()).toSorted((a, b) =>
      a.tag.name.localeCompare(b.tag.name),
    ),
  };
}

async function getReportingTransactions(interval: Interval, categoryFilter: CategoryFilter) {
  type Transaction = (typeof transactions)[number];
  const transactions = await getTransactionsWithCategoryFilters({
    filter: interval.queryFilters,
    categoryFilter,
  });

  const dedupedCategories = new Map<string, Transaction["categories"][number]>();
  for (const transaction of transactions) {
    for (const category of transaction.categories) {
      dedupedCategories.set(category.id, category);
    }
  }

  const categoriesWithMatchingTransactions = Array.from(dedupedCategories.values()).map(
    (category) => {
      const euroTransactions: Transaction[] = [];
      const usdTransactions: Transaction[] = [];
      for (const transaction of transactions) {
        // This is a bit spooky, but should always have one transaction that matches:
        if (category.id !== transaction.categories[0]?.id) {
          continue;
        }
        const collection = transaction.currency === "euro" ? euroTransactions : usdTransactions;
        collection.push(transaction);
      }
      return {
        category,
        usdTransactions,
        euroTransactions,
      };
    },
  );

  return {
    labels: interval.labels,
    intervaledCategories: categoriesWithMatchingTransactions.map((matched) => ({
      category: matched.category,
      euro: makeViewIntervals(interval, matched.euroTransactions),
      usd: makeViewIntervals(interval, matched.usdTransactions),
    })),
    sumsPerCategory: categoriesWithMatchingTransactions.map((matched) => ({
      category: matched.category,
      euro: makeCategorySum(matched.euroTransactions),
      usd: makeCategorySum(matched.usdTransactions),
    })),
  };
}

async function getReportingAssetSnapshots(interval: Interval) {
  const [bulkAssetSnapshots, fallbackAssetSnapshots] = await Promise.all([
    allAssetSnapshotsByAsset(interval.queryFilters),
    mostRecentSnapshotsAsOf(interval.queryFilters.onOrAfter),
  ]);

  return {
    labels: interval.labels,
    intervaledAssets: bulkAssetSnapshots.map(({ snapshots, asset }) => {
      const snapshotIntervals: {
        isVirtual: boolean;
        snapshot: (typeof snapshots)[number] | null;
      }[] = [];

      for (const matchesWhen of interval.predicates()) {
        let currentMaxMatchingSnapshot;
        for (const snapshot of snapshots) {
          if (matchesWhen(snapshot.when)) {
            currentMaxMatchingSnapshot = snapshot;
            break;
          }
        }

        // Look at previous interval for a snapshot, then fallback to snapshots
        // outside the range, then give up (null)
        const snapshot =
          currentMaxMatchingSnapshot ||
          snapshotIntervals.at(-1)?.snapshot ||
          fallbackAssetSnapshots.find((fallback) => fallback.assetId === asset.id) ||
          null;
        snapshotIntervals.push({
          snapshot,
          isVirtual: !currentMaxMatchingSnapshot,
        });
      }

      return {
        asset,
        snapshots: snapshotIntervals,
      };
    }),
  };
}

export async function getReporting(options: Options) {
  const [transaction, assetSnapshot, nugget] = await Promise.all([
    getReportingTransactions(
      makeInterval(options.transaction.interval),
      options.transaction.categoryFilter,
    ),
    getReportingAssetSnapshots(makeInterval(options.assetSnapshot.interval)),
    getReportingNuggets(makeInterval(options.nugget.interval)),
  ]);

  return {
    transaction,
    assetSnapshot,
    nugget,
  };
}
