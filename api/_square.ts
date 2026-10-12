/* Square REST helper shared by the functions. SQUARE_ENV is "sandbox" by default, "production" for real money. */
export const SQUARE_API = process.env.SQUARE_ENV === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
export const SQUARE_VERSION = '2025-01-23';

export const squareReady = () => !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);

export interface SquareResult { ok: boolean; status: number; data: any }

export async function square(path: string, init: { method?: string; body?: unknown } = {}): Promise<SquareResult> {
  const res = await fetch(`${SQUARE_API}${path}`, {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`, 'Square-Version': SQUARE_VERSION, 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

/** "CODE: detail; CODE: detail" from a Square error body, for logs and the calendar_error column. */
export const squareErrors = (r: SquareResult) =>
  (Array.isArray(r.data?.errors) ? r.data.errors.map((e: { code?: string; detail?: string }) => `${e.code ?? 'ERROR'}: ${e.detail ?? ''}`.trim()).join('; ') : '') || `HTTP ${r.status}`;
