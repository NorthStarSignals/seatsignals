/**
 * Thin wrapper around the Klaviyo REST API (2024-10-15 revision).
 *
 * Auth: Klaviyo uses a "Private API Key" (starts with `pk_`) passed as
 * `Authorization: Klaviyo-API-Key ...`. No OAuth dance required — merchants
 * copy the key from their Klaviyo account settings.
 *
 * Docs: https://developers.klaviyo.com/en/reference/api_overview
 */

const BASE = 'https://a.klaviyo.com/api';
const REVISION = '2024-10-15';

function authHeaders(apiKey: string) {
  return {
    Authorization: `Klaviyo-API-Key ${apiKey.trim()}`,
    Accept: 'application/json',
    revision: REVISION,
  };
}

async function klaviyoFetch<T>(apiKey: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...authHeaders(apiKey),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Klaviyo ${path} ${res.status}: ${body.slice(0, 400)}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Account — used to validate the API key on connect
// ---------------------------------------------------------------------------

export interface KlaviyoAccount {
  id: string;
  test_account: boolean;
  contact_information?: { organization_name?: string };
  public_api_key?: string;
}

interface AccountsResponse {
  data: Array<{
    id: string;
    type: string;
    attributes: {
      test_account?: boolean;
      contact_information?: { organization_name?: string };
      public_api_key?: string;
    };
  }>;
}

/** Fetch the account tied to this API key. Errors if the key is invalid. */
export async function getAccount(apiKey: string): Promise<KlaviyoAccount> {
  const body = await klaviyoFetch<AccountsResponse>(apiKey, '/accounts/');
  const first = body.data?.[0];
  if (!first) throw new Error('Klaviyo returned no accounts for this key');
  return {
    id: first.id,
    test_account: first.attributes.test_account ?? false,
    contact_information: first.attributes.contact_information,
    public_api_key: first.attributes.public_api_key,
  };
}

// ---------------------------------------------------------------------------
// Lists (audiences)
// ---------------------------------------------------------------------------

export interface KlaviyoList {
  id: string;
  name: string;
  created: string;
  updated: string;
  profile_count?: number;
}

interface ListsResponse {
  data: Array<{
    id: string;
    attributes: { name: string; created: string; updated: string };
  }>;
  links?: { next?: string };
}

/** Page through every list in the account. */
export async function listLists(apiKey: string): Promise<KlaviyoList[]> {
  const out: KlaviyoList[] = [];
  let path: string | undefined = '/lists/';
  let guard = 0;

  while (path && guard++ < 50) {
    const body: ListsResponse = await klaviyoFetch<ListsResponse>(apiKey, path);
    for (const d of body.data) {
      out.push({
        id: d.id,
        name: d.attributes.name,
        created: d.attributes.created,
        updated: d.attributes.updated,
      });
    }
    // Klaviyo returns absolute URLs in `links.next`. Convert to path.
    const next = body.links?.next;
    path = next ? next.replace(BASE, '') : undefined;
  }
  return out;
}

/** Count profiles in a specific list — costs one API call per list. */
export async function getListProfileCount(apiKey: string, listId: string): Promise<number> {
  const body = await klaviyoFetch<{ data: { id: string }[]; links?: { next?: string } }>(
    apiKey,
    `/lists/${listId}/profiles/?page[size]=1&fields[profile]=id`
  );
  // Klaviyo doesn't return a total count directly. For MVP, we'll report the
  // first-page length. Users can see the real number in Klaviyo's UI.
  return body.data?.length || 0;
}

// ---------------------------------------------------------------------------
// Profile count across the whole account — cheap single call
// ---------------------------------------------------------------------------

export async function getTotalProfileCount(apiKey: string): Promise<number | null> {
  // Klaviyo offers an Aggregations endpoint but it's heavier. For MVP, return
  // null and let the UI say "See Klaviyo for exact count".
  try {
    const body = await klaviyoFetch<{ data: { id: string }[]; links?: { next?: string } }>(
      apiKey,
      '/profiles/?page[size]=1&fields[profile]=id'
    );
    // If there's no next link, that's actually the only profile.
    return body.data?.length || 0;
  } catch {
    return null;
  }
}
