/**
 * Thin wrapper around the Square REST API.
 *
 * Covers the pieces SeatSignals needs today:
 *   - OAuth: build authorize URL, exchange code for tokens, refresh tokens
 *   - Catalog API: list all items in a merchant's catalog
 *
 * Orders / Inventory / Customers will be added in subsequent phases.
 *
 * Env:
 *   SQUARE_APPLICATION_ID        — public, used in OAuth URL
 *   SQUARE_APPLICATION_SECRET    — secret, used to exchange OAuth code for tokens
 *   SQUARE_ENVIRONMENT           — "sandbox" (default) or "production"
 *   SQUARE_REDIRECT_URL          — override for OAuth callback; defaults to derived from NEXT_PUBLIC_APP_URL
 */

export type SquareEnv = 'sandbox' | 'production';

function env(): SquareEnv {
  const e = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase();
  return e === 'production' ? 'production' : 'sandbox';
}

function connectBase(): string {
  return env() === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

function apiBase(): string {
  return connectBase();
}

function appId(): string {
  // Environment-aware: SQUARE_APPLICATION_ID_PROD takes precedence in production,
  // falls back to SQUARE_APPLICATION_ID for sandbox. Stray whitespace is trimmed
  // because CLI tools often pipe in a trailing newline.
  const id = env() === 'production'
    ? (process.env.SQUARE_APPLICATION_ID_PROD?.trim() || process.env.SQUARE_APPLICATION_ID?.trim())
    : process.env.SQUARE_APPLICATION_ID?.trim();
  if (!id) throw new Error(`SQUARE_APPLICATION_ID${env() === 'production' ? '_PROD' : ''} is not set`);
  return id;
}

function appSecret(): string {
  const s = env() === 'production'
    ? (process.env.SQUARE_APPLICATION_SECRET_PROD?.trim() || process.env.SQUARE_APPLICATION_SECRET?.trim())
    : process.env.SQUARE_APPLICATION_SECRET?.trim();
  if (!s) throw new Error(`SQUARE_APPLICATION_SECRET${env() === 'production' ? '_PROD' : ''} is not set`);
  return s;
}

function redirectUrl(): string {
  if (process.env.SQUARE_REDIRECT_URL) return process.env.SQUARE_REDIRECT_URL.trim();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : 'http://localhost:3000');
  return `${appUrl}/api/integrations/square/callback`;
}

// -----------------------------------------------------------------------------
// OAuth
// -----------------------------------------------------------------------------

/** Scopes we request from the merchant. Read-only for the MVP. */
export const DEFAULT_SCOPES = [
  'MERCHANT_PROFILE_READ',
  'ITEMS_READ',
  'ORDERS_READ',
  'PAYMENTS_READ',
  'CUSTOMERS_READ',
  'INVENTORY_READ',
  'EMPLOYEES_READ',
];

/** Build the URL we redirect the merchant to for OAuth authorization. */
export function buildAuthorizeUrl(params: { state: string; scopes?: string[] }): string {
  const scopes = params.scopes || DEFAULT_SCOPES;
  const url = new URL(`${connectBase()}/oauth2/authorize`);
  url.searchParams.set('client_id', appId());
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('session', 'false');
  url.searchParams.set('state', params.state);
  url.searchParams.set('redirect_uri', redirectUrl());
  return url.toString();
}

export interface SquareOAuthToken {
  access_token: string;
  refresh_token: string;
  merchant_id: string;
  expires_at: string; // ISO
  token_type: string;
  scope?: string;
}

/** Exchange the `code` returned on the callback for a long-lived token pair.
 *  Square's /oauth2/token requires `redirect_uri` in the body — it must EXACTLY
 *  match the one sent in the authorize URL (else you get MISSING_REQUIRED_PARAMETER). */
