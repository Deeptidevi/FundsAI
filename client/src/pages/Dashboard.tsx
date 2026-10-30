import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DashboardMetrics } from '@gmaps/shared';
import {
  Users,
  CheckCircle,
  AlertOctagon,
  Copy,
  Clock,
  Mail,
  MessageSquare,
  TrendingUp,
  Calendar,
  UserCheck,
  ShieldAlert,
  Activity,
  ArrowRight,
  UploadCloud,
  RefreshCw,
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [tierDist, setTierDist] = useState<Array<{ tier: string; count: number }>>([]);
  const [cityDist, setCityDist] = useState<Array<{ city: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDashboard();
      setMetrics(data.metrics);
      setTierDist(data.tierDistribution);
      setCityDist(data.cityDistribution);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
          <span className="text-sm font-medium">Loading database metrics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center justify-between">
          <span>Failed loading dashboard data: {error}</span>
          <button onClick={fetchMetrics} className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-xs font-semibold">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const m = metrics || {
    totalLeads: 0,
    validLeads: 0,
    invalidLeads: 0,
    duplicates: 0,
    eligibleLeads: 0,
    pendingApprovals: 0,
    emailsSent: 0,
    emailFailures: 0,
    whatsappSent: 0,
    whatsappFailures: 0,
    repliesReceived: 0,
    interestedLeads: 0,
    meetingsRequested: 0,
    humanHandoffs: 0,
    optOuts: 0,
    pendingJobs: 0,
  };

  const hasData = m.totalLeads > 0 || m.emailsSent > 0 || m.whatsappSent > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Action banner if empty */}
      {!hasData && (
        <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-blue-500/30 bg-blue-950/20">
          <div>
            <h2 className="text-lg font-semibold text-white">Database is Clean & Ready</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Zero synthetic leads exist in your production database. Import your real company leads from Excel (.xlsx) or CSV, or run an Industrial Places search to begin outreach.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('import')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition shadow-lg shadow-blue-600/30"
            >
              <UploadCloud size={18} />
              <span>Import Excel / CSV</span>
            </button>
            <button
              onClick={() => onNavigate('search')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition border border-slate-700"
            >
              <span>Industrial Discovery</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="glass-panel p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Leads</span>
            <Users size={18} className="text-blue-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{m.totalLeads}</span>
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle size={12} /> {m.validLeads} valid
            </span>
          </div>
          <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px] text-slate-400">
            <span>Duplicates Filtered:</span>
            <span className="font-semibold text-slate-300">{m.duplicates}</span>
          </div>
        </div>

        {/* Email Outreach */}
        <div className="glass-panel p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Emails Dispatched</span>
            <Mail size={18} className="text-indigo-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{m.emailsSent}</span>
            <span className={`text-xs font-medium ${m.emailFailures > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
              {m.emailFailures} failures
            </span>
          </div>
          <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px] text-slate-400">
            <span>Delivery Channel:</span>
            <span className="font-semibold text-slate-300">Verified SMTP / API</span>
          </div>
        </div>

        {/* WhatsApp Outreach */}
        <div className="glass-panel p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">WhatsApp Sent</span>
            <MessageSquare size={18} className="text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{m.whatsappSent}</span>
            <span className={`text-xs font-medium ${m.whatsappFailures > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
              {m.whatsappFailures} failures
            </span>
          </div>
          <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px] text-slate-400">
            <span>Provider:</span>
            <span className="font-semibold text-slate-300">Meta Cloud Platform</span>
          </div>
        </div>

        {/* Campaign Approval Gate */}
        <div className="glass-panel p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Approvals</span>
            <Clock size={18} className="text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{m.pendingApprovals}</span>
            <span className="text-xs text-amber-400 font-medium">Awaiting Human Review</span>
          </div>
          <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px] text-slate-400">
            <span>Outreach Policy:</span>
            <span className="font-semibold text-emerald-400">Strict Human Gate</span>
          </div>
        </div>
      </div>

      {/* Engagement & Conversion Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-panel-subtle p-3.5 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium">Replies Received</div>
          <div className="text-xl font-bold text-white mt-1">{m.repliesReceived}</div>
        </div>
        <div className="glass-panel-subtle p-3.5 rounded-xl">
          <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp size={12} /> Interested Leads
          </div>
          <div className="text-xl font-bold text-white mt-1">{m.interestedLeads}</div>
        </div>
        <div className="glass-panel-subtle p-3.5 rounded-xl">
          <div className="text-[11px] text-blue-400 font-medium flex items-center gap-1">
            <Calendar size={12} /> Meetings Requested
          </div>
          <div className="text-xl font-bold text-white mt-1">{m.meetingsRequested}</div>
        </div>
        <div className="glass-panel-subtle p-3.5 rounded-xl">
          <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
            <UserCheck size={12} /> Human Handoffs
          </div>
          <div className="text-xl font-bold text-white mt-1">{m.humanHandoffs}</div>
        </div>
        <div className="glass-panel-subtle p-3.5 rounded-xl">
          <div className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
            <ShieldAlert size={12} /> Opt-Outs
          </div>
          <div className="text-xl font-bold text-white mt-1">{m.optOuts}</div>
        </div>
        <div className="glass-panel-subtle p-3.5 rounded-xl">
          <div className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
            <Activity size={12} /> Pending Queue
          </div>
          <div className="text-xl font-bold text-white mt-1">{m.pendingJobs}</div>
        </div>
      </div>

      {/* Breakdowns: Tiers and Cities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tier Distribution */}
        <div className="glass-panel p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-white mb-4">Industrial Tier Distribution (DoT Verified)</h3>
          {tierDist.length === 0 ? (
            <div className="text-xs text-slate-500 py-8 text-center">No leads classified yet.</div>
          ) : (
            <div className="space-y-3">
              {tierDist.map((item) => (
                <div key={item.tier} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        item.tier === 'Gold'
                          ? 'bg-amber-400'
                          : item.tier === 'Silver'
                          ? 'bg-cyan-400'
                          : item.tier === 'Bronze'
                          ? 'bg-slate-400'
                          : 'bg-slate-600'
                      }`}
                    />
                    <span className="font-medium text-slate-300">{item.tier} Tier</span>
                  </div>
                  <span className="font-semibold text-white">{item.count} leads</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Cities */}
        <div className="glass-panel p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-white mb-4">Top Industrial Clusters</h3>
          {cityDist.length === 0 ? (
            <div className="text-xs text-slate-500 py-8 text-center">No geographic distribution data.</div>
          ) : (
            <div className="space-y-3">
              {cityDist.map((item) => (
                <div key={item.city} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{item.city}</span>
                  <span className="font-semibold text-white">{item.count} leads</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
