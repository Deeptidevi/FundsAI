import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Campaign } from '@gmaps/shared';
import {
  Send,
  Plus,
  Play,
  Pause,
  XOctagon,
  Clock,
  CheckCircle,
  Eye,
  AlertTriangle,
  Mail,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for New Campaign
  const [showWizard, setShowWizard] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [channels, setChannels] = useState<string[]>(['email']);
  const [subject, setSubject] = useState('B2B Technical Capability Introduction: G-MAPS & {{company_name}}');
  const [emailTemplate, setEmailTemplate] = useState(
    'Dear {{contact_name}},\n\nWe have reviewed {{company_name}}\'s manufacturing footprint in {{city}}. We would like to introduce our specialized industrial precision engineering capabilities.\n\nBest regards,\nG-MAPS Industrial Intelligence Team'
  );
  const [waTemplate, setWaTemplate] = useState('industrial_intro_v1');
  const [dailyLimit, setDailyLimit] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  // Preview Modal
  const [previewData, setPreviewData] = useState<{
    campaignId: string;
    samplePreviews: Array<{
      companyName: string;
      recipient: string;
      channel: string;
      renderedSubject?: string;
      renderedContent: string;
      isSuppressed: boolean;
    }>;
    totalEligible: number;
    totalSuppressed: number;
  } | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getCampaigns();
      setCampaigns(res.campaigns);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) return;

    try {
      setSubmitting(true);
      // Fetch available leads to target
      const leadsRes = await api.getLeads({ limit: 100 });
      const leadIds = leadsRes.leads.map((l) => l.id);

      if (leadIds.length === 0) {
        alert('Cannot create campaign: No leads exist in database. Import leads first.');
        return;
      }

      const res = await api.createCampaign({
        name: campaignName,
        purpose,
        channels,
        emailSubject: subject,
        emailBodyTemplate: emailTemplate,
        whatsappTemplateName: channels.includes('whatsapp') ? waTemplate : undefined,
        dailySendLimit: dailyLimit,
        leadIds,
      });

      setShowWizard(false);
      // Fetch preview immediately
      const preview = await api.getCampaignPreview(res.campaignId);
      setPreviewData(preview);
      fetchCampaigns();
    } catch (err: unknown) {
      alert(`Creation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (campaignId: string) => {
    if (!confirm('Explicit Approval Confirmation: Are you sure you want to approve this campaign and enqueue messages for delivery?')) return;
    try {
      const res = await api.approveCampaign(campaignId);
      alert(res.message);
      setPreviewData(null);
      fetchCampaigns();
    } catch (err: unknown) {
      alert(`Approval failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handlePause = async (campaignId: string) => {
    await api.pauseCampaign(campaignId);
    fetchCampaigns();
  };

  const handleResume = async (campaignId: string) => {
    await api.resumeCampaign(campaignId);
    fetchCampaigns();
  };

  const handleCancel = async (campaignId: string) => {
    if (!confirm('Are you sure you want to cancel this campaign?')) return;
    await api.cancelCampaign(campaignId);
    fetchCampaigns();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Outreach Campaigns</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Orchestrate email and WhatsApp sequences with strict human approval gates.
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow-lg shadow-blue-600/20"
        >
          <Plus size={16} />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Campaign Name</th>
                <th className="py-3 px-4">Channels</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Daily Limit</th>
                <th className="py-3 px-4">Targeted Leads</th>
                <th className="py-3 px-4">Approved By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">Loading campaigns...</td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    No outreach campaigns created yet. Click "New Campaign" to set up your first audience.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => {
                  const channelList: string[] = typeof c.channels === 'string' ? JSON.parse(c.channels) : c.channels;
                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-semibold text-white">
                        <div>{c.name}</div>
                        {c.purpose && <div className="text-[11px] text-slate-500 font-normal">{c.purpose}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {channelList.includes('email') && (
                            <span className="p-1 rounded bg-indigo-500/10 text-indigo-400" title="Email"><Mail size={14} /></span>
                          )}
                          {channelList.includes('whatsapp') && (
                            <span className="p-1 rounded bg-emerald-500/10 text-emerald-400" title="WhatsApp"><MessageSquare size={14} /></span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                            c.status === 'running'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                              : c.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : c.status === 'pending_approval' || c.status === 'draft'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : c.status === 'paused'
                              ? 'bg-slate-700 text-slate-300 border-slate-600'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{c.dailySendLimit} / day</td>
                      <td className="py-3 px-4 font-semibold text-white">{c.totalLeadsTargeted}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {c.approvedBy ? (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <ShieldCheck size={14} /> Verified Human
                          </span>
                        ) : (
                          <span className="text-amber-400/80">Unapproved</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {c.status === 'draft' || c.status === 'pending_approval' ? (
                          <button
                            onClick={async () => {
                              const p = await api.getCampaignPreview(c.id);
                              setPreviewData(p);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition"
                          >
                            Review & Approve
                          </button>
                        ) : c.status === 'running' ? (
                          <button
                            onClick={() => handlePause(c.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Pause Campaign"
                          >
                            <Pause size={14} />
                          </button>
                        ) : c.status === 'paused' ? (
                          <button
                            onClick={() => handleResume(c.id)}
                            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
                            title="Resume Campaign"
                          >
                            <Play size={14} />
                          </button>
                        ) : null}

                        {c.status !== 'completed' && c.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancel(c.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition"
                            title="Cancel Campaign"
                          >
                            <XOctagon size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Campaign Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-base text-white">Create New Outreach Campaign</h3>
              <button onClick={() => setShowWizard(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Q4 Precision Tooling Outreach - Pune Region"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Outreach Channels</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={channels.includes('email')}
                      onChange={(e) => {
                        if (e.target.checked) setChannels([...channels, 'email']);
                        else setChannels(channels.filter((c) => c !== 'email'));
                      }}
                      className="rounded bg-slate-950 border-slate-700"
                    />
                    <span>Email Outreach</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={channels.includes('whatsapp')}
                      onChange={(e) => {
                        if (e.target.checked) setChannels([...channels, 'whatsapp']);
                        else setChannels(channels.filter((c) => c !== 'whatsapp'));
                      }}
                      className="rounded bg-slate-950 border-slate-700"
                    />
                    <span>Meta WhatsApp Cloud API</span>
                  </label>
                </div>
              </div>

              {channels.includes('email') && (
                <>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-200">Email Subject (supports {'{{company_name}}'})</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-[11px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-200">Email Body Template</label>
                    <textarea
                      rows={5}
                      value={emailTemplate}
                      onChange={(e) => setEmailTemplate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-[11px]"
                    />
                  </div>
                </>
              )}

              {channels.includes('whatsapp') && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-200">Approved Meta WhatsApp Template Name</label>
                  <input
                    type="text"
                    value={waTemplate}
                    onChange={(e) => setWaTemplate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-[11px]"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Daily Sending Limit (Throttle Guard)</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(parseInt(e.target.value, 10) || 100)}
                  className="w-32 bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowWizard(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || channels.length === 0}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold shadow-lg shadow-blue-600/30"
                >
                  {submitting ? 'Creating...' : 'Create Draft Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review & Human Approval Modal */}
      {previewData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-400" size={22} />
                <h3 className="font-semibold text-base text-white">Explicit Human Approval Gate</h3>
              </div>
              <button onClick={() => setPreviewData(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>
                <strong>Zero Auto-Sends:</strong> Production outreach can only begin after your explicit review and sign-off below. Review representative lead messages before enabling background queues.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Eligible Recipients</span>
                <div className="text-lg font-bold text-emerald-400 mt-1">{previewData.totalEligible} leads</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Suppressed / Opted-Out</span>
                <div className="text-lg font-bold text-slate-400 mt-1">{previewData.totalSuppressed} blocked</div>
              </div>
            </div>

            {/* Rendered Preview */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Representative Rendered Preview</h4>
              {previewData.samplePreviews.slice(0, 1).map((s, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between text-slate-400 pb-2 border-b border-slate-800/80">
                    <span>To: <strong>{s.recipient}</strong> ({s.companyName})</span>
                    <span className="uppercase font-mono text-[10px] text-blue-400">{s.channel}</span>
                  </div>
                  {s.renderedSubject && (
                    <div className="font-semibold text-white">Subject: {s.renderedSubject}</div>
                  )}
                  <pre className="text-slate-300 font-sans whitespace-pre-wrap text-xs">{s.renderedContent}</pre>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setPreviewData(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Cancel Review
              </button>
              <button
                onClick={() => handleApprove(previewData.campaignId)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-600/30"
              >
                <CheckCircle size={16} />
                <span>Sign-Off & Start Outreach Queue</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
