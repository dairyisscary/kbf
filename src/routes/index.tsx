import { createAsync, query, useSearchParams, A, type RouteDefinition } from "@solidjs/router";
import { createMemo, createSignal, For, Show, type ComponentProps } from "solid-js";

import { allCategoriesByName, type CategoryFilter } from "~/category";
import { CategoryColorPip, getColorsForCode } from "~/category/pip";
import { BarChart, colorizeActiveTooltipItem, LineChart } from "~/chart";
import clx from "~/clx";
import {
  formatMoneyNoCents,
  formatMoneyAmount,
  formatFractionAsPercent,
  formatRightAlignPadding,
} from "~/format";
import Icon from "~/icon";
import { KbfSiteTitle } from "~/meta";
import { getAssetsAndTransactionsForReporting } from "~/reporting";
import type { Options as IntervalOptions } from "~/reporting/interval";
import TabGroup from "~/tab-group";
import { AmountPill } from "~/transaction/pip";

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

const getAllCategoriesForReport = query(
  () => allCategoriesByName({ includeUncategorized: true, ...CATEGORY_FILTER }),
  "categoriesForReport",
);

const getReportData = query((timeline: string | undefined) => {
  let intervalOptions: IntervalOptions = { type: DEFAULT_TIMELINE };
  if (timeline && timeline !== DEFAULT_TIMELINE) {
    const [count, stepTimeUnit] = timeline.split("-") as [string, "month" | "year"];
    intervalOptions = {
      type: `by-${stepTimeUnit}`,
      count: Number(count),
      includeCurrent: stepTimeUnit === "year",
    };
  }

  return getAssetsAndTransactionsForReporting({
    interval: intervalOptions,
    transactionCategoryFilter: CATEGORY_FILTER,
  });
}, "allDataForReporting");

export const route: RouteDefinition = {
  load(args) {
    void getAllCategoriesForReport();
    void getReportData(args.location.query.timeline as string | undefined);
  },
};

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

function Sums(props: {
  data:
    | { euro: { total: number; count: number }; usd: { total: number; count: number } }
    | undefined;
}) {
  return (
    <div>
      <p class="pb-2 text-sm">
        {(props.data?.euro.count || 0) + (props.data?.usd.count || 0)}
        {" transactions"}
      </p>
      <p class="flex flex-wrap items-center gap-2">
        <AmountPill transaction={{ currency: "euro", amount: props.data?.euro.total || 0 }} />
        <AmountPill transaction={{ currency: "usd", amount: props.data?.usd.total || 0 }} />
      </p>
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
    const formatted = formatRightAlignPadding(itemsWithPercent, index, (item) => item.value);
    return `${item.label}: ${formatted}`;
  });
}

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reportData = createAsync(() => getReportData(searchParams.timeline as string | undefined));
  const allCategories = createAsync(() => getAllCategoriesForReport());

  const [currencyStrategy, setCurrencyStrategy] = createSignal<Strategy>("merged-usd");

  const assetGraphProps = createMemo((): LineChartProps | null => {
    const data = reportData();
    if (!data) {
      return null;
    }

    const currencyStrat = currencyStrategy();
    const isSeperateCurrency = currencyStrat === "separate";
    const isMergedUsd = currencyStrat === "merged-usd";
    const isMergedEuro = currencyStrat === "merged-euro";

    const datasets = data.assetSnapshot.intervaledAssets.map(({ asset, snapshots }) => {
      return {
        label: asset.name,
        data: snapshots.map(({ snapshot, isVirtual }, index): AssetDatum => {
          const x = data.labels[index]!;
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
        backgroundColor: asset.taxAdvantaged ? "#64b6ac" : "#6c6aea",
        fill: true,
        pointStyle: snapshots.map(({ isVirtual }) => (isVirtual ? "star" : "rectRounded")),
        pointRadius: 10,
        pointHoverRadius: 10,
        pointHoverBackgroundColor: asset.taxAdvantaged ? "#64b6ac" : "#6c6aea",
        type: undefined as unknown as "radar", // bad types in chart.js?
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
                const formatted = formatRightAlignPadding(datasets, datasetIndex, (dataset) => {
                  const indexData = dataset.data[dataIndex]!;
                  return formatMoneyNoCents({
                    amount: indexData.y || 0,
                    currency: indexData.currency,
                  })!;
                });
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
            ?.map((c) => c.id)
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

  const spendGraph = createMemo((): BarChartProps | null => {
    const data = reportData();
    if (!data) {
      return null;
    }
    const isIgnoredLookup = ignored();
    const currencyStrat = currencyStrategy();
    const { intervaledCategories } = data.transaction;

    const datasets = computeSpendChartDatasets(
      intervaledCategories,
      currencyStrat,
      isIgnoredLookup,
    );

    const nonIgnoredCategories = intervaledCategories.filter(
      ({ category }) => !isIgnoredLookup.has(category.id),
    );

    return {
      data: { labels: data.labels, datasets },
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
    const sums = reportData()?.transaction.sumsPerCategory;
    if (!sums) {
      return null;
    }
    return allCategories()?.map((category) => ({
      category,
      sums: sums.find((sum) => sum.category.id === category.id),
    }));
  });

  return (
    <>
      <KbfSiteTitle>Dashboard</KbfSiteTitle>
      <header class="mb-14 space-y-6">
        <h1>Dashboard</h1>
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
        <Show when={assetGraphProps()}>
          {(graph) => (
            <section class="space-y-8">
              <h2>Wealth</h2>
              <LineChart class={CHART_CX} data={graph().data} options={graph().options} />
            </section>
          )}
        </Show>

        <Show when={spendGraph()}>
          {(graph) => (
            <section class="space-y-8">
              <h2>Spend</h2>
              <BarChart class={CHART_CX} data={graph().data} options={graph().options} />

              <div>
                <h3 class="mb-4">Totals</h3>
                <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <For each={allCategoriesWithSums()}>
                    {({ category, sums }) => (
                      <div
                        class={clx(
                          "flex flex-col justify-between gap-7 rounded-sm bg-kbf-light-purple p-3 transition-opacity duration-300",
                          ignored().has(category.id) && "opacity-40",
                        )}
                      >
                        <div class="flex items-center gap-2">
                          <CategoryColorPip size="sm" class="shrink-0" code={category.colorCode} />
                          <A
                            href={`/transactions?filterCategoryIds=${category.id}`}
                            class="mr-auto overflow-hidden text-ellipsis text-kbf-text-highlight hover:underline lg:text-lg"
                          >
                            {category.name}
                          </A>
                          <button type="button" onClick={[toggleIgnore, category.id]}>
                            <Icon size="sm" name={ignored().has(category.id) ? "eye" : "eye-off"} />
                          </button>
                        </div>
                        <Sums data={sums} />
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </section>
          )}
        </Show>
      </div>
    </>
  );
}
