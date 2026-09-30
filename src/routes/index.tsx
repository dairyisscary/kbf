import { query, useSearchParams, defineRoute } from "@solidjs/router";
import type { ComponentProps, JSX } from "@solidjs/web";
import { createMemo, createSignal, For, Loading } from "solid-js";

import { allCategoriesByName, type CategoryFilter } from "#/category";
import { BarChart, colorizeActiveTooltipItem, LineChart } from "#/chart";
import { ColorCodePip, getColorsForCode } from "#/color-code";
import {
  AmountPill,
  formatMoneyNoCents,
  formatMoneyAmount,
  formatFractionAsPercent,
  formatPercent,
  formatRightAlignPadding,
  formatPlural,
} from "#/format";
import { Icon } from "#/icon";
import { paths } from "#/navigation";
import { PageTitle } from "#/page-title";
import { getReporting } from "#/reporting";
import { requireUser } from "#/session";
import { TabGroup } from "#/tab-group";

type Strategy = "separate" | "merged-usd" | "merged-euro";
type BarChartProps = Pick<ComponentProps<typeof BarChart>, "data" | "options">;
type LineChartProps = Pick<ComponentProps<typeof LineChart>, "data" | "options">;
type IntervalsOfCategories = Awaited<
  ReturnType<typeof getReportData>
>["transaction"]["intervaledCategories"];
type AssetDatum = {
  x: string;
  y: number | null;
  currency: "usd" | "euro";
  taxAdvantaged: boolean;
  isVirtual: boolean;
};
type TicksWithMoneyFormat<R extends Record<string, unknown>> = R & {
  ticks?: { callback: (value: string | number) => string | null };
};
type AssetSums = { advantagedUsd: number; advantagedEuro: number; euro: number; usd: number };

const CHART_CX = "h-[clamp(500px,70vh,900px)]";
const DEFAULT_TIMELINE = "year-to-date-by-month";
const ONE_EURO_IN_USD = 1.14;
const CATEGORY_FILTER: CategoryFilter = { includeKinds: ["basic"] };
const SUM_LABEL = "Sum";
const PURPLE = "#6c6aea";
const GREEN = "#64b6ac";
const SAVINGS_PERCENT_YAXIS = "savingsPercent";
const MONEY_YAXIS = "money";

const getAllCategoriesForReport = query(async () => {
  "use server";
  requireUser();
  return allCategoriesByName({ includeUncategorized: true, ...CATEGORY_FILTER });
}, "categoriesByFilterIncludeUncat");

const getReportData = query(async (timeline: string | null) => {
  "use server";
  requireUser();
  const options: Parameters<typeof getReporting>[0] = {
    assetSnapshot: {
      interval: { type: DEFAULT_TIMELINE, includeCurrent: true },
    },
    income: {
      interval: { type: DEFAULT_TIMELINE, includeCurrent: true },
    },
    transaction: {
      interval: { type: DEFAULT_TIMELINE },
      categoryFilter: CATEGORY_FILTER,
    },
  };
  if (timeline && timeline !== DEFAULT_TIMELINE) {
    const [count, stepTimeUnit] = timeline.split("-") as [string, "month" | "year"];
    options.transaction.interval = {
      type: `by-${stepTimeUnit}`,
      count: Number(count),
      includeCurrent: stepTimeUnit === "year",
    };
    options.income.interval = options.assetSnapshot.interval = {
      ...options.transaction.interval,
      count: options.transaction.interval.count + 1,
      includeCurrent: true,
    };
  }
  return getReporting(options);
}, "allReporting");

export const route = defineRoute({
  preload({ location }) {
    void getAllCategoriesForReport();
    void getReportData((location.query.timeline as string | undefined) || null);
  },
});

function zipEuroIntoUsd(options: { euro: number[]; usd: number[] }): number[] {
  return options.usd.map((usd, index) => {
    const euro = options.euro[index] || 0;
    return usd + euro * ONE_EURO_IN_USD;
  });
}

