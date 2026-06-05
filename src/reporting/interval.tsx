import {
  eachYearOfInterval,
  subMonths,
  subYears,
  eachMonthOfInterval,
  isSameMonth,
  endOfMonth,
  format,
  isSameYear,
  startOfYear,
  endOfYear,
} from "date-fns";

import { localizeDate } from "~/date";

type Predicate = (when: string) => boolean;
export type Interval = {
  labels: string[];
  queryFilters: {
    onOrBefore?: string;
    onOrAfter: string;
  };
  groupDataInto<T>(mapFn: (matches: Predicate, index: number) => T): T[];
  predicates(): Generator<Predicate, unknown, unknown>;
};
type ByOptions = { type: "by-month" | "by-year"; count: number; includeCurrent?: boolean };
export type Options = { type: "year-to-date-by-month"; includeCurrent?: boolean } | ByOptions;

function getDatesOfIntervalBy(
  now: Date,
  options: ByOptions,
  factory: (params: { start: Date; end: Date }) => Date[],
  subFn: (date: Date, operand: number) => Date,
) {
  const end = options.includeCurrent ? now : subFn(now, 1);
  return factory({
    start: subFn(end, options.count - 1),
    end,
  });
}

function getDatesOfInterval(now: Date, options: Options): Date[] {
  switch (options.type) {
    case "year-to-date-by-month": {
      const referenceDate = options.includeCurrent ? now : subMonths(now, 1);
      return eachMonthOfInterval({
        start: startOfYear(referenceDate),
        end: referenceDate,
      });
    }
    case "by-month":
      return getDatesOfIntervalBy(now, options, eachMonthOfInterval, subMonths);
    case "by-year":
      return getDatesOfIntervalBy(now, options, eachYearOfInterval, subYears);
  }
}

function getFormatTemplate(options: Options): string {
  switch (options.type) {
    case "year-to-date-by-month":
      return "MMMM";
    case "by-month":
      return "MMM yyyy";
    case "by-year":
      return "yyyy";
  }
}

function toQueryDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function getQueryFiltersFor(options: Options, dates: Date[]) {
  // Intervals from date-fns are already the "start" of interval steps, but we want
  // for queries to be the end of the range.
  let endDate = dates.at(-1)!;
  switch (options.type) {
    case "year-to-date-by-month":
    case "by-month":
      endDate = endOfMonth(endDate);
    case "by-year":
      endDate = endOfYear(endDate);
  }
  return {
    onOrBefore: toQueryDate(endDate),
    onOrAfter: toQueryDate(dates[0]!),
  };
}

export function makeInterval(options: Options): Interval {
  const now = new Date();
  const datesOfInterval = getDatesOfInterval(now, options);
  const formatTemplate = getFormatTemplate(options);
  const matches = options.type === "by-year" ? isSameYear : isSameMonth;

  function* predicates() {
    for (const date of datesOfInterval) {
      yield (when: string) => matches(date, localizeDate(when));
    }
  }

  return {
    labels: datesOfInterval.map((date) => format(date, formatTemplate)),
    queryFilters: getQueryFiltersFor(options, datesOfInterval),
    predicates,
    groupDataInto(mapFn) {
      return Array.from(predicates()).map(mapFn);
    },
  };
}
