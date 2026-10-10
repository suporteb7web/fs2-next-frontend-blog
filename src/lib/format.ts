const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
});

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

export function likesLabel(count: number): string {
  return count === 1 ? "1 curtida" : `${count} curtidas`;
}

export function parsePage(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) return 1;
  return parsePositiveInt(raw);
}

export function parsePostId(value: string): number | null {
  return parsePositiveInt(value);
}

function parsePositiveInt(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
