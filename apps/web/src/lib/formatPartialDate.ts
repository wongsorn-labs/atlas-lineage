interface PartialDate {
  year: number | null;
  month?: number | null;
  day?: number | null;
  time?: string | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatPartialDate({ year, month, day, time }: PartialDate): string {
  if (year == null) return '';
  let result = String(year);
  if (month != null) {
    result = day != null ? `${pad(day)}/${pad(month)}/${year}` : `${pad(month)}/${year}`;
  }
  if (time) result += ` ${time.slice(0, 5)}`;
  return result;
}