function zipUsdIntoEuro(options: { euro: number[]; usd: number[] }): number[] {
  return options.euro.map((euro, index) => {
    const usd = options.usd[index] || 0;
    return euro + usd / ONE_EURO_IN_USD;
  });
}

function computeSpendChartDatasets(
  intervaledCategories: IntervalsOfCategories,
  currencyStrat: Strategy,
  isIgnoredLookup: Set<string>,
): BarChartProps["data"]["datasets"] {
  return intervaledCategories.flatMap(({ category, euro, usd }) => {
    const hidden = isIgnoredLookup.has(category.id);
    const [, backgroundColor] = getColorsForCode(category.colorCode);
    const euroData = euro.map((interval) => interval.spend - interval.income);
    const usdData = usd.map((interval) => interval.spend - interval.income);
    if (currencyStrat === "merged-usd") {
      return [
        {
          label: category.name,
          type: "bar" as const,
          stack: "usd",
          data: zipEuroIntoUsd({ euro: euroData, usd: usdData }),
          backgroundColor,
          hidden,
        },
      ];
    } else if (currencyStrat === "merged-euro") {
      return [
        {
          label: category.name,
          type: "bar" as const,
          stack: "euro",
          data: zipUsdIntoEuro({ euro: euroData, usd: usdData }),
          backgroundColor,
          hidden,
        },
      ];
    }
    return [
      {
        label: category.name,
        type: "bar" as const,
        stack: "euro",
        data: euroData,
        backgroundColor,
        hidden,
      },
      {
        label: category.name,
        type: "bar" as const,
        stack: "usd",
        data: usdData,
        backgroundColor,
        hidden,
      },
    ];
  });
}

function withMoneyTicks<R extends Record<string, unknown>>(
  input: R,
  strategy: Strategy,
): TicksWithMoneyFormat<R> {
  // this is so that we can workaround weird chart.js when .ticks is set
  if (strategy === "merged-usd") {
    (input as TicksWithMoneyFormat<R>).ticks = {
      callback: (value) => formatMoneyNoCents({ amount: value as number, currency: "usd" }),
    };
  } else if (strategy === "merged-euro") {
    (input as TicksWithMoneyFormat<R>).ticks = {
      callback: (value) => formatMoneyNoCents({ amount: value as number, currency: "euro" }),
    };
  }
  return input;
}

type SumData = { euro: { total: number; count: number }; usd: { total: number; count: number } };

function TileData(props: { children: JSX.Element; count: number; label: string }) {
  return (
    <div>
      <p class="pb-2 text-sm">{formatPlural(props.count, props.label)}</p>
      <p class="flex flex-wrap items-center gap-2">{props.children}</p>
    </div>
  );
}

function getAssetFooterItems({ advantagedEuro, euro, advantagedUsd, usd }: AssetSums) {
  const taxAdvantagedLabel = "Tax-Advantaged";
  const nonAdvantagedLabel = "Non-Advantaged";
  return [
    { currency: "usd", label: taxAdvantagedLabel, amount: advantagedUsd },
    { currency: "euro", label: taxAdvantagedLabel, amount: advantagedEuro },
    { currency: "usd", label: nonAdvantagedLabel, amount: usd },
    { currency: "euro", label: nonAdvantagedLabel, amount: euro },
    {
      currency: "usd",
      label: SUM_LABEL,
      amount: usd + advantagedUsd,
    },
    {
      currency: "euro",
      label: SUM_LABEL,
      amount: euro + advantagedEuro,
    },
  ] as const;
}

