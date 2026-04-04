'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Lightbulb,
  UserCheck,
  Radar,
  Megaphone,
  Copy,
  Check,
} from 'lucide-react';

type TabKey = 'lead-scores' | 'churn-alerts' | 'revenue-forecast' | 'ai-insights' | 'win-back' | 'competitor-analysis' | 'marketing-ai';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'lead-scores', label: 'Lead Scores', icon: TrendingUp },
  { key: 'churn-alerts', label: 'Churn Alerts', icon: AlertTriangle },
  { key: 'revenue-forecast', label: 'Revenue Forecast', icon: BarChart3 },
  { key: 'ai-insights', label: 'AI Insights', icon: Lightbulb },
  { key: 'win-back', label: 'Win-Back', icon: UserCheck },
  { key: 'competitor-analysis', label: 'Competitor Analysis', icon: Radar },
  { key: 'marketing-ai', label: 'Marketing AI', icon: Megaphone },
];

interface LeadScore {
  customer_id: string;
  first_name: string;
  email: string;
  score: number;
  reasoning: string;
  recommended_action: string;
}

interface ChurnAlert {
  customer_id: string;
  first_name: string;
  email: string;
  risk_level: string;
  days_since_visit: number;
  reasoning: string;
  win_back_strategy: string;
}

interface ForecastData {
  weekly_forecast: Array<{ week: string; predicted_revenue: number; confidence: number }>;
  monthly_total: number;
  growth_trend: string;
  key_drivers: string[];
}

interface InsightData {
  executive_summary: string;
  top_opportunities: Array<{ title: string; impact: string; effort: string; description: string }>;
  risks: Array<{ title: string; severity: string; mitigation: string }>;
  recommended_actions: Array<{ priority: number; action: string; expected_impact: string }>;
}

interface WinBackData {
  reactivated: number;
  campaigns: Array<{ customer_id: string; first_name: string; email: string; strategy: string; offer: string }>;
}

interface CompetitorData {
  market_position: string;
  competitors: Array<{ name: string; strengths: string; weaknesses: string; threat_level: string }>;
  opportunities: string[];
  strategic_recommendations: string[];
}

interface MarketingContent {
  social_posts: Array<{ platform: string; content: string; best_time: string }>;
  email_campaign: { subject: string; body: string };
  sms_message: string;
  content_calendar: Array<{ day: string; theme: string; content_type: string }>;
}

