import { createServerSupabase } from '@/lib/supabase';

export async function isDoNotContact(restaurantId: string, contactValue: string): Promise<boolean> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('do_not_contact')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('contact_value', contactValue.toLowerCase().trim())
    .maybeSingle();

  return !!data;
}

export async function addToDoNotContact(params: {
  restaurantId: string;
  contactType: 'email' | 'phone' | 'both';
  contactValue: string;
  reason: string;
  customerId?: string;
  addedBy?: string;
}): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase.from('do_not_contact').upsert(
    {
      restaurant_id: params.restaurantId,
      contact_type: params.contactType,
      contact_value: params.contactValue.toLowerCase().trim(),
      reason: params.reason,
      customer_id: params.customerId || null,
      added_by: params.addedBy || 'system',
    },
    { onConflict: 'restaurant_id,contact_value' }
  );

  if (error) throw new Error(`Failed to add to DNC: ${error.message}`);
}

export async function removeFromDoNotContact(id: string, restaurantId: string): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from('do_not_contact')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurantId);
  if (error) throw new Error(`Failed to remove from DNC: ${error.message}`);
}

export async function logConsent(params: {
  restaurantId: string;
  customerId?: string;
  consentType: string;
  consented: boolean;
  source: string;
  ipAddress?: string;
}): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase.from('consent_log').insert({
    restaurant_id: params.restaurantId,
    customer_id: params.customerId || null,
    consent_type: params.consentType,
    consented: params.consented,
    source: params.source,
    ip_address: params.ipAddress || null,
  });

  if (error) throw new Error(`Failed to log consent: ${error.message}`);
}

export async function getComplianceSummary(restaurantId: string): Promise<{
  dnc_count: number;
  opt_in_rate: number;
  recent_unsubscribes: number;
  consent_records: number;
}> {
  const supabase = createServerSupabase();

  // DNC count
  const { count: dncCount } = await supabase
    .from('do_not_contact')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);

  // Recent unsubscribes (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { count: recentUnsubs } = await supabase
    .from('do_not_contact')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('reason', 'unsubscribed')
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Total consent records
  const { count: consentCount } = await supabase
    .from('consent_log')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);

  // Opt-in rate: count opt-ins vs total consent entries for email/sms
  const { count: optInCount } = await supabase
    .from('consent_log')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('consented', true)
    .in('consent_type', ['sms_opt_in', 'email_opt_in']);

  const { count: totalOptRecords } = await supabase
    .from('consent_log')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .in('consent_type', ['sms_opt_in', 'email_opt_in']);

  const optInRate = totalOptRecords && totalOptRecords > 0
    ? Math.round(((optInCount || 0) / totalOptRecords) * 100)
    : 0;

  return {
    dnc_count: dncCount || 0,
    opt_in_rate: optInRate,
    recent_unsubscribes: recentUnsubs || 0,
    consent_records: consentCount || 0,
  };
}