function formatAssetFooter(lookup: AssetSums[], items: { dataIndex: number }[]) {
  const dataIndex = items[0]?.dataIndex ?? -1;
  const sums = lookup[dataIndex];
  if (!sums) {
    return "";
  }
  const footerItems = getAssetFooterItems(sums);

  const previousSums = lookup[dataIndex - 1];
  const previousItems = previousSums && getAssetFooterItems(previousSums);

  const itemsWithPercent = footerItems.flatMap((item, index) => {
    if (!item.amount) {
      return [];
    }
    const formattedItem = { label: item.label, value: formatMoneyNoCents(item)! };
    const comparison = item.label === SUM_LABEL && previousItems?.[index]?.amount;
    if (!comparison) {
      return [formattedItem];
    }
    return [
      formattedItem,
      {
        label: "Percent Change",
        value: formatFractionAsPercent(item.amount - comparison, comparison)!,
      },
    ];
  });

  return itemsWithPercent.map((item, index) => {
    const formatted = formatRightAlignPadding(
      itemsWithPercent,
      index,
      (formatItem) => formatItem.value,
    );
    return `${item.label}: ${formatted}`;
  });
}

type TileTotalProps<T> = {
  title: string;
  each: T[];
  itemFaded?: (item: T) => boolean;
  children: (item: T) => JSX.Element;
};

function TileTotals<T>(props: TileTotalProps<T>) {
  return (
    <Loading>
      <div>
        <h3 class="mb-4">{props.title}</h3>
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <For
            each={props.each}
            fallback={
              <div class="col-span-full rounded-sm bg-kbf-light-purple p-3 text-center italic">
                None
              </div>
            }
          >
            {(item) => (
              <div
                class={[
                  "flex flex-col justify-between gap-7 rounded-sm bg-kbf-light-purple p-3 transition-opacity duration-300",
                  props.itemFaded?.(item) && "opacity-40",
                ]}
              >
                {props.children(item)}
              </div>
            )}
          </For>
        </div>
      </div>
    </Loading>
  );
}

