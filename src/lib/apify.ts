/**
 * Thin wrapper around the Apify REST API.
 *
 * We use Apify's hosted Actors to scrape review data from Yelp / Google Maps
 * because:
 *   - Yelp's Fusion API is frozen to existing partners (no new access)
 *   - Google Places API caps at 5 reviews per place
 *   - Writing our own scrapers is brittle and gets blocked constantly
 *
 * Actors used:
 *   - `compass/Google-Maps-Reviews-Scraper` (~$0.0006/review)
 *   - `tri_angle/yelp-review-scraper`       (~$0.001/review)
 *
 * Env: APIFY_API_TOKEN — get from https://console.apify.com/settings/integrations
 */

const APIFY_BASE = 'https://api.apify.com/v2';

function token(): string {
  const t = process.env.APIFY_API_TOKEN;
  if (!t) throw new Error('APIFY_API_TOKEN is not set');
  return t;
}

function actorSlug(fullName: string): string {
  // Apify REST API wants "username~actor-name" — convert "username/actor-name"
  return fullName.replace('/', '~');
}

export type ApifyPlatform = 'yelp' | 'google';

export const ACTORS: Record<ApifyPlatform, string> = {
  yelp: 'web_wanderer/yelp-reviews-scraper',
  google: 'compass/Google-Maps-Reviews-Scraper',
};

export interface ApifyRunStart {
  runId: string;
  datasetId: string;
  status: string;
}

/**
 * Kick off a scraper run. Returns immediately with the run id — the scrape
 * happens in the background on Apify's infra.
 */
export async function startRun(
  platform: ApifyPlatform,
  url: string,
  opts: { maxReviews?: number } = {}
): Promise<ApifyRunStart> {
  const actor = ACTORS[platform];
  const maxReviews = opts.maxReviews ?? 50;

  const input =
    platform === 'yelp'
      ? {
          biz_urls: [url],
          reviews_limit: maxReviews,
          include_personal_data: true,
          reviews_sort: 'newest',
          reviews_language: 'en',
          domain: 'www.yelp.com',
        }
      : {
          startUrls: [{ url }],
          maxReviews,
          reviewsSort: 'newest',
          language: 'en',
          reviewsOrigin: 'google',
          personalData: true,
        };

  const res = await fetch(
    `${APIFY_BASE}/acts/${actorSlug(actor)}/runs?token=${token()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );

  if (!res.ok) {
    throw new Error(`Apify start failed: ${res.status} ${await res.text()}`);
  }

  const { data } = await res.json();
  return {
    runId: data.id,
    datasetId: data.defaultDatasetId,
    status: data.status,
  };
}

/**
 * Check the status of a run. Statuses: READY | RUNNING | SUCCEEDED | FAILED | ABORTED | TIMED-OUT
 */
export async function getRunStatus(runId: string): Promise<{
  status: string;
  datasetId: string;
  finishedAt?: string;
}> {
  const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token()}`);
  if (!res.ok) throw new Error(`Apify status failed: ${res.status}`);
  const { data } = await res.json();
  return {
    status: data.status,
    datasetId: data.defaultDatasetId,
    finishedAt: data.finishedAt,
  };
}

/**
 * Pull the dataset items (the actual scraped reviews).
 */
export async function getDatasetItems<T = Record<string, unknown>>(
  datasetId: string
): Promise<T[]> {
  const res = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${token()}&clean=true&format=json`
  );
  if (!res.ok) throw new Error(`Apify dataset failed: ${res.status}`);
  return res.json();
}

// -----------------------------------------------------------------------------
// Row transformers — each platform's Actor returns different shapes; we
// normalize them into our `reviews` table columns.
// -----------------------------------------------------------------------------

export interface NormalizedReview {
  external_id: string;
  platform: 'yelp' | 'google';
  author: string;
  rating: number;
  text: string;
  review_date: string | null;
  reviewer_photo_url: string | null;
  review_url: string | null;
  source_url: string;
}

// Yelp Actor row shape (seen in web_wanderer/yelp-reviews-scraper output):
// { reviewEncid, rating, text, reviewDate, author: { name, profile_photo, review_count, ... }, alias, encid, ... }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeYelp(row: any, sourceUrl: string): NormalizedReview | null {
  const id = row.reviewEncid || row.reviewId || row.id;
  if (!id) return null;
  const alias = row.alias;
  const reviewUrl = alias && id ? `https://www.yelp.com/biz/${alias}?hrid=${id}` : null;
  return {
    external_id: String(id),
    platform: 'yelp',
    author: row.author?.name || row.reviewerName || 'Anonymous',
    rating: Number(row.rating) || 0,
    text: row.text || row.translatedText || row.content || '',
    review_date: row.reviewDate || row.dateCreated || row.date || null,
    reviewer_photo_url: row.author?.profile_photo || row.reviewerPhotoUrl || null,
    review_url: reviewUrl,
    source_url: sourceUrl,
  };
}

// Google Maps Reviews Actor row shape (seen in compass/Google-Maps-Reviews-Scraper output):
// { reviewId, name, stars, text, publishedAtDate, reviewerPhotoUrl, reviewUrl, placeId, ... }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeGoogle(row: any, sourceUrl: string): NormalizedReview | null {
  const id = row.reviewId || row.reviewerId + '_' + row.publishedAtDate;
  if (!id) return null;
  return {
    external_id: String(id),
    platform: 'google',
    author: row.name || row.reviewerName || 'Anonymous',
    rating: Number(row.stars) || 0,
    text: row.text || row.textTranslated || '',
    review_date: row.publishedAtDate || null,
    reviewer_photo_url: row.reviewerPhotoUrl || null,
    review_url: row.reviewUrl || null,
    source_url: sourceUrl,
  };
}
