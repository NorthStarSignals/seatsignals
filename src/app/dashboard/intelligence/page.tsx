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
  id: string;
  name: string;
  score: number;
  tier: string;
  frequencyScore: number;
  spendScore: number;
  recencyScore: number;
  referralScore: number;
  birthdayScore: number;
  revenuePotential: number;
  recommendation: string;
}

interface ChurnAlert {
  id: string;
  name: string;
  riskLevel: string;
  riskScore: number;
  revenueAtRisk: number;
  pattern: string;
  winBackStrategy: string;
  urgency: string;
  channelRecommendation: string;
}

interface ForecastData {
  forecast: {
    month1?: { label: string; dineIn: number; catering: number; corporate: number; deadHours: number; birthdays: number; total: number; confidence: string };
    month2?: { label: string; dineIn: number; catering: number; corporate: number; deadHours: number; birthdays: number; total: number; confidence: string };
    month3?: { label: string; dineIn: number; catering: number; corporate: number; deadHours: number; birthdays: number; total: number; confidence: string };
  };
  totalForecast: number;
  growthRate: number;
  confidenceNote: string;
  keyDrivers: string[];
  risks: string[];
  whatIf: Array<{ scenario: string; impact: string; confidence: string; reasoning: string }>;
}

interface InsightData {
  overallGrade: string;
  headline: string;
  sections: Array<{ title: string; icon: string; status: string; findings: string[]; recommendations: Array<{ action: string; impact: string; priority: string; timeframe: string }> }>;
  quickWins: Array<{ action: string; expectedImpact: string }>;
  strategicPriorities: Array<{ priority: string; reasoning: string; timeline: string }>;
  revenueOpportunities: Array<{ opportunity: string; estimatedValue: string; effort: string }>;
}

interface WinBackData {
  campaigns: Array<{ id: string; name: string; email: { subject: string; body: string }; sms: { primary: string; variant: string }; offer: string; sendTime: string; conversionProbability: number; estimatedRevenue: number }>;
  summary: { totalCampaigns: number; totalEstimatedRevenue: number; avgConversionRate: number };
}

interface CompetitorData {
  marketPosition: { summary: string; strengths: string[]; vulnerabilities: string[] };
  competitorProfiles: Array<{ type: string; threatLevel: string; likelyStrengths: string[]; likelyWeaknesses: string[]; howToBeat: string }>;
  differentiationOpportunities: Array<{ opportunity: string; description: string; competitiveAdvantage: string; investmentLevel: string }>;
  marketTrends: Array<{ trend: string; impact: string; actionItem: string }>;
  pricingInsights: { strategy: string; tactics: string[] };
  digitalPresence: { recommendations: string[]; quickWins: string[] };
}

interface MarketingContent {
  socialMedia: Array<{ platform: string; type: string; content: string; hashtags: string[]; bestTimeToPost: string; hook: string }>;
  emailCampaigns: Array<{ name: string; subject: string; previewText: string; body: string; cta: string; audience: string; sendTime: string }>;
  smsCampaigns: Array<{ name: string; message: string; variant: string; audience: string; expectedResponse: string }>;
  contentCalendar: Array<{ day: string; theme: string; platform: string; idea: string }>;
}

