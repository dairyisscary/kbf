import { createMemo, createSignal, For, Show } from "solid-js";
import { createAsync, cache, useSearchParams, A, type RouteDefinition } from "@solidjs/router";

import { KbfSiteTitle } from "~/app";
import { transactionDataForReporting } from "~/transaction";
import { allCategoriesByName } from "~/category";
import { BarChart } from "~/chart";
import Icon from "~/icon";
import clx from "~/clx";
import TabGroup from "~/tab-group";
import { CategoryColorPip, getColorsForCode } from "~/category/pip";
import { AmountPill } from "~/transaction/pip";

type Strategy = "separate" | "merged-usd" | "merged-euro";

const DEFAULT_TIMELINE = "6-month";
const ONE_EURO_IN_USD = 1.1;

const getAllCategoriesForReport = cache(
  () => allCategoriesByName({ includeUncategorized: true, excludeIgnoredForBreakdown: true }),
  "categoriesForReport",
);

const getTransactionsForReport = cache((timeline: string | undefined) => {
  const [count, grouping] = (timeline || DEFAULT_TIMELINE).split("-") as [string, "month" | "year"];
  return transactionDataForReporting({
    type: `by-${grouping}`,
    count: Number(count),
  });
}, "transactionsForReport");

export const route: RouteDefinition = {
  load(args) {
    void getAllCategoriesForReport();
    void getTransactionsForReport(args.location.query.timeline);
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

function addInLines(
  intervals: Awaited<ReturnType<typeof transactionDataForReporting>>["intervals"],
  currencyStrat: Strategy,
  isIgnoredLookup: Set<string>,
) {
  const usd = {
    label: "Total USD",
    type: "line" as const,
    order: -1,
    data: intervals.labels.map((intervalLabel, index) => {
      return intervals.categories.reduce((accum, { category, usd }) => {
        if (isIgnoredLookup.has(category.id)) {
          return accum;
        }
        const at = usd[index] || { spend: 0, income: 0 };
        return accum + at.spend - at.income;
      }, 0);
    }),
  };
  const euro = {
    label: "Total Euro",
    type: "line" as const,
    order: -1,
    data: intervals.labels.map((intervalLabel, index) => {
      return intervals.categories.reduce((accum, { category, euro }) => {
        if (isIgnoredLookup.has(category.id)) {
          return accum;
        }
        const at = euro[index] || { spend: 0, income: 0 };
        return accum + at.spend - at.income;
      }, 0);
    }),
  };
  return currencyStrat === "merged-usd"
    ? [{ ...usd, data: zipEuroIntoUsd({ usd: usd.data, euro: euro.data }) }]
    : currencyStrat === "merged-euro"
      ? [{ ...euro, data: zipUsdIntoEuro({ usd: usd.data, euro: euro.data }) }]
      : [usd, euro];
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

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reportTransactions = createAsync(() => getTransactionsForReport(searchParams.timeline));
  const allCategories = createAsync(() => getAllCategoriesForReport());

  const [currencyStrategy, setCurrencyStrategy] = createSignal<Strategy>("merged-usd");

  const [ignored, setIgnored] = createSignal(new Set<string>());
  const toggleIgnore = (categoryId: string, event: MouseEvent) => {
    const ctrlClicked = Boolean(event.ctrlKey || event.metaKey);
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

  const graphData = createMemo(() => {
    const rawData = reportTransactions();
    if (!rawData) {
      return null;
    }
    const isIgnoredLookup = ignored();
    const currencyStrat = currencyStrategy();
    const categoryDatasets = rawData.intervals.categories.flatMap(({ category, euro, usd }) => {
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
          label: `€ ${category.name}`,
          type: "bar" as const,
          stack: "euro",
          data: euroData,
          backgroundColor,
          hidden,
        },
        {
          label: `$ ${category.name}`,
          type: "bar" as const,
          stack: "usd",
          data: usdData,
          backgroundColor,
          hidden,
        },
      ];
    });
    const datasets = (
      categoryDatasets as (
        | (typeof categoryDatasets)[number]
        | ReturnType<typeof addInLines>[number]
      )[]
    ).concat(addInLines(rawData.intervals, currencyStrat, isIgnoredLookup));
    return { labels: rawData.intervals.labels, datasets };
  });

  const allCategoriesWithSums = createMemo(() => {
    const reportingTransactions = reportTransactions();
    if (!reportingTransactions) {
      return undefined;
    }
    return allCategories()?.map((category) => ({
      category,
      sums: reportingTransactions.sums.categories.find((c) => c.category.id === category.id),
    }));
  });

  return (
    <>
      <KbfSiteTitle>Dashboard</KbfSiteTitle>
      <h1>Dashboard</h1>
      <header class="my-8 flex items-center justify-between">
        <TabGroup
          class="w-[min(45%,500px)]"
          items={[
            { label: "6 Months", value: "6-month" },
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
      </header>
      <Show when={graphData()}>
        {(data) => (
          <>
            <BarChart class="mb-12 h-[clamp(500px,70vh,900px)]" data={data()} />

            <h2 class="mb-4">Totals</h2>
            <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <For each={allCategoriesWithSums()}>
                {({ category, sums }) => (
                  <div
                    class={clx(
                      "flex flex-col justify-between gap-7 rounded bg-kbf-light-purple p-3 transition-opacity duration-300",
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
          </>
        )}
      </Show>
    </>
  );
}
