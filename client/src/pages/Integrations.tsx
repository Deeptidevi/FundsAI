import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  Puzzle,
  MessageSquare,
  Mail,
  Sparkles,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export const Integrations: React.FC = () => {
  const [health, setHealth] = useState<Record<string, { status: string; message: string; details?: Record<string, unknown> }>>({});
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const data = await api.getIntegrationsHealth();
      setHealth(data as unknown as typeof health);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const renderBadge = (status?: string) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle size={12} /> Connected & Verified
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle size={12} /> Verification Failed
          </span>
        );
      case 'unconfigured':
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600/40">
            <AlertTriangle size={12} /> Not Configured
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">External Integrations & Provider Health</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real connection validation for messaging channels, AI providers, and location APIs.
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Status</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meta WhatsApp Cloud API */}
        <div className="glass-panel p-5 rounded-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <MessageSquare size={20} />
                </div>
                <h3 className="text-sm font-bold text-white">Meta WhatsApp Cloud API</h3>
              </div>
              {renderBadge(health.whatsapp?.status)}
            </div>
            <p className="text-xs text-slate-400">
              Official Meta Graph API (v21.0) integration for two-way WhatsApp business messaging and automated template dispatch.
            </p>
            <div className="text-[11px] font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/80 text-slate-300">
              {health.whatsapp?.message || 'Checking status...'}
            </div>
          </div>
          <div className="pt-2 text-[10px] text-slate-500">
            Requires: <code>META_WA_ACCESS_TOKEN</code>, <code>META_WA_PHONE_NUMBER_ID</code>
          </div>
        </div>

        {/* Email SMTP Provider */}
        <div className="glass-panel p-5 rounded-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Mail size={20} />
                </div>
                <h3 className="text-sm font-bold text-white">Email Outreach (SMTP / API)</h3>
              </div>
              {renderBadge(health.email?.status)}
            </div>
            <p className="text-xs text-slate-400">
              Production transactional and B2B outreach email integration with threading, delivery tracking, and suppression checks.
            </p>
            <div className="text-[11px] font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/80 text-slate-300">
              {health.email?.message || 'Checking status...'}
            </div>
          </div>
          <div className="pt-2 text-[10px] text-slate-500">
            Requires: <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>
          </div>
        </div>

        {/* Google Gemini AI API */}
        <div className="glass-panel p-5 rounded-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-sm font-bold text-white">Google Gemini AI Engine</h3>
              </div>
              {renderBadge(health.ai?.status)}
            </div>
            <p className="text-xs text-slate-400">
              Provides structured B2B lead intent classification, RAG retrieval against company knowledge, and draft suggestions.
            </p>
            <div className="text-[11px] font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/80 text-slate-300">
              {health.ai?.message || 'Checking status...'}
            </div>
          </div>
          <div className="pt-2 text-[10px] text-slate-500">
            Requires: <code>GEMINI_API_KEY</code> (model: <code>gemini-2.5-flash</code>)
          </div>
        </div>

        {/* Google Places API (New) */}
        <div className="glass-panel p-5 rounded-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <MapPin size={20} />
                </div>
                <h3 className="text-sm font-bold text-white">Google Places API (New)</h3>
              </div>
              {renderBadge(health.places?.status)}
            </div>
            <p className="text-xs text-slate-400">
              Industrial business discovery, coordinate geocoding, and field mask extraction with 34 consumer exclusion filters.
            </p>
            <div className="text-[11px] font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/80 text-slate-300">
              {health.places?.message || 'Checking status...'}
            </div>
          </div>
          <div className="pt-2 text-[10px] text-slate-500">
            Requires: <code>GOOGLE_PLACES_API_KEY</code>
          </div>
        </div>
      </div>
    </div>
  );
};