export async function exchangeCodeForToken(code: string): Promise<SquareOAuthToken> {
  const res = await fetch(`${connectBase()}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Square-Version': '2024-10-17',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: appId(),
      client_secret: appSecret(),
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUrl(),
    }),
  });
  if (!res.ok) {
    throw new Error(`Square token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as SquareOAuthToken;
}

/** Swap a refresh_token for a fresh access_token. */
export async function refreshAccessToken(refreshToken: string): Promise<SquareOAuthToken> {
  const res = await fetch(`${connectBase()}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Square-Version': '2024-10-17',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: appId(),
      client_secret: appSecret(),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Square token refresh failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as SquareOAuthToken;
}

// -----------------------------------------------------------------------------
// Catalog API
// -----------------------------------------------------------------------------

// Square catalog objects are polymorphic; we only model the bits we use.
// Full schema: https://developer.squareup.com/reference/square/catalog-api
export interface SquareCatalogObject {
  id: string;
  type: string; // ITEM | ITEM_VARIATION | CATEGORY | ...
  updated_at?: string;
  is_deleted?: boolean;
  item_data?: {
    name: string;
    description?: string;
    category_id?: string;
    variations?: SquareCatalogObject[];
    image_ids?: string[];
  };
  item_variation_data?: {
    name?: string;
    sku?: string;
    price_money?: { amount: number; currency: string };
    pricing_type?: string; // FIXED_PRICING | VARIABLE_PRICING
  };
  category_data?: { name: string };
  image_data?: { url?: string; caption?: string };
}

interface ListCatalogResponse {
  objects?: SquareCatalogObject[];
  cursor?: string;
  errors?: Array<{ code: string; detail?: string }>;
}

/**
 * List every catalog object for a merchant. Handles pagination.
 * `types` filters what we pull back — we grab ITEM, ITEM_VARIATION, CATEGORY, IMAGE
 * so we can stitch the tree together.
 */
export async function listCatalog(
  accessToken: string,
  types: string[] = ['ITEM', 'ITEM_VARIATION', 'CATEGORY', 'IMAGE']
): Promise<SquareCatalogObject[]> {
  const out: SquareCatalogObject[] = [];
  let cursor: string | undefined;
  const typesParam = types.join(',');

  do {
    const url = new URL(`${apiBase()}/v2/catalog/list`);
    url.searchParams.set('types', typesParam);
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString(), {
      headers: {
        'Square-Version': '2024-10-17',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Square list catalog failed: ${res.status} ${await res.text()}`);
    }
    const body = (await res.json()) as ListCatalogResponse;
    if (body.errors?.length) {
      throw new Error(`Square list catalog error: ${body.errors[0].detail || body.errors[0].code}`);
    }
    out.push(...(body.objects || []));
    cursor = body.cursor;
  } while (cursor);

  return out;
}

// -----------------------------------------------------------------------------
// Locations API — Orders API requires location_ids, so we fetch them first.
// -----------------------------------------------------------------------------

export interface SquareLocation {
  id: string;
  name?: string;
  status?: string;
  currency?: string;
  timezone?: string;
}