export default function CortexPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('lead-scores');
  const [loading, setLoading] = useState(false);

  // Data states
  const [leadScores, setLeadScores] = useState<LeadScore[] | null>(null);
  const [churnAlerts, setChurnAlerts] = useState<ChurnAlert[] | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [winBack, setWinBack] = useState<WinBackData | null>(null);
  const [competitor, setCompetitor] = useState<CompetitorData | null>(null);
  const [marketing, setMarketing] = useState<MarketingContent | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTab = async (tab: TabKey) => {
    setLoading(true);
    try {
      const endpoints: Record<TabKey, { url: string; method: string }> = {
        'lead-scores': { url: '/api/ai/lead-score', method: 'POST' },
        'churn-alerts': { url: '/api/ai/churn-detect', method: 'POST' },
        'revenue-forecast': { url: '/api/ai/forecast', method: 'POST' },
        'ai-insights': { url: '/api/ai/insights', method: 'POST' },
        'win-back': { url: '/api/ai/reactivate', method: 'POST' },
        'competitor-analysis': { url: '/api/ai/competitor', method: 'POST' },
        'marketing-ai': { url: '/api/ai/marketing', method: 'POST' },
      };

      const { url, method } = endpoints[tab];
      const res = await fetch(url, { method });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'No restaurant') {
          toast.error('Complete onboarding first — set up your restaurant profile in Settings.');
        } else {
          toast.error(data.error || 'Failed to fetch data');
        }
        return;
      }

      const data = await res.json();

      switch (tab) {
        case 'lead-scores': setLeadScores(data.scores || data); break;
        case 'churn-alerts': setChurnAlerts(data.alerts || data); break;
        case 'revenue-forecast': setForecast(data.forecast || data); break;
        case 'ai-insights': setInsights(data.report || data); break;
        case 'win-back': setWinBack(data); break;
        case 'competitor-analysis': setCompetitor(data.analysis || data); break;
        case 'marketing-ai': setMarketing(data.content || data); break;
      }

      toast.success('Analysis complete');
    } catch {
      toast.error('Failed to run analysis');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copyToClipboard(text, id)}
      className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
      title="Copy to clipboard"
    >
      {copiedId === id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'lead-scores':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-zinc-400 text-sm">Score customers by revenue potential using AI analysis</p>
              <Button variant="cta" size="sm" onClick={() => fetchTab('lead-scores')} disabled={loading}>
                {loading ? 'Scoring...' : 'Run Lead Scoring'}
              </Button>
            </div>
            {leadScores ? (
              <div className="space-y-3">
                {leadScores.map((lead, i) => (
                  <div key={lead.customer_id || i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-white font-medium">{lead.first_name || lead.email}</span>
                        <span className="text-zinc-500 text-xs ml-2">{lead.email}</span>
                      </div>
                      <span className={`text-lg font-bold ${lead.score >= 80 ? 'text-emerald-400' : lead.score >= 50 ? 'text-red-400' : 'text-zinc-400'}`}>
                        {lead.score}/100
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm">{lead.reasoning}</p>
                    <p className="text-red-400 text-xs mt-2">Action: {lead.recommended_action}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Click 'Run Lead Scoring' to analyze your customer base" />
            )}
          </div>
        );

      case 'churn-alerts':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-zinc-400 text-sm">Detect customers at risk of churning before they leave</p>
              <Button variant="cta" size="sm" onClick={() => fetchTab('churn-alerts')} disabled={loading}>
                {loading ? 'Detecting...' : 'Run Churn Detection'}
              </Button>
            </div>
            {churnAlerts ? (
              <div className="space-y-3">
                {churnAlerts.map((alert, i) => (
                  <div key={alert.customer_id || i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{alert.first_name || alert.email}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        alert.risk_level === 'high' ? 'bg-red-500/10 text-red-400' :
                        alert.risk_level === 'medium' ? 'bg-red-500/10 text-red-300' :
                        'bg-zinc-500/10 text-zinc-400'
                      }`}>
                        {alert.risk_level} risk
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm">{alert.reasoning}</p>
                    <p className="text-zinc-500 text-xs mt-1">{alert.days_since_visit} days since last visit</p>
                    <p className="text-red-400 text-xs mt-2">Strategy: {alert.win_back_strategy}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Click 'Run Churn Detection' to identify at-risk customers" />
            )}
          </div>
        );

      case 'revenue-forecast':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-zinc-400 text-sm">AI-powered revenue projections based on your trends</p>
              <Button variant="cta" size="sm" onClick={() => fetchTab('revenue-forecast')} disabled={loading}>
                {loading ? 'Forecasting...' : 'Generate Forecast'}
              </Button>
            </div>
            {forecast ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Monthly Projection</p>
                    <p className="text-2xl font-bold text-white">${forecast.monthly_total?.toLocaleString()}</p>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Trend</p>
                    <p className="text-2xl font-bold text-emerald-400">{forecast.growth_trend}</p>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Key Drivers</p>
                    <ul className="space-y-1">
                      {forecast.key_drivers?.map((d, i) => (
                        <li key={i} className="text-zinc-300 text-sm">- {d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {forecast.weekly_forecast && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-400 text-xs uppercase tracking-wider mb-3">Weekly Breakdown</p>
                    <div className="space-y-2">
                      {forecast.weekly_forecast.map((w, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-zinc-300 text-sm">{w.week}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-white font-medium">${w.predicted_revenue?.toLocaleString()}</span>
                            <span className="text-zinc-500 text-xs">{w.confidence}% confidence</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState text="Click 'Generate Forecast' to project your revenue" />
            )}
          </div>
        );

      case 'ai-insights':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-zinc-400 text-sm">Comprehensive state-of-the-business intelligence report</p>
              <Button variant="cta" size="sm" onClick={() => fetchTab('ai-insights')} disabled={loading}>
                {loading ? 'Analyzing...' : 'Generate Report'}
              </Button>
            </div>
            {insights ? (
              <div className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <h3 className="text-white font-semibold mb-2">Executive Summary</h3>
                  <p className="text-zinc-300 text-sm">{insights.executive_summary}</p>
                </div>
                {insights.top_opportunities && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Top Opportunities</h3>
                    <div className="space-y-3">
                      {insights.top_opportunities.map((opp, i) => (
                        <div key={i} className="border-l-2 border-red-500 pl-3">
                          <p className="text-white text-sm font-medium">{opp.title}</p>
                          <p className="text-zinc-400 text-sm">{opp.description}</p>
                          <div className="flex gap-4 mt-1">
                            <span className="text-xs text-emerald-400">Impact: {opp.impact}</span>
                            <span className="text-xs text-zinc-500">Effort: {opp.effort}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {insights.risks && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Risks</h3>
                    <div className="space-y-3">
                      {insights.risks.map((risk, i) => (
                        <div key={i} className="border-l-2 border-red-400 pl-3">
                          <p className="text-white text-sm font-medium">{risk.title}</p>
                          <span className="text-xs text-red-400">{risk.severity}</span>
                          <p className="text-zinc-400 text-sm mt-1">{risk.mitigation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {insights.recommended_actions && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Recommended Actions</h3>
                    <div className="space-y-2">
                      {insights.recommended_actions.map((action, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="text-red-500 font-bold text-sm">#{action.priority}</span>
                          <div>
                            <p className="text-zinc-300 text-sm">{action.action}</p>
                            <p className="text-zinc-500 text-xs">{action.expected_impact}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState text="Click 'Generate Report' for a full business intelligence briefing" />
            )}
          </div>
        );

      case 'win-back':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-zinc-400 text-sm">Automatically re-engage lapsed customers with personalized offers</p>
              <Button variant="cta" size="sm" onClick={() => fetchTab('win-back')} disabled={loading}>
                {loading ? 'Reactivating...' : 'Run Win-Back Campaign'}
              </Button>
            </div>
            {winBack ? (
              <div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4 text-center">
                  <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Campaigns Sent</p>
                  <p className="text-2xl font-bold text-white">{winBack.reactivated}</p>
                </div>
                <div className="space-y-3">
                  {winBack.campaigns?.map((c, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                      <p className="text-white font-medium">{c.first_name || c.email}</p>
                      <p className="text-zinc-400 text-sm mt-1">{c.strategy}</p>
                      <p className="text-red-400 text-xs mt-2">Offer: {c.offer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState text="Click 'Run Win-Back Campaign' to re-engage lost customers" />
            )}
          </div>
        );

      case 'competitor-analysis':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-zinc-400 text-sm">AI-powered competitive intelligence for your market</p>
              <Button variant="cta" size="sm" onClick={() => fetchTab('competitor-analysis')} disabled={loading}>
                {loading ? 'Analyzing...' : 'Run Analysis'}
              </Button>
            </div>
            {competitor ? (
              <div className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <h3 className="text-white font-semibold mb-2">Market Position</h3>
                  <p className="text-zinc-300 text-sm">{competitor.market_position}</p>
                </div>
                {competitor.competitors && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {competitor.competitors.map((c, i) => (
                      <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{c.name}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            c.threat_level === 'high' ? 'bg-red-500/10 text-red-400' :
                            c.threat_level === 'medium' ? 'bg-red-500/10 text-red-300' :
                            'bg-zinc-500/10 text-zinc-400'
                          }`}>
                            {c.threat_level} threat
                          </span>
                        </div>
                        <p className="text-emerald-400 text-xs mb-1">Strengths: {c.strengths}</p>
                        <p className="text-red-400 text-xs">Weaknesses: {c.weaknesses}</p>
                      </div>
                    ))}
                  </div>
                )}
                {competitor.opportunities && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Opportunities</h3>
                    <ul className="space-y-2">
                      {competitor.opportunities.map((o, i) => (
                        <li key={i} className="text-zinc-300 text-sm flex gap-2">
                          <span className="text-red-500">-</span> {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {competitor.strategic_recommendations && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Strategic Recommendations</h3>
                    <ul className="space-y-2">
                      {competitor.strategic_recommendations.map((r, i) => (
                        <li key={i} className="text-zinc-300 text-sm flex gap-2">
                          <span className="text-red-500 font-bold">#{i + 1}</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState text="Click 'Run Analysis' to get competitive intelligence for your market" />
            )}
          </div>
        );

      case 'marketing-ai':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-zinc-400 text-sm">Generate social, email, and SMS content tailored to your brand</p>
              <Button variant="cta" size="sm" onClick={() => fetchTab('marketing-ai')} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Content'}
              </Button>
            </div>
            {marketing ? (
              <div className="space-y-4">
                {/* Social posts */}
                {marketing.social_posts && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Social Media Posts</h3>
                    <div className="space-y-3">
                      {marketing.social_posts.map((post, i) => (
                        <div key={i} className="bg-zinc-800 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-red-400 uppercase font-medium">{post.platform}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500">Best: {post.best_time}</span>
                              <CopyButton text={post.content} id={`social-${i}`} />
                            </div>
                          </div>
                          <p className="text-zinc-300 text-sm">{post.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Email campaign */}
                {marketing.email_campaign && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-semibold">Email Campaign</h3>
                      <CopyButton text={`Subject: ${marketing.email_campaign.subject}\n\n${marketing.email_campaign.body}`} id="email" />
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-3">
                      <p className="text-xs text-red-400 mb-1">Subject: {marketing.email_campaign.subject}</p>
                      <p className="text-zinc-300 text-sm whitespace-pre-wrap">{marketing.email_campaign.body}</p>
                    </div>
                  </div>
                )}

                {/* SMS */}
                {marketing.sms_message && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-semibold">SMS Message</h3>
                      <CopyButton text={marketing.sms_message} id="sms" />
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-3">
                      <p className="text-zinc-300 text-sm">{marketing.sms_message}</p>
                    </div>
                  </div>
                )}

                {/* Content calendar */}
                {marketing.content_calendar && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Content Calendar</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {marketing.content_calendar.map((item, i) => (
                        <div key={i} className="bg-zinc-800 rounded-lg p-3">
                          <p className="text-white text-sm font-medium">{item.day}</p>
                          <p className="text-zinc-400 text-xs">{item.theme} - {item.content_type}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState text="Click 'Generate Content' to create marketing materials for your restaurant" />
            )}
          </div>
        );
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Brain size={24} className="text-red-500" />
          <h1 className="text-2xl font-bold text-white">Cortex</h1>
        </div>
        <p className="text-zinc-500 text-sm">AI-powered insights for an unfair advantage</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                active
                  ? 'bg-red-500/10 text-red-400'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {renderContent()}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
      <Brain size={32} className="text-zinc-600 mx-auto mb-3" />
      <p className="text-zinc-400 text-sm">{text}</p>
    </div>
  );
}
