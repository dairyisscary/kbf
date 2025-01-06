import { parse as csvParse } from "csv-parse/sync";

type RawRow = Record<string, string | undefined>;

const ISO_DATE_REGEX = /^\d\d\d\d-\d\d-\d\d/;
const CURRENCY_CHARS_REGEX = /[$,€]/g;

function marshalDate(row: RawRow) {
  // Date key is Wise all currencies, Fidelity, and Bunq
  const baseDate = row["Date"];
  // Transaction Date key is Chase
  const rawDate = baseDate || row["Transaction Date"];
  if (!rawDate) {
    return null;
  }

  // Bunq and Fideltiy are just ISO.
  const isoMatch = rawDate.match(ISO_DATE_REGEX);
  if (isoMatch) {
    return isoMatch[0];
  }

  // US localized month/day/year
  const slashSplit = rawDate.split("/");
  if (slashSplit.length >= 3) {
    return `${slashSplit[2]!}-${slashSplit[0]!}-${slashSplit[1]!}`;
  }

  const dashSplit = rawDate.split("-");
  // For Date keyed values, assume day-month-year, otherwise assume US
  if (dashSplit.length >= 3) {
    return `${dashSplit[2]!}-${dashSplit[1]!}-${dashSplit[0]!}`;
  }

  return null;
}

function marshalDescription(rawRow: RawRow) {
  // Chase and Wise are Description
  // Bunq has both Description and Name, so Name is higher presedence
  // Fidelity is Name
  return rawRow["Name"] || rawRow["Description"] || null;
}

function marshalAmount(rawRow: RawRow) {
  const raw = rawRow["Amount"]?.replace(CURRENCY_CHARS_REGEX, "");
  if (!raw) {
    return null;
  }
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

function marshalRow(rawRow: RawRow) {
  const when = marshalDate(rawRow);
  if (!when) {
    return null;
  }

  const description = marshalDescription(rawRow);
  if (!description) {
    return null;
  }

  const amount = marshalAmount(rawRow);
  // Zero amount falsy but that's okay. Transactions shouldn't be zero amount
  if (!amount) {
    return null;
  }

  return { when, description, amount };
}

export function parse(csv: string) {
  const rawParsed = csvParse(csv, {
    columns: true,
    trim: true,
    skip_empty_lines: true,
  }) as RawRow[];
  return rawParsed.map(marshalRow).filter(Boolean);
}
