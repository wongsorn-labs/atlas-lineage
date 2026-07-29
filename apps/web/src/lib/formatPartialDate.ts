interface PartialDate {
  year: number | null;
  month?: number | null;
  day?: number | null;
  time?: string | null;
  buddhistEra?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

export const toBuddhistYear = (year: number) => year + 543;
export const toGregorianYear = (year: number) => year - 543;

export function formatPartialDate({ year, month, day, time, buddhistEra }: PartialDate): string {
  if (year == null) return '';
  const displayYear = buddhistEra ? toBuddhistYear(year) : year;
  let result = String(displayYear);
  if (month != null) {
    result = day != null ? `${pad(day)}/${pad(month)}/${displayYear}` : `${pad(month)}/${displayYear}`;
  }
  if (time) result += ` ${time.slice(0, 5)}`;
  return result;
}