function TaggedTileTotals<T>(
  props: TileTotalProps<T> & {
    itemColorCode: (item: T) => number;
    itemSums: (item: T) => SumData | undefined;
    sumsLabel: string;
  },
) {
  return (
    <TileTotals each={props.each} title={props.title} itemFaded={props.itemFaded}>
      {(item) => {
        const sumData = createMemo(() => props.itemSums(item));
        return (
          <>
            <div class="flex items-center gap-2">
              <ColorCodePip size="sm" class="shrink-0" code={props.itemColorCode(item)} />
              {props.children(item)}
            </div>
            <TileData
              count={(sumData()?.euro.count || 0) + (sumData()?.usd.count || 0)}
              label={props.sumsLabel}
            >
              <AmountPill object={{ currency: "euro", amount: sumData()?.euro.total || 0 }} />
              <AmountPill object={{ currency: "usd", amount: sumData()?.usd.total || 0 }} />
            </TileData>
          </>
        );
      }}
    </TileTotals>
  );
}

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reportData = createMemo(() =>
    getReportData((searchParams.timeline as string | undefined) || null),
  );
  const allCategories = createMemo(() => getAllCategoriesForReport());

  const [currencyStrategy, setCurrencyStrategy] = createSignal<Strategy>("merged-usd");

  const nuggetGraphProps = createMemo((): LineChartProps => {
    const { income, transaction } = reportData();
    const { nuggetIntervals, contributionIntervals, labels } = income;

    const totalSpendByInterval = new Map<string, { euro: number; usd: number }>();
    let transactionIndex = 0;
    for (const transactionLabel of transaction.labels) {
      const transactionAggregate = { euro: 0, usd: 0 };
      for (const { euro, usd } of transaction.intervaledCategories) {
        transactionAggregate.euro -= euro[transactionIndex]?.income || 0;
        transactionAggregate.euro += euro[transactionIndex]?.spend || 0;
        transactionAggregate.usd -= usd[transactionIndex]?.income || 0;
        transactionAggregate.usd += usd[transactionIndex]?.spend || 0;
      }
      totalSpendByInterval.set(transactionLabel, transactionAggregate);
      transactionIndex++;
    }

    const currencyStrat = currencyStrategy();
    const isSeperateCurrency = currencyStrat === "separate";
    const isMergedUsd = currencyStrat === "merged-usd";
    const isMergedEuro = currencyStrat === "merged-euro";

    const includeUsd = isSeperateCurrency || isMergedUsd;
    const includeEuro = isSeperateCurrency || isMergedEuro;

    const datasets = [
      includeUsd && {
        label: "USD Savings %",
        data: nuggetIntervals.map((interval, index) => {
          const x = labels[index];
          const spendAggregate = (x && totalSpendByInterval.get(x)) || { euro: 0, usd: 0 };

          let totalNuggets = interval.usd;
          let totalSpend = spendAggregate.usd;
          if (isMergedUsd) {
            totalNuggets += interval.euro * ONE_EURO_IN_USD;
            totalSpend += spendAggregate.euro * ONE_EURO_IN_USD;
          }

          const y = totalNuggets === 0 ? 1 : (totalNuggets - totalSpend) / totalNuggets;
          return { x, y, currency: "usd" as const };
        }),
        yAxisID: SAVINGS_PERCENT_YAXIS,
        borderColor: GREEN,
        pointStyle: "triangle",
        pointRadius: 8,
        pointBackgroundColor: GREEN,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: GREEN,
        type: undefined as unknown as "radar", // Bad Chart.js types...
      },

      includeEuro && {
        label: "Euro Savings %",
        data: nuggetIntervals.map((interval, index) => {
          const x = labels[index];
          const spendAggregate = (x && totalSpendByInterval.get(x)) || { euro: 0, usd: 0 };

          let totalNuggets = interval.euro;
          let totalSpend = spendAggregate.euro;
          if (isMergedEuro) {
            totalNuggets += interval.usd / ONE_EURO_IN_USD;
            totalSpend += spendAggregate.usd / ONE_EURO_IN_USD;
          }

          const y = totalNuggets === 0 ? 1 : (totalNuggets - totalSpend) / totalNuggets;
          return { x, y, currency: "euro" as const };
        }),
        yAxisID: SAVINGS_PERCENT_YAXIS,
        borderColor: GREEN,
        pointStyle: "triangle",
        pointRadius: 8,
        pointBackgroundColor: GREEN,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: GREEN,
        type: undefined as unknown as "radar", // Bad Chart.js types...
      },

      includeUsd && {
        label: "USD Nugget",
        data: nuggetIntervals.map((interval, index) => {
          const x = labels[index];
          let y = interval.usd;
          if (isMergedUsd) {
            y += interval.euro * ONE_EURO_IN_USD;
          }
          return { x, y, currency: "usd" as const };
        }),
        yAxisID: MONEY_YAXIS,
        borderColor: PURPLE,
        pointStyle: "rectRounded",
        pointRadius: 8,
        pointBackgroundColor: PURPLE,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: PURPLE,
        type: undefined as unknown as "radar", // Bad Chart.js types...
      },

      includeEuro && {
        label: "Euro Nugget",
        data: nuggetIntervals.map((interval, index) => {
          const x = labels[index];
          let y = interval.euro;
          if (isMergedEuro) {
            y += interval.usd / ONE_EURO_IN_USD;
          }
          return { x, y, currency: "euro" as const };
        }),
        yAxisID: MONEY_YAXIS,
        borderColor: PURPLE,
        pointStyle: "rectRounded",
        pointRadius: 8,
        pointBackgroundColor: PURPLE,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: PURPLE,
        type: undefined as unknown as "radar", // Bad Chart.js types...
      },

      includeUsd && {
        label: "USD Contribution",
        data: contributionIntervals.map((interval, index) => {
          const x = labels[index];
          let y = interval.usd;
          if (isMergedUsd) {
            y += interval.euro * ONE_EURO_IN_USD;
          }
          return { x, y, currency: "usd" as const };
        }),
        yAxisID: MONEY_YAXIS,
        borderColor: GREEN,
        pointStyle: "rectRounded",
        pointRadius: 8,
        pointBackgroundColor: GREEN,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: GREEN,
        type: undefined as unknown as "radar", // Bad Chart.js types...
      },

      includeEuro && {
        label: "Euro Contribution",
        data: contributionIntervals.map((interval, index) => {
          const x = labels[index];
          let y = interval.euro;
          if (isMergedEuro) {
            y += interval.usd / ONE_EURO_IN_USD;
          }
          return { x, y, currency: "euro" as const };
        }),
        yAxisID: MONEY_YAXIS,
        borderColor: GREEN,
        pointStyle: "rectRounded",
        pointRadius: 8,
        pointBackgroundColor: GREEN,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: GREEN,
        type: undefined as unknown as "radar", // Bad Chart.js types...
      },
    ].filter(Boolean);
    return {
      data: { datasets },
      options: {
        interaction: { mode: "point", intersect: true },
        scales: {
          [MONEY_YAXIS]: withMoneyTicks({ min: 0 }, currencyStrat),
          [SAVINGS_PERCENT_YAXIS]: {
            position: "right",
            ticks: { callback: formatPercent as () => string },
            grid: { drawOnChartArea: false },
          },
        },
        plugins: {
          tooltip: {
            mode: "index",
            position: "nearest",
            displayColors: false,
            titleAlign: "center",
            bodyAlign: "right",
            callbacks: {
              labelTextColor: colorizeActiveTooltipItem,
              label({ dataset, datasetIndex, dataIndex }) {
                const formatted = formatRightAlignPadding(
                  datasets,
                  datasetIndex,
                  (formatDataset) => {
                    const indexData = formatDataset.data[dataIndex]!;
                    return formatDataset.yAxisID !== SAVINGS_PERCENT_YAXIS
                      ? formatMoneyNoCents({
                          amount: indexData.y || 0,
                          currency: indexData.currency,
                        })!
                      : formatPercent(indexData.y || 1);
                  },
                );
                return `${dataset.label!}: ${formatted}`;
              },
            },
          },
        },
      },
    };
  });

  const assetGraphProps = createMemo((): LineChartProps => {
    const data = reportData();

    const currencyStrat = currencyStrategy();
    const isSeperateCurrency = currencyStrat === "separate";
    const isMergedUsd = currencyStrat === "merged-usd";
    const isMergedEuro = currencyStrat === "merged-euro";

    const datasets = data.assetSnapshot.intervaledAssets.map(({ asset, snapshots }) => {
      return {
        label: asset.name,
        data: snapshots.map(({ snapshot, isVirtual }, index): AssetDatum => {
          const x = data.assetSnapshot.labels[index]!;
          let { currency } = asset;

          if (!snapshot) {
            return { x, y: null, currency, taxAdvantaged: asset.taxAdvantaged, isVirtual };
          }

          let { amount } = snapshot;

          if (isMergedUsd && currency === "euro") {
            amount = amount * ONE_EURO_IN_USD;
            currency = "usd";
          } else if (isMergedEuro && currency === "usd") {
            amount = amount / ONE_EURO_IN_USD;
            currency = "euro";
          }
          return {
            x,
            y: amount,
            currency,
            taxAdvantaged: asset.taxAdvantaged,
            isVirtual,
          };
        }),
        stack: !isSeperateCurrency
          ? undefined
          : asset.taxAdvantaged
            ? "advantaged"
            : "not-advantaged",
        backgroundColor: asset.taxAdvantaged ? GREEN : PURPLE,
        fill: true,
        pointStyle: snapshots.map(({ isVirtual }) => (isVirtual ? "star" : "rectRounded")),
        pointRadius: 8,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: asset.taxAdvantaged ? GREEN : PURPLE,
        type: undefined as unknown as "radar", // Bad Chart.js types...
      };
    });

    const sumsLookup: AssetSums[] = [];
    for (const dataset of datasets) {
      dataset.data.forEach(({ y, currency, taxAdvantaged }, index) => {
        if (!y) {
          return;
        }
        const sums = sumsLookup[index] || { advantagedEuro: 0, advantagedUsd: 0, euro: 0, usd: 0 };
        const isUsd = currency === "usd";
        if (taxAdvantaged && isUsd) {
          sums.advantagedUsd += y;
        } else if (taxAdvantaged) {
          sums.advantagedEuro += y;
        } else if (isUsd) {
          sums.usd += y;
        } else {
          sums.euro += y;
        }
        sumsLookup[index] = sums;
      });
    }

    return {
      data: { datasets },
      options: {
        interaction: { mode: "point", intersect: true },
        scales: {
          y: withMoneyTicks({ stacked: true, min: 0 }, currencyStrat),
        },
        plugins: {
          tooltip: {
            mode: "index",
            position: "nearest",
            displayColors: false,
            titleAlign: "center",
            bodyAlign: "right",
            footerAlign: "right",
            callbacks: {
              labelTextColor: colorizeActiveTooltipItem,
              label({ dataset, datasetIndex, dataIndex }) {
                const formatted = formatRightAlignPadding(
                  datasets,
                  datasetIndex,
                  (formatDataset) => {
                    const indexData = formatDataset.data[dataIndex]!;
                    return formatMoneyNoCents({
                      amount: indexData.y || 0,
                      currency: indexData.currency,
                    })!;
                  },
                );
                return `${dataset.label!}: ${formatted}`;
              },
              footer: formatAssetFooter.bind(null, sumsLookup),
            },
          },
        },
      },
    };
  });

  const [ignored, setIgnored] = createSignal(new Set<string>());
  const toggleIgnore = (categoryId: string, event: MouseEvent) => {
    const ctrlClicked = event.ctrlKey || event.metaKey;
    setIgnored((current) => {
      if (ctrlClicked) {
        return new Set(
          allCategories()
            .map((c) => c.id)
            .filter((id) => id !== categoryId),
        );
      }

      const newValues = new Set(current);
      if (newValues.has(categoryId)) {
        newValues.delete(categoryId);
      } else {
        newValues.add(categoryId);
      }
      return newValues;
    });
  };

  const spendGraph = createMemo((): BarChartProps => {
    const { intervaledCategories, labels } = reportData().transaction;
    const isIgnoredLookup = ignored();
    const currencyStrat = currencyStrategy();

    const datasets = computeSpendChartDatasets(
      intervaledCategories,
      currencyStrat,
      isIgnoredLookup,
    );

    const nonIgnoredCategories = intervaledCategories.filter(
      ({ category }) => !isIgnoredLookup.has(category.id),
    );

    return {
      data: { labels, datasets },
      options: {
        scales: { y: withMoneyTicks({}, currencyStrat) },
        plugins: {
          tooltip: {
            mode: "dataset",
            position: "nearest",
            titleAlign: "center",
            bodyAlign: "right",
            footerAlign: "right",
            displayColors: false,
            callbacks: {
              labelTextColor: colorizeActiveTooltipItem,
              label({ dataset, label, dataIndex }) {
                const currency = dataset.stack as "euro" | "usd";
                const formatted = formatRightAlignPadding(
                  dataset.data as number[],
                  dataIndex,
                  (amount) => formatMoneyAmount({ amount, currency, keepNegative: true })!,
                );
                return `${label}: ${formatted}`;
              },
              footer(tooltipItems) {
                const highlightedItem = tooltipItems.find((item) => item.element.active);
                if (!highlightedItem) {
                  return "";
                }

                const { dataIndex } = highlightedItem;
                let totalUsd = 0;
                let totalEuro = 0;
                const defaultCost = { spend: 0, income: 0 };
                for (const { usd, euro } of nonIgnoredCategories) {
                  const atUsd = usd[dataIndex] || defaultCost;
                  totalUsd += atUsd.spend - atUsd.income;
                  const atEuro = euro[dataIndex] || defaultCost;
                  totalEuro += atEuro.spend - atEuro.income;
                }

                const currency = highlightedItem.dataset.stack as "euro" | "usd";
                let amount = totalUsd;
                if (currencyStrat === "merged-usd") {
                  amount = totalUsd + totalEuro * ONE_EURO_IN_USD;
                } else if (currencyStrat === "merged-euro") {
                  amount = totalEuro + totalUsd / ONE_EURO_IN_USD;
                } else if (currency === "euro") {
                  amount = totalEuro;
                }

                const formatted = formatMoneyAmount({ amount, currency, keepNegative: true });
                return `${highlightedItem.label} ${SUM_LABEL}: ${formatted!}`;
              },
            },
          },
        },
      },
    };
  });

  const allCategoriesWithSums = createMemo(() => {
    const sums = reportData().transaction.sumsPerCategory;
    return allCategories().map((category) => ({
      category,
      sums: sums.find((sum) => sum.category.id === category.id),
    }));
  });

  return (
    <>
      <header class="mb-14 space-y-6">
        <PageTitle icon="home">Dashboard</PageTitle>
        <div class="flex items-center justify-between">
          <TabGroup
            class="w-[min(45%,500px)]"
            items={[
              { label: "Year-to-Date", value: "year-to-date-by-month" },
              { label: "12 Months", value: "12-month" },
              { label: "5 Years", value: "5-year" },
            ]}
            value={searchParams.timeline || DEFAULT_TIMELINE}
            onChange={(timeline) => {
              setSearchParams({ timeline });
            }}
          />
          <TabGroup
            class="w-[min(45%,500px)]"
            items={[
              { label: "Merged USD", value: "merged-usd" },
              { label: "Merged Euro", value: "merged-euro" },
              { label: "Separate", value: "separate" },
            ]}
            value={currencyStrategy()}
            onChange={setCurrencyStrategy}
          />
        </div>
      </header>

      <div class="space-y-14">
        <section class="space-y-8">
          <h2>Wealth</h2>
          <LineChart
            class={CHART_CX}
            data={assetGraphProps().data}
            options={assetGraphProps().options}
          />
        </section>

        <section class="space-y-8">
          <h2>Spend</h2>
          <BarChart class={CHART_CX} data={spendGraph().data} options={spendGraph().options} />

          <TaggedTileTotals
            title="Totals by Category"
            each={allCategoriesWithSums()}
            itemFaded={(item) => ignored().has(item.category.id)}
            itemColorCode={(item) => item.category.colorCode}
            itemSums={(item) => item.sums}
            sumsLabel="transaction"
          >
            {({ category }) => (
              <>
                <a
                  href={paths.transactions({ filterCategoryIds: category.id })}
                  class="mr-auto overflow-hidden text-ellipsis text-kbf-text-highlight hover:underline lg:text-lg"
                >
                  {category.name}
                </a>
                <button type="button" onClick={[toggleIgnore, category.id]}>
                  <Icon size="sm" name={ignored().has(category.id) ? "eye" : "eye-off"} />
                </button>
              </>
            )}
          </TaggedTileTotals>
        </section>

        <section class="space-y-8">
          <h2>Income & Savings</h2>
          <LineChart
            class={CHART_CX}
            data={nuggetGraphProps().data}
            options={nuggetGraphProps().options}
          />

          <TaggedTileTotals
            title="Totals Nuggets by Tag"
            each={reportData().income.nuggetSumsPerTag}
            itemColorCode={(item) => item.tag.colorCode}
            itemSums={(item) => item}
            sumsLabel="nugget"
          >
            {(item) => <h4 class="text-kbf-text-highlight">{item.tag.name}</h4>}
          </TaggedTileTotals>

          <TileTotals
            title="Totals Contributions by Asset"
            each={reportData().income.contributionSumsPerAsset}
          >
            {(item) => (
              <>
                <h4 class="text-kbf-text-highlight">{item.asset.name}</h4>
                <TileData count={item.contributionCount} label="contribution">
                  <AmountPill object={{ currency: item.asset.currency, amount: item.sum }} />
                </TileData>
              </>
            )}
          </TileTotals>
        </section>
      </div>
    </>
  );
}
