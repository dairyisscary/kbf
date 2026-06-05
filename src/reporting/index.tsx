"use server";
import { allAssetSnapshotsByAsset, mostRecentSnapshotsAsOf } from "~/asset-snapshot";
import type { CategoryFilter } from "~/category";
import { type Options as IntervalOptions, type Interval, makeInterval } from "~/reporting/interval";
import { checkSession } from "~/session";
import { getTransactionsWithCategoryFilters } from "~/transaction";

type ReportableTransaction = {
  when: string;
  amount: number;
  currency: "usd" | "euro";
  categories: { id: string; name: string; colorCode: number }[];
};

type Options = {
  interval: IntervalOptions;
  transactionCategoryFilter: CategoryFilter;
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

async function getReportingTransactions(interval: Interval, categoryFilter: CategoryFilter) {
  const transactions = await getTransactionsWithCategoryFilters({
    categoryFilter,
  });

  const allCategories = Array.from(
    Object.values(
      Object.fromEntries(
        transactions
          .flatMap((transaction) => transaction.categories)
          .map((category) => [category.id, category]),
      ),
    ),
  );

  const categoriesWithMatchingTransactions = allCategories.map((category) => {
    const euroTransactions = [];
    const usdTransactions = [];
    for (const transaction of transactions) {
      // This is a bit spooky, but should always have one transaction that matches:
      if (category.id !== transaction.categories[0]?.id) {
        continue;
      }
      if (transaction.currency === "euro") {
        euroTransactions.push(transaction);
        continue;
      }
      usdTransactions.push(transaction);
    }
    return {
      category,
      usdTransactions,
      euroTransactions,
    };
  });

  return {
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

export async function getAssetsAndTransactionsForReporting(options: Options) {
  await checkSession();

  const interval = makeInterval(options.interval);

  const [transaction, assetSnapshot] = await Promise.all([
    getReportingTransactions(interval, options.transactionCategoryFilter),
    getReportingAssetSnapshots(interval),
  ]);

  return {
    labels: interval.labels,
    transaction,
    assetSnapshot,
  };
}
