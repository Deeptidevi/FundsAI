import React from 'react';
import { NavTab } from './Sidebar';
import { Download, Activity, AlertTriangle, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  currentTab: NavTab;
  pendingJobsCount?: number;
  globalKillSwitchActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  pendingJobsCount = 0,
  globalKillSwitchActive = false,
}) => {
  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Executive Overview', subtitle: 'Real-time database metrics & lead automation health' },
    search: { title: 'Industrial Business Discovery', subtitle: 'Targeted Google Places search, spatial radius, and geodetic tiling' },
    leads: { title: 'Leads & CRM Directory', subtitle: 'Verified industrial prospects with branch-aware deduplication' },
    import: { title: 'Excel & CSV Import Engine', subtitle: 'Batch ingest 200+ leads/day with DoT phone parsing and validation' },
    campaigns: { title: 'Outreach Campaigns', subtitle: 'Multi-step campaign builder with mandatory human approval gate' },
    inbox: { title: 'Omnichannel Unified Inbox', subtitle: 'Live WhatsApp and Email conversations with AI Copilot drafts' },
    knowledge: { title: 'Company Knowledge Base', subtitle: 'Verified business information, pricing policies, and RAG rules' },
    'test-lab': { title: 'Dedicated Test Lab', subtitle: 'Isolated sandbox environment: test emails & WhatsApp without customer contact' },
    integrations: { title: 'Integrations & Providers', subtitle: 'Meta WhatsApp Business Cloud API, SMTP Email, and Gemini AI health' },
    settings: { title: 'Settings & Security', subtitle: 'Global kill switches, suppression list, and audit logs' },
  };

  const isTestLab = currentTab === 'test-lab';

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-base text-white">{titles[currentTab]?.title}</h1>
            {isTestLab && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase tracking-wider animate-pulse">
                Test Mode Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{titles[currentTab]?.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Background Job Queue Status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
          <Activity size={14} className={pendingJobsCount > 0 ? 'text-blue-400 animate-spin' : 'text-slate-500'} />
          <span>Queue: <strong>{pendingJobsCount}</strong> pending</span>
        </div>

        {/* Global Kill Switch Indicator */}
        {globalKillSwitchActive ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-xs font-medium text-rose-400">
            <ShieldAlert size={14} />
            <span>Kill Switch ON</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span>System Active</span>
          </div>
        )}

        {/* CSV Export Button */}
        <a
          href="/api/export/leads.csv"
          download="gmaps_leads_export.csv"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition"
        >
          <Download size={14} />
          <span>Export CSV</span>
        </a>
      </div>
    </header>
  );
};
