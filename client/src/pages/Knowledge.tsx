import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CompanyKnowledgeItem } from '@gmaps/shared';
import {
  BookOpen,
  Plus,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  CheckCircle,
  FileText,
} from 'lucide-react';

export const Knowledge: React.FC = () => {
  const [items, setItems] = useState<CompanyKnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [category, setCategory] = useState<CompanyKnowledgeItem['category']>('overview');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchKnowledge = async () => {
    try {
      setLoading(true);
      const res = await api.getKnowledge();
      setItems(res.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setSubmitting(true);
      await api.createKnowledge({ category, title, content });
      setShowModal(false);
      setTitle('');
      setContent('');
      fetchKnowledge();
    } catch (err: unknown) {
      alert(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this knowledge rule?')) return;
    await api.deleteKnowledge(id);
    fetchKnowledge();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Company Knowledge Base (RAG Context)</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified corporate information used by the Gemini AI conversation engine. AI answers strictly draw from these entries.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow-lg shadow-blue-600/20"
        >
          <Plus size={16} />
          <span>Add Knowledge Entry</span>
        </button>
      </div>

      {/* Grid of Knowledge entries */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-16 text-slate-500 text-xs">Loading verified entries...</div>
        ) : items.length === 0 ? (
          <div className="col-span-3 glass-panel p-8 rounded-2xl text-center space-y-2">
            <BookOpen size={32} className="mx-auto text-slate-600" />
            <h3 className="text-sm font-semibold text-white">Knowledge Base is Empty</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Add your verified company details, pricing boundaries, prohibited claims, and escalation contacts to activate AI conversation features.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="glass-panel p-4 rounded-xl flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {item.category}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-slate-500 hover:text-rose-400 transition"
                    title="Delete entry"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <h4 className="font-semibold text-sm text-white">{item.title}</h4>
                <p className="text-xs text-slate-300 line-clamp-4 whitespace-pre-wrap">{item.content}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck size={12} /> Verified RAG Active
                </span>
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-sm text-white">Add Verified Knowledge Rule</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CompanyKnowledgeItem['category'])}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                >
                  <option value="overview">Company Overview</option>
                  <option value="products">Products & Capabilities</option>
                  <option value="services">Manufacturing Services</option>
                  <option value="pricing_policy">Approved Pricing Rules</option>
                  <option value="faq">Frequently Asked Questions (FAQ)</option>
                  <option value="prohibited_claims">Prohibited Claims & Boundaries</option>
                  <option value="escalation_policy">Escalation & Human Handoff Policy</option>
                  <option value="template">Outreach Templates</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Title / Topic *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Standard Payment Terms & Custom Tooling Lead Time"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Verified Knowledge Content *</label>
                <textarea
                  rows={6}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Detail the verified facts, tolerances, lead times, or boundaries here. AI will strictly respect these."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-sans text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30"
                >
                  {submitting ? 'Saving...' : 'Save Knowledge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