export async function listLocations(accessToken: string): Promise<SquareLocation[]> {
  const res = await fetch(`${apiBase()}/v2/locations`, {
    headers: {
      'Square-Version': '2024-10-17',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Square list locations failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { locations?: SquareLocation[] };
  return body.locations || [];
}

// -----------------------------------------------------------------------------
// Orders API
// -----------------------------------------------------------------------------

// Square Order shape — polymorphic, we only model the bits we use.
// Full schema: https://developer.squareup.com/reference/square/orders-api
export interface SquareOrder {
  id: string;
  location_id: string;
  state?: string;                // OPEN | COMPLETED | CANCELED | DRAFT
  source?: { name?: string };
  customer_id?: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  total_money?: { amount: number; currency: string };
  total_tax_money?: { amount: number; currency: string };
  total_tip_money?: { amount: number; currency: string };
  total_discount_money?: { amount: number; currency: string };
  line_items?: Array<{
    uid?: string;
    name?: string;
    quantity?: string;
    catalog_object_id?: string;
    variation_name?: string;
    base_price_money?: { amount: number; currency: string };
    total_money?: { amount: number; currency: string };
  }>;
  // Team-member IDs come through `tenders[].employee_id` historically, and on
  // newer orders via `fulfillments[].pickup_details.recipient` — in practice we
  // look at the first tender's employee for leaderboard attribution.
  tenders?: Array<{ employee_id?: string; team_member_id?: string }>;
}

interface SearchOrdersResponse {
  orders?: SquareOrder[];
  cursor?: string;
  errors?: Array<{ code: string; detail?: string }>;
}

/**
 * Pull orders for the given locations since `sinceIso`. Square's search API
 * caps at 500 per page; we paginate via cursor. Returns ALL orders.
 */
export async function searchOrders(
  accessToken: string,
  locationIds: string[],
  sinceIso: string
): Promise<SquareOrder[]> {
  const out: SquareOrder[] = [];
  let cursor: string | undefined;
  let guard = 0;

  do {
    const body: Record<string, unknown> = {
      location_ids: locationIds,
      query: {
        filter: {
          date_time_filter: {
            created_at: { start_at: sinceIso },
          },
          state_filter: { states: ['OPEN', 'COMPLETED'] },
        },
        sort: { sort_field: 'CREATED_AT', sort_order: 'DESC' },
      },
      limit: 500,
    };
    if (cursor) body.cursor = cursor;

    const res = await fetch(`${apiBase()}/v2/orders/search`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-10-17',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Square search orders failed: ${res.status} ${await res.text()}`);
    }
    const parsed = (await res.json()) as SearchOrdersResponse;
    if (parsed.errors?.length) {
      throw new Error(`Square search orders error: ${parsed.errors[0].detail || parsed.errors[0].code}`);
    }
    out.push(...(parsed.orders || []));
    cursor = parsed.cursor;

    // Safety: 50 pages × 500 = 25k orders. More than enough per sync window.
    if (++guard > 50) break;
  } while (cursor);

  return out;
}

export interface NormalizedOrder {
  external_id: string;
  location_id: string | null;
  state: string | null;
  source_name: string | null;
  employee_id: string | null;
  customer_external_id: string | null;
  total_cents: number;
  tax_cents: number;
  tip_cents: number;
  discount_cents: number;
  currency: string;
  item_count: number;
  opened_at: string | null;
  closed_at: string | null;
  raw: SquareOrder;
  line_items: NormalizedLineItem[];
}

export interface NormalizedLineItem {
  catalog_external_id: string | null;
  variation_external_id: string | null;
  name: string | null;
  quantity: number;
  base_price_cents: number | null;
  total_price_cents: number;
  raw: SquareOrder['line_items'] extends Array<infer T> | undefined ? T : never;
}

/** Coerce a Square Order into row-ready shape for pos_orders + pos_order_line_items. */
export function normalizeOrder(o: SquareOrder): NormalizedOrder {
  const tender = o.tenders?.[0];
  const lines = (o.line_items || []).map((li) => ({
    catalog_external_id: li.catalog_object_id || null,
    variation_external_id: null,
    name: li.name || null,
    quantity: Number(li.quantity) || 1,
    base_price_cents: li.base_price_money?.amount ?? null,
    total_price_cents: li.total_money?.amount ?? 0,
    raw: li,
  })) as NormalizedLineItem[];

  return {
    external_id: o.id,
    location_id: o.location_id || null,
    state: o.state || null,
    source_name: o.source?.name || null,
    employee_id: tender?.team_member_id || tender?.employee_id || null,
    customer_external_id: o.customer_id || null,
    total_cents: o.total_money?.amount ?? 0,
    tax_cents: o.total_tax_money?.amount ?? 0,
    tip_cents: o.total_tip_money?.amount ?? 0,
    discount_cents: o.total_discount_money?.amount ?? 0,
    currency: o.total_money?.currency || 'USD',
    item_count: lines.reduce((s, l) => s + l.quantity, 0),
    opened_at: o.created_at || null,
    closed_at: o.closed_at || null,
    raw: o,
    line_items: lines,
  };
}

// -----------------------------------------------------------------------------
// Catalog → normalized rows for pos_catalog_items
// -----------------------------------------------------------------------------

export interface NormalizedCatalogItem {
  external_id: string;
  name: string;
  description: string | null;
  category: string | null;
  price_cents: number | null;
  currency: string;
  sku: string | null;
  image_url: string | null;
  is_active: boolean;
  raw: SquareCatalogObject;
}

/**
 * Square returns catalog as a flat list of polymorphic objects. We reduce it
 * to one row per ITEM, using the first variation for SKU/price and joining
 * category name + image URL by id.
 */
export function normalizeCatalog(objects: SquareCatalogObject[]): NormalizedCatalogItem[] {
  const categoryById = new Map<string, string>();
  const imageUrlById = new Map<string, string>();
  for (const o of objects) {
    if (o.type === 'CATEGORY' && o.category_data?.name) {
      categoryById.set(o.id, o.category_data.name);
    } else if (o.type === 'IMAGE' && o.image_data?.url) {
      imageUrlById.set(o.id, o.image_data.url);
    }
  }

  const items: NormalizedCatalogItem[] = [];
  for (const o of objects) {
    if (o.type !== 'ITEM' || o.is_deleted || !o.item_data) continue;
    const d = o.item_data;
    const firstVar = d.variations?.[0]?.item_variation_data;
    const price = firstVar?.price_money;
    const imageId = d.image_ids?.[0];
    items.push({
      external_id: o.id,
      name: d.name || 'Untitled',
      description: d.description || null,
      category: d.category_id ? categoryById.get(d.category_id) || null : null,
      price_cents: price?.amount != null ? Number(price.amount) : null,
      currency: price?.currency || 'USD',
      sku: firstVar?.sku || null,
      image_url: imageId ? imageUrlById.get(imageId) || null : null,
      is_active: true,
      raw: o,
    });
  }
  return items;
}
