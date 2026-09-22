export function parseDateRange(from?: string, to?: string) {
  return {
    ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
    ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
  };
}

export function textSearch(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? { contains: trimmed, mode: "insensitive" as const } : undefined;
}
