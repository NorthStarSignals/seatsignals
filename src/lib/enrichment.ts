import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabase } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ApifySearchResult {
  title?: string;
  url?: string;
  description?: string;
}

interface ApifyResponseItem {
  organicResults?: ApifySearchResult[];
}

interface EnrichmentResult {
  company?: string;
  job_title?: string;
  linkedin_url?: string;
  instagram_handle?: string;
  twitter_handle?: string;
}

export async function enrichCustomer(customerId: string): Promise<EnrichmentResult> {
  const supabase = createServerSupabase();

  // a) Fetch the customer record
  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select('customer_id, email, first_name, enriched_at')
    .eq('customer_id', customerId)
    .single();

  if (fetchError || !customer) {
    console.error('[Enrichment] Customer not found:', customerId, fetchError?.message);
    return {};
  }

  // b) Skip if enriched within the last 30 days
  if (customer.enriched_at) {
    const enrichedAt = new Date(customer.enriched_at as string);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (enrichedAt > thirtyDaysAgo) {
      console.log('[Enrichment] Customer recently enriched, skipping:', customerId);
      return {};
    }
  }

  if (!customer.email) {
    console.log('[Enrichment] No email for customer, skipping:', customerId);
    return {};
  }

  // c) Call Apify Google Search Scraper
  const searchResults: ApifySearchResult[] = [];
  try {
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      throw new Error('APIFY_API_TOKEN not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    let apifyRes: Response;
    try {
      apifyRes = await fetch(
        `https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queries: customer.email,
            maxPagesPerQuery: 1,
            resultsPerPage: 10,
            languageCode: 'en',
            countryCode: 'us',
          }),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!apifyRes.ok) {
      throw new Error(`Apify returned status ${apifyRes.status}`);
    }

    const apifyData = (await apifyRes.json()) as ApifyResponseItem[];

    // Extract organic results from the response
    for (const item of apifyData) {
      if (item.organicResults && Array.isArray(item.organicResults)) {
        for (const result of item.organicResults) {
          if (result.title || result.url || result.description) {
            searchResults.push({
              title: result.title,
              url: result.url,
              description: result.description,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[Enrichment] Apify search failed:', err instanceof Error ? err.message : err);
    return {};
  }

  if (searchResults.length === 0) {
    console.log('[Enrichment] No search results from Apify for:', customer.email);
    // Still update enriched_at so we don't retry immediately
    await supabase
      .from('customers')
      .update({ enriched_at: new Date().toISOString(), enrichment_data: {} })
      .eq('customer_id', customerId);
    return {};
  }

  // d) Send results to Claude to extract structured data
  let enrichmentResult: EnrichmentResult = {};
  try {
    const prompt = `Extract any personal information about this person from these Google search results.
The person's name is: ${customer.first_name ?? ''}
Their email is: ${customer.email}

Search results:
${JSON.stringify(searchResults)}

Return a JSON object with ONLY fields you can confidently identify:
{
  "company": "their employer or business",
  "job_title": "their job title",
  "linkedin_url": "full LinkedIn profile URL",
  "instagram_handle": "Instagram username without @",
  "twitter_handle": "Twitter/X username without @"
}

Only include fields where you have high confidence. Return empty object {} if nothing is found.
Return ONLY the JSON, no explanation.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    // e) Parse Claude's response as JSON
    const content = message.content[0];
    if (content.type === 'text') {
      const raw = content.text.trim();
      // Strip markdown code fences if present
      const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      enrichmentResult = JSON.parse(jsonText) as EnrichmentResult;
    }
  } catch (err) {
    console.error('[Enrichment] Claude extraction failed:', err instanceof Error ? err.message : err);
    // Fall through — we'll still mark enriched_at so we don't retry constantly
  }

  // f) Update the customer record
  try {
    await supabase
      .from('customers')
      .update({
        ...(enrichmentResult.company !== undefined && { company: enrichmentResult.company }),
        ...(enrichmentResult.job_title !== undefined && { job_title: enrichmentResult.job_title }),
        ...(enrichmentResult.linkedin_url !== undefined && { linkedin_url: enrichmentResult.linkedin_url }),
        ...(enrichmentResult.instagram_handle !== undefined && { instagram_handle: enrichmentResult.instagram_handle }),
        ...(enrichmentResult.twitter_handle !== undefined && { twitter_handle: enrichmentResult.twitter_handle }),
        enrichment_data: enrichmentResult,
        enriched_at: new Date().toISOString(),
      })
      .eq('customer_id', customerId);
  } catch (err) {
    console.error('[Enrichment] Failed to update customer record:', err instanceof Error ? err.message : err);
  }

  // g) Return the enrichment result
  return enrichmentResult;
}
