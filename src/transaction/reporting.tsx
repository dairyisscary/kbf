import {
  eachYearOfInterval,
  subMonths,
  subYears,
  eachMonthOfInterval,
  isSameMonth,
  endOfMonth,
  format as formatDate,
  isSameYear,
  startOfYear,
} from "date-fns";

import { localizeDateFromDatabase } from "~/format";

type ReportableTransaction = {
  when: string;
  amount: number;
  currency: "usd" | "euro";
  categories: { id: string; name: string; colorCode: number }[];
};
type Grouping = { type: "year-to-date" } | { type: "by-month" | "by-year"; count: number };

function makeCategorySum(
  transactions: ReportableTransaction[],
  currency: ReportableTransaction["currency"],
) {
  const aggregate = { total: 0, count: 0 };
  for (const transaction of transactions) {
    if (transaction.currency === currency) {
      aggregate.total += transaction.amount;
      aggregate.count++;
    }
  }
  return aggregate;
}

function makeViewIntervals(
  interval: Date[],
  transactions: ReportableTransaction[],
  currency: ReportableTransaction["currency"],
  samePredicate: (a: Date, b: Date) => boolean,
) {
  return interval.map((keyDate) => {
    const aggregate = { income: 0, spend: 0 };
    for (const transaction of transactions) {
      if (
        transaction.currency !== currency ||
        !samePredicate(localizeDateFromDatabase(transaction.when), keyDate)
      ) {
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

function getTransactionParams(grouping: Grouping) {
  const now = new Date();
  switch (grouping.type) {
    case "year-to-date": {
      const lastMonth = subMonths(now, 1);
      return {
        humanFormat: "MMMM",
        interval: eachMonthOfInterval({
          start: startOfYear(lastMonth),
          end: lastMonth,
        }),
        samePredicate: isSameMonth,
      };
    }
    case "by-month":
      // For month, we don't include the current (incomplete) month
      return {
        humanFormat: "MMM yyyy",
        interval: eachMonthOfInterval({
          start: subMonths(now, grouping.count),
          end: subMonths(now, 1),
        }),
        onOrBefore: endOfMonth(subMonths(now, 1)),
        samePredicate: isSameMonth,
      };
    case "by-year":
      return {
        humanFormat: "yyyy",
        interval: eachYearOfInterval({
          start: subYears(now, grouping.count - 1),
          end: now,
        }),
        samePredicate: isSameYear,
      };
  }
}

export async function generateReportingData(
  grouping: Grouping,
  getTransactions: (filter: {
    onOrBefore?: string;
    onOrAfter?: string;
  }) => Promise<ReportableTransaction[]>,
) {
  const groupingParams = getTransactionParams(grouping);
  const { interval } = groupingParams;

  const transactions = await getTransactions({
    onOrBefore: groupingParams.onOrBefore && formatDate(groupingParams.onOrBefore, "yyyy-MM-dd"),
    onOrAfter: formatDate(groupingParams.interval[0]!, "yyyy-MM-dd"),
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

  const categoriesWithMatchingTransactions = allCategories.map((category) => ({
    category,
    transactions: transactions.filter((transaction) => {
      return category.id === transaction.categories[0]?.id;
    }),
  }));

  return {
    intervals: {
      labels: interval.map((anchorDate) => formatDate(anchorDate, groupingParams.humanFormat)),
      categories: categoriesWithMatchingTransactions.map(({ category, transactions }) => ({
        category,
        euro: makeViewIntervals(interval, transactions, "euro", groupingParams.samePredicate),
        usd: makeViewIntervals(interval, transactions, "usd", groupingParams.samePredicate),
      })),
    },
    sums: {
      categories: categoriesWithMatchingTransactions.map(({ category, transactions }) => ({
        category,
        euro: makeCategorySum(transactions, "euro"),
        usd: makeCategorySum(transactions, "usd"),
      })),
    },
  };
}
