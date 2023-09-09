import {
  eachYearOfInterval,
  subMonths,
  subYears,
  eachMonthOfInterval,
  format as formatDate,
} from "date-fns";

type ReportableTransaction = {
  when: string;
  amount: number;
  currency: "usd" | "euro";
  categories: { id: string; name: string; colorCode: number }[];
};
type Grouping = {
  type: "by-month" | "by-year";
  count: number;
};

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

function makeIntervals(
  intervalKeys: string[],
  transactions: ReportableTransaction[],
  currency: ReportableTransaction["currency"],
) {
  return intervalKeys.map((key) => {
    const aggregate = { income: 0, spend: 0 };
    for (const transaction of transactions) {
      if (!transaction.when.startsWith(key) || transaction.currency !== currency) {
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

export async function generateReportingData(
  grouping: Grouping,
  getTransactions: (filter: {
    onOrBefore?: string;
    onOrAfter?: string;
  }) => Promise<ReportableTransaction[]>,
) {
  const groupingParams =
    grouping.type === "by-year"
      ? {
          keyFormat: "yyyy-",
          humanFormat: "yyyy",
          subFn: subYears,
          intervalFn: eachYearOfInterval,
        }
      : {
          keyFormat: "yyyy-MM-",
          humanFormat: "MMM yyyy",
          subFn: subMonths,
          intervalFn: eachMonthOfInterval,
        };

  const now = new Date();
  const interval = groupingParams.intervalFn({
    start: groupingParams.subFn(now, grouping.count - 1),
    end: now,
  });

  const transactions = await getTransactions({
    onOrAfter: formatDate(interval[0], "yyyy-MM-dd"),
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

  const intervalKeys = interval.map((anchorDate) =>
    formatDate(anchorDate, groupingParams.keyFormat),
  );
  const categoriesWithMatchingTransactions = allCategories.map((category) => ({
    category,
    transactions: transactions.filter((transaction) => {
      return category.id === transaction.categories[0].id;
    }),
  }));

  return {
    intervals: {
      labels: interval.map((anchorDate) => formatDate(anchorDate, groupingParams.humanFormat)),
      categories: categoriesWithMatchingTransactions.map(({ category, transactions }) => ({
        category,
        euro: makeIntervals(intervalKeys, transactions, "euro"),
        usd: makeIntervals(intervalKeys, transactions, "usd"),
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