export default function SignalIQPage() {
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
        case 'lead-scores': setLeadScores(data.leads || []); break;
        case 'churn-alerts': setChurnAlerts(data.alerts || []); break;
        case 'revenue-forecast': setForecast(data); break;
        case 'ai-insights': setInsights(data); break;
        case 'win-back': setWinBack(data); break;
        case 'competitor-analysis': setCompetitor(data); break;
        case 'marketing-ai': setMarketing(data); break;
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
                  <div key={lead.id || i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-white font-medium">{lead.name}</span>
                        <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${
                          lead.tier === 'VIP' ? 'bg-emerald-500/10 text-emerald-400' :
                          lead.tier === 'High Value' ? 'bg-blue-500/10 text-blue-400' :
                          lead.tier === 'Growth' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-zinc-500/10 text-zinc-400'
                        }`}>{lead.tier}</span>
                      </div>
                      <span className={`text-lg font-bold ${lead.score >= 80 ? 'text-emerald-400' : lead.score >= 50 ? 'text-red-400' : 'text-zinc-400'}`}>
                        {lead.score}/100
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm">{lead.recommendation}</p>
                    <p className="text-zinc-500 text-xs mt-2">90-day potential: ${lead.revenuePotential?.toLocaleString()}</p>
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
                  <div key={alert.id || i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{alert.name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        alert.riskLevel === 'Critical' ? 'bg-red-500/10 text-red-400' :
                        alert.riskLevel === 'High' ? 'bg-red-500/10 text-red-300' :
                        'bg-zinc-500/10 text-zinc-400'
                      }`}>
                        {alert.riskLevel} risk ({alert.riskScore}/100)
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm">{alert.pattern}</p>
                    <p className="text-zinc-500 text-xs mt-1">${alert.revenueAtRisk?.toLocaleString()} revenue at risk - {alert.urgency}</p>
                    <p className="text-red-400 text-xs mt-2">Strategy ({alert.channelRecommendation}): {alert.winBackStrategy}</p>
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
                    <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">90-Day Forecast</p>
                    <p className="text-2xl font-bold text-white">${forecast.totalForecast?.toLocaleString()}</p>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Growth Rate</p>
                    <p className="text-2xl font-bold text-emerald-400">{forecast.growthRate}%</p>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Key Drivers</p>
                    <ul className="space-y-1">
                      {forecast.keyDrivers?.map((d, i) => (
                        <li key={i} className="text-zinc-300 text-sm">- {d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {forecast.forecast && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-400 text-xs uppercase tracking-wider mb-3">Monthly Breakdown</p>
                    <div className="space-y-2">
                      {(['month1', 'month2', 'month3'] as const).map((key) => {
                        const m = forecast.forecast[key];
                        if (!m) return null;
                        return (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-zinc-300 text-sm">{m.label}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-white font-medium">${m.total?.toLocaleString()}</span>
                              <span className="text-zinc-500 text-xs">{m.confidence} confidence</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {forecast.whatIf && forecast.whatIf.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-400 text-xs uppercase tracking-wider mb-3">What-If Scenarios</p>
                    <div className="space-y-3">
                      {forecast.whatIf.map((w, i) => (
                        <div key={i} className="border-l-2 border-red-500 pl-3">
                          <p className="text-white text-sm font-medium">{w.scenario}</p>
                          <p className="text-emerald-400 text-sm">{w.impact}</p>
                          <p className="text-zinc-500 text-xs">{w.reasoning} ({w.confidence})</p>
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
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-semibold">Business Health</h3>
                    <span className="text-2xl font-bold text-red-400">{insights.overallGrade}</span>
                  </div>
                  <p className="text-zinc-300 text-sm">{insights.headline}</p>
                </div>
                {insights.sections && insights.sections.length > 0 && (
                  <div className="space-y-3">
                    {insights.sections.map((section, i) => (
                      <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{section.title}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            section.status === 'strong' ? 'bg-emerald-500/10 text-emerald-400' :
                            section.status === 'needs_attention' ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>{section.status}</span>
                        </div>
                        <ul className="space-y-1 mb-3">
                          {section.findings?.map((f, j) => (
                            <li key={j} className="text-zinc-400 text-sm">- {f}</li>
                          ))}
                        </ul>
                        {section.recommendations?.map((rec, j) => (
                          <div key={j} className="border-l-2 border-red-500 pl-3 mb-2">
                            <p className="text-zinc-300 text-sm">{rec.action}</p>
                            <div className="flex gap-4 mt-1">
                              <span className="text-xs text-emerald-400">{rec.impact}</span>
                              <span className="text-xs text-zinc-500">{rec.priority} / {rec.timeframe}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {insights.quickWins && insights.quickWins.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Quick Wins</h3>
                    <div className="space-y-2">
                      {insights.quickWins.map((qw, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="text-red-500 font-bold text-sm">#{i + 1}</span>
                          <div>
                            <p className="text-zinc-300 text-sm">{qw.action}</p>
                            <p className="text-emerald-400 text-xs">{qw.expectedImpact}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {insights.revenueOpportunities && insights.revenueOpportunities.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Revenue Opportunities</h3>
                    <div className="space-y-3">
                      {insights.revenueOpportunities.map((opp, i) => (
                        <div key={i} className="border-l-2 border-red-500 pl-3">
                          <p className="text-white text-sm font-medium">{opp.opportunity}</p>
                          <div className="flex gap-4 mt-1">
                            <span className="text-xs text-emerald-400">{opp.estimatedValue}</span>
                            <span className="text-xs text-zinc-500">Effort: {opp.effort}</span>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Campaigns</p>
                    <p className="text-2xl font-bold text-white">{winBack.summary?.totalCampaigns || 0}</p>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Est. Revenue</p>
                    <p className="text-2xl font-bold text-emerald-400">${winBack.summary?.totalEstimatedRevenue?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Avg Conversion</p>
                    <p className="text-2xl font-bold text-white">{winBack.summary?.avgConversionRate || 0}%</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {winBack.campaigns?.map((c, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white font-medium">{c.name}</p>
                        <span className="text-emerald-400 text-xs">{c.conversionProbability}% conversion</span>
                      </div>
                      <p className="text-zinc-400 text-sm mt-1">{c.sms?.primary}</p>
                      <p className="text-red-400 text-xs mt-2">Offer: {c.offer} | Best send: {c.sendTime}</p>
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
                  <p className="text-zinc-300 text-sm">{competitor.marketPosition?.summary}</p>
                  {competitor.marketPosition?.strengths && (
                    <div className="mt-3">
                      <p className="text-emerald-400 text-xs font-medium mb-1">Strengths</p>
                      <ul className="space-y-1">
                        {competitor.marketPosition.strengths.map((s, i) => (
                          <li key={i} className="text-zinc-400 text-sm">- {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {competitor.marketPosition?.vulnerabilities && (
                    <div className="mt-3">
                      <p className="text-red-400 text-xs font-medium mb-1">Vulnerabilities</p>
                      <ul className="space-y-1">
                        {competitor.marketPosition.vulnerabilities.map((v, i) => (
                          <li key={i} className="text-zinc-400 text-sm">- {v}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {competitor.competitorProfiles && competitor.competitorProfiles.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {competitor.competitorProfiles.map((c, i) => (
                      <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{c.type}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            c.threatLevel === 'high' ? 'bg-red-500/10 text-red-400' :
                            c.threatLevel === 'medium' ? 'bg-red-500/10 text-red-300' :
                            'bg-zinc-500/10 text-zinc-400'
                          }`}>
                            {c.threatLevel} threat
                          </span>
                        </div>
                        <p className="text-emerald-400 text-xs mb-1">Strengths: {c.likelyStrengths?.join(', ')}</p>
                        <p className="text-red-400 text-xs mb-1">Weaknesses: {c.likelyWeaknesses?.join(', ')}</p>
                        <p className="text-zinc-400 text-xs mt-2">How to beat: {c.howToBeat}</p>
                      </div>
                    ))}
                  </div>
                )}
                {competitor.differentiationOpportunities && competitor.differentiationOpportunities.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Differentiation Opportunities</h3>
                    <div className="space-y-3">
                      {competitor.differentiationOpportunities.map((o, i) => (
                        <div key={i} className="border-l-2 border-red-500 pl-3">
                          <p className="text-white text-sm font-medium">{o.opportunity}</p>
                          <p className="text-zinc-400 text-sm">{o.description}</p>
                          <div className="flex gap-4 mt-1">
                            <span className="text-xs text-emerald-400">{o.competitiveAdvantage}</span>
                            <span className="text-xs text-zinc-500">Investment: {o.investmentLevel}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {competitor.marketTrends && competitor.marketTrends.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Market Trends</h3>
                    <div className="space-y-2">
                      {competitor.marketTrends.map((t, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="text-red-500 font-bold text-sm">#{i + 1}</span>
                          <div>
                            <p className="text-zinc-300 text-sm font-medium">{t.trend}</p>
                            <p className="text-zinc-400 text-xs">{t.impact}</p>
                            <p className="text-emerald-400 text-xs">{t.actionItem}</p>
                          </div>
                        </div>
                      ))}
                    </div>
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
                {marketing.socialMedia && marketing.socialMedia.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Social Media Posts</h3>
                    <div className="space-y-3">
                      {marketing.socialMedia.map((post, i) => (
                        <div key={i} className="bg-zinc-800 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-red-400 uppercase font-medium">{post.platform} - {post.type}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500">Best: {post.bestTimeToPost}</span>
                              <CopyButton text={post.content} id={`social-${i}`} />
                            </div>
                          </div>
                          <p className="text-zinc-300 text-sm">{post.content}</p>
                          {post.hashtags && (
                            <p className="text-zinc-500 text-xs mt-2">{post.hashtags.map(h => `#${h}`).join(' ')}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Email campaigns */}
                {marketing.emailCampaigns && marketing.emailCampaigns.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Email Campaigns</h3>
                    {marketing.emailCampaigns.map((campaign, i) => (
                      <div key={i} className="bg-zinc-800 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-red-400 font-medium">{campaign.name}</span>
                          <CopyButton text={`Subject: ${campaign.subject}\n\n${campaign.body}`} id={`email-${i}`} />
                        </div>
                        <p className="text-xs text-zinc-500 mb-1">Subject: {campaign.subject}</p>
                        <p className="text-zinc-300 text-sm whitespace-pre-wrap">{campaign.body}</p>
                        <div className="flex gap-4 mt-2">
                          <span className="text-xs text-zinc-500">CTA: {campaign.cta}</span>
                          <span className="text-xs text-zinc-500">Send: {campaign.sendTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* SMS campaigns */}
                {marketing.smsCampaigns && marketing.smsCampaigns.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">SMS Campaigns</h3>
                    {marketing.smsCampaigns.map((sms, i) => (
                      <div key={i} className="bg-zinc-800 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-red-400 font-medium">{sms.name}</span>
                          <CopyButton text={sms.message} id={`sms-${i}`} />
                        </div>
                        <p className="text-zinc-300 text-sm">{sms.message}</p>
                        <p className="text-zinc-500 text-xs mt-1">A/B variant: {sms.variant}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Content calendar */}
                {marketing.contentCalendar && marketing.contentCalendar.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Content Calendar</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {marketing.contentCalendar.map((item, i) => (
                        <div key={i} className="bg-zinc-800 rounded-lg p-3">
                          <p className="text-white text-sm font-medium">{item.day}</p>
                          <p className="text-zinc-400 text-xs">{item.theme} - {item.platform}</p>
                          <p className="text-zinc-500 text-xs">{item.idea}</p>
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
          <h1 className="text-2xl font-bold text-white">Signal <span className="text-red-500">IQ</span></h1>
        </div>
        <p className="text-zinc-500 text-sm">AI-powered intelligence engine — your unfair advantage</p>
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
