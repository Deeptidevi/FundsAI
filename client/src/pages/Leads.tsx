import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Lead } from '@gmaps/shared';
import {
  Users,
  Search,
  Filter,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  X,
  Save,
  CheckCircle,
  AlertCircle,
  Building,
} from 'lucide-react';

export const Leads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterTier, setFilterTier] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Lead for Drawer
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getLeads({
        tier: filterTier || undefined,
        status: filterStatus || undefined,
        limit: 100,
      });
      setLeads(res.leads);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [filterTier, filterStatus]);

  const handleOpenDrawer = (lead: Lead) => {
    setSelectedLead(lead);
    setEditNotes(lead.notes || '');
    setEditStatus(lead.status);
    setEditPriority(lead.priority);
  };

  const handleSaveLeadUpdates = async () => {
    if (!selectedLead) return;
    try {
      setSaving(true);
      await api.updateLead(selectedLead.id, {
        notes: editNotes,
        status: editStatus,
        priority: editPriority,
      });
      setSelectedLead({
        ...selectedLead,
        notes: editNotes,
        status: editStatus as Lead['status'],
        priority: editPriority as Lead['priority'],
      });
      fetchLeads();
    } catch (err: unknown) {
      alert(`Update failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  // Client-side text search filter
  const filteredLeads = leads.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.companyName.toLowerCase().includes(q) ||
      (l.city && l.city.toLowerCase().includes(q)) ||
      (l.primaryType && l.primaryType.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads by company, city, or industry..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tier filter */}
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="">All Tiers</option>
            <option value="Gold">Gold Tier</option>
            <option value="Silver">Silver Tier</option>
            <option value="Bronze">Bronze Tier</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="">All CRM Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="engaged">Engaged</option>
            <option value="qualified">Qualified</option>
            <option value="meeting_scheduled">Meeting Scheduled</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="suppressed">Suppressed</option>
          </select>

          <span className="text-xs text-slate-400 font-medium pl-2">
            <strong>{filteredLeads.length}</strong> of {total} leads
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Leads Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Tier</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Primary Contact</th>
                <th className="py-3 px-4">Phone (DoT Verified)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Loading records from database...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500">
                    No leads found matching your criteria. Import leads or run an industrial search.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const primaryContact = lead.contacts?.find((c) => c.isPrimary) || lead.contacts?.[0];
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => handleOpenDrawer(lead)}
                      className="hover:bg-slate-800/50 transition cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-medium text-white max-w-[220px] truncate">
                        {lead.companyName}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            lead.tier === 'Gold'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : lead.tier === 'Silver'
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'bg-slate-700/60 text-slate-300 border border-slate-600/40'
                          }`}
                        >
                          {lead.tier}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        ★ {lead.rating > 0 ? lead.rating.toFixed(1) : 'N/A'}{' '}
                        <span className="text-slate-500 text-[10px]">({lead.reviewCount})</span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-[140px] truncate">
                        {lead.city || lead.state || 'India'}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {primaryContact?.email ? (
                          <div className="flex items-center gap-1.5 text-blue-400">
                            <Mail size={12} />
                            <span className="max-w-[140px] truncate">{primaryContact.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {primaryContact?.phoneE164 ? (
                          <div className="flex items-center gap-1.5">
                            <Phone size={12} className={primaryContact.phoneType === 'Mobile' ? 'text-emerald-400' : 'text-slate-400'} />
                            <span className="font-mono text-[11px] text-slate-200">{primaryContact.phoneE164}</span>
                            <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 uppercase">
                              {primaryContact.phoneType}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-slate-400 group-hover:text-blue-400 transition p-1">
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col justify-between overflow-y-auto space-y-6">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <Building className="text-blue-400" size={20} />
                    <h2 className="text-lg font-bold text-white">{selectedLead.companyName}</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{selectedLead.address || `${selectedLead.city || ''}, ${selectedLead.state || ''}`}</p>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* CRM Updates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">CRM Stage</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="engaged">Engaged</option>
                    <option value="qualified">Qualified</option>
                    <option value="meeting_scheduled">Meeting Scheduled</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                    <option value="suppressed">Suppressed</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Internal Sales Notes</label>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Record customer preferences, objections, meeting dates..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Contact Information */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Associated Contacts</h4>
                {selectedLead.contacts && selectedLead.contacts.length > 0 ? (
                  selectedLead.contacts.map((c) => (
                    <div key={c.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
                      <div className="font-semibold text-white">{c.contactName || 'Corporate Representative'}</div>
                      {c.email && (
                        <div className="flex items-center gap-2 text-blue-400">
                          <Mail size={12} />
                          <span>{c.email}</span>
                        </div>
                      )}
                      {c.phoneE164 && (
                        <div className="flex items-center gap-2 text-slate-300 font-mono">
                          <Phone size={12} className="text-emerald-400" />
                          <span>{c.phoneE164}</span>
                          <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-400">{c.phoneType}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500">No specific contacts assigned.</div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
              <button
                onClick={handleSaveLeadUpdates}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition shadow-md shadow-blue-600/30"
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Save Updates'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
