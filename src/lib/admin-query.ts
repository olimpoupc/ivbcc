export type AdminListSearchParams = Record<string, string | string[] | undefined>;

export function getParam(params: AdminListSearchParams | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export function getPageParam(
  params: AdminListSearchParams | undefined,
  key: string = "page"
) {
  const raw = Number(getParam(params, key));
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
}

export function buildListHref(
  pathname: string,
  params: Record<string, string | undefined>
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getPageRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}
