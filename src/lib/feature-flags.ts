import { createServerSupabase } from './supabase';

export async function isFeatureEnabled(key: string, tier?: string): Promise<boolean> {
  const supabase = createServerSupabase();
  const { data: flag } = await supabase
    .from('feature_flags')
    .select('enabled, rollout_pct, tiers')
    .eq('key', key)
    .single();

  if (!flag) return true; // If no flag exists, feature is enabled by default
  if (!flag.enabled) return false;
  if (tier && flag.tiers?.length > 0 && !flag.tiers.includes(tier)) return false;
  if (flag.rollout_pct < 100) {
    // Simple hash-based rollout
    const hash = key.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return (hash % 100) < flag.rollout_pct;
  }
  return true;
}
