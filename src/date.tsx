/** Given a date (no time), ensure its localized as that date in JS `Date` */
export function localizeDate(value: string): Date {
  return new Date(`${value}T00:00:00.000`);
}
