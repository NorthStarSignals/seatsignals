export interface Restaurant {
  restaurant_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  cuisine_type: string;
  brand_voice: string;
  subscription_tier: 'starter' | 'growth' | 'pro';
  setup_date: string;
  dead_hours_config: DeadHourWindow[];
  clerk_user_id: string;
  logo_url?: string;
}

export interface DeadHourWindow {
  day: string;
  start: string;
  end: string;
  promotion_type?: string;
  discount?: number;
}

export interface Customer {
  customer_id: string;
  restaurant_id: string;
  first_name: string;
  email: string;
  phone?: string;
  first_seen: string;
  last_seen: string;
  visit_count: number;
  total_spend: number;
  birthday?: string;
  source: 'wifi' | 'qr' | 'manual';
  location_data?: Record<string, unknown>;
}

export interface Visit {
  visit_id: string;
  customer_id: string;
  restaurant_id: string;
  timestamp: string;
  source: string;
  spend_amount: number;
}

export interface Review {
  review_id: string;
  restaurant_id: string;
  platform: string;
  author: string;
  rating: number;
  text: string;
  response_text?: string;
  response_status: 'pending_approval' | 'posted' | 'none';
  responded_at?: string;
  created_at: string;
}

export interface CateringLead {
  lead_id: string;
  restaurant_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  company_size: number;
  distance_miles: number;
  sequence_status: 'discovered' | 'contacted' | 'replied' | 'meeting' | 'order_placed' | 'recurring';
  last_contacted?: string;
  converted: boolean;
  order_value?: number;
}

export interface CateringOrder {
  order_id: string;
  restaurant_id: string;
  lead_id?: string;
  corporate_account_id?: string;
  date: string;
  amount: number;
  recurring: boolean;
  frequency?: 'weekly' | 'monthly';
  items: Record<string, unknown>[];
}

export interface CorporateAccount {
  account_id: string;
  restaurant_id: string;
  company_name: string;
  primary_contact: string;
  billing_info?: Record<string, unknown>;
  dietary_preferences?: string;
  delivery_address: string;
  recurring_schedule?: Record<string, unknown>;
  last_order_date?: string;
  total_lifetime_value: number;
  churn_risk_flag: boolean;
}

export interface DeliveryMetric {
  metric_id: string;
  restaurant_id: string;
  platform: string;
  date: string;
  orders: number;
  revenue: number;
  avg_order_value: number;
  rating: number;
}

export interface Sequence {
  sequence_id: string;
  customer_id: string;
  restaurant_id: string;
  type: 'retention' | 'catering' | 'review' | 'birthday' | 'anniversary' | 'dead_hours' | 'churn_reengagement';
  message: string;
  sent_at: string;
  opened: boolean;
  clicked: boolean;
  converted: boolean;
}

export interface DeadHour {
  dead_hour_id: string;
  restaurant_id: string;
  day_of_week: string;
  time_start: string;
  time_end: string;
  promotion_type: string;
  channel: 'sms' | 'meta_ads' | 'push';
  seats_filled: number;
  revenue: number;
  cost: number;
  redemption_code: string;
}

export interface BirthdayEvent {
  event_id: string;
  customer_id: string;
  restaurant_id: string;
  event_type: 'birthday' | 'anniversary';
  offer_sent_at: string;
  redeemed: boolean;
  redemption_date?: string;
  party_size?: number;
  check_total?: number;
  redemption_code: string;
}

export interface SequenceDefinition {
  id: string;
  restaurant_id: string;
  type: string;
  name: string;
  enabled: boolean;
  channel: 'sms' | 'email' | 'both';
  subject?: string;
  message_template?: string;
  trigger_event?: string;
  delay_days: number;
  created_at: string;
  // Aggregated stats (computed in API)
  stats?: {
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
  };
}

export interface RestaurantEmailConfig {
  id: string;
  restaurant_id: string;
  provider: 'sendgrid' | 'smtp' | 'gmail';
  from_name?: string;
  from_email?: string;
  connected: boolean;
}
