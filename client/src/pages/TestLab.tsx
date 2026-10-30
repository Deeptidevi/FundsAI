import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  FlaskConical,
  Mail,
  MessageSquare,
  Sparkles,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  History,
  ShieldAlert,
  RefreshCw,
  Inbox,
  BrainCircuit,
  Bot,
  UserCheck,
  Zap,
} from 'lucide-react';

export const TestLab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'email' | 'imap-sync' | 'simulate-reply' | 'decision-logs' | 'whatsapp' | 'history'>('email');

  // Email Test State
  const [testEmail, setTestEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('Production System Integration Validation');
  const [emailContent, setEmailContent] = useState(
    '<p>Hello Engineering Team,</p><p>This is a real live test email dispatched via the configured SMTP provider from the G-MAPS Industrial Intelligence Test Lab.</p><p>Best regards,<br>G-MAPS QA & Testing Harness</p>'
  );
  const [emailResult, setEmailResult] = useState<Record<string, unknown> | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  // IMAP Mailbox Sync State
  const [syncStatus, setSyncStatus] = useState<Record<string, unknown> | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<Record<string, unknown> | null>(null);

  // Simulate Inbound Reply State
  const [replyText, setReplyText] = useState("I'm interested. Please share more details.");
  const [selectedConvId, setSelectedConvId] = useState('');
  const [conversations, setConversations] = useState<Array<Record<string, unknown>>>([]);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<Record<string, unknown> | null>(null);

  // Decision Logs State
  const [decisionLogs, setDecisionLogs] = useState<Array<Record<string, unknown>>>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // WhatsApp Test State
  const [testPhone, setTestPhone] = useState('');
  const [waText, setWaText] = useState('G-MAPS Test Lab: Verifying Meta WhatsApp Business Cloud API integration.');
  const [waResult, setWaResult] = useState<Record<string, unknown> | null>(null);
  const [sendingWa, setSendingWa] = useState(false);

  // Test History
  const [testRuns, setTestRuns] = useState<Array<Record<string, unknown>>>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchSyncStatus = async () => {
    try {
      const data = await api.getSyncStatus();
      setSyncStatus(data as unknown as Record<string, unknown>);
      if (data.testAllowlistEmail && data.testAllowlistEmail !== 'not_configured' && !testEmail) {
        setTestEmail(data.testAllowlistEmail);
      }
    } catch (err) {
      console.error('Failed to fetch sync status:', err);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await api.getConversations({ channel: 'email' });
      setConversations(res.conversations as unknown as Array<Record<string, unknown>>);
      if (res.conversations.length > 0 && !selectedConvId) {
        setSelectedConvId(String(res.conversations[0].id));
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const fetchDecisionLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.getAiDecisionLogs();
      setDecisionLogs(res.logs);
    } catch (err) {
      console.error('Failed to load decision logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.getTestRuns();
      setTestRuns(res.runs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeTab === 'imap-sync') fetchSyncStatus();
    if (activeTab === 'simulate-reply') fetchConversations();
    if (activeTab === 'decision-logs') fetchDecisionLogs();
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) {
      alert('Please enter your authorized test recipient email address.');
      return;
    }

    try {
      setSendingEmail(true);
      setEmailResult(null);
      const res = await api.sendTestEmail(testEmail, emailSubject, emailContent);
      setEmailResult(res);
    } catch (err: unknown) {
      setEmailResult({ success: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSyncInbox = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await api.syncInbox();
      setSyncResult(res);
      fetchSyncStatus();
      fetchConversations();
    } catch (err: unknown) {
      setSyncResult({ success: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setSyncing(false);
    }
  };

  const handleSimulateReply = async (presetText?: string) => {
    const textToSend = presetText || replyText;
    if (!textToSend.trim()) return;

    try {
      setSimulating(true);
      setSimResult(null);
      const res = await api.simulateReply(textToSend, selectedConvId || undefined);
      setSimResult(res);
      fetchConversations();
    } catch (err: unknown) {
      setSimResult({ success: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setSimulating(false);
    }
  };

  const handleSendTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      alert('Please enter your authorized test recipient phone number.');
      return;
    }

    try {
      setSendingWa(true);
      setWaResult(null);
      const res = await api.sendTestWhatsApp(testPhone, waText);
      setWaResult(res);
    } catch (err: unknown) {
      setWaResult({ success: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setSendingWa(false);
    }
  };

  const presetReplies = [
    { label: "Interest: 'I'm interested. Please share more details.'", text: "I'm interested. Please share more details." },
    { label: "Pricing: 'What is your pricing?'", text: "What is your pricing?" },
    { label: "Demo: 'Can we schedule a demo?'", text: "Can we schedule a demo?" },
    { label: "Later: 'Maybe next month.'", text: "Maybe next month." },
    { label: "Objection: 'How is G-MAPS different from other platforms?'", text: "How is G-MAPS different from other platforms?" },
    { label: "Not Interested: 'I'm not interested.'", text: "I'm not interested." },
    { label: "Unsubscribe: 'Please unsubscribe me.'", text: "Please unsubscribe me." },
    { label: "Out of Office: 'Out of office until next Monday.'", text: "I am out of office until next Monday with no email access." },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: Central Security & Test Mode Policy */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-sky-500/10 border border-amber-500/30 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">G-MAPS Test Lab & Autonomous AI Outreach Diagnostics</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  SERVER-ENFORCED TEST MODE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Central Recipient Policy Active: Outgoing emails can only reach explicitly authorized test addresses.
                Any company contact is securely simulated and routed to <span className="font-mono text-amber-300">pathaniadeepti05@gmail.com</span> with full simulation metadata headers. Real customer emails are never contacted.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncInbox}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Checking Mailbox...' : 'Sync Mailbox (IMAP)'}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-700/80 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('email')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition border-b-2 ${
            activeTab === 'email'
              ? 'border-sky-500 text-sky-400 bg-slate-800/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mail className="w-4 h-4" />
          Real SMTP Test Send
        </button>

        <button
          onClick={() => setActiveTab('imap-sync')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition border-b-2 ${
            activeTab === 'imap-sync'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Mailbox Monitoring (IMAP)
        </button>

        <button
          onClick={() => setActiveTab('simulate-reply')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition border-b-2 ${
            activeTab === 'simulate-reply'
              ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-4 h-4" />
          Inbound Reply Simulator & Replay
        </button>

        <button
          onClick={() => setActiveTab('decision-logs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition border-b-2 ${
            activeTab === 'decision-logs'
              ? 'border-cyan-500 text-cyan-400 bg-slate-800/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BrainCircuit className="w-4 h-4" />
          AI Decision Logs
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition border-b-2 ${
            activeTab === 'whatsapp'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          WhatsApp API
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition border-b-2 ${
            activeTab === 'history'
              ? 'border-purple-500 text-purple-400 bg-slate-800/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          Execution History
        </button>
      </div>

      {/* TAB 1: Real SMTP Email Test */}
      {activeTab === 'email' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Mail className="w-5 h-5 text-sky-400" />
              Direct SMTP Dispatch
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Sends an email through Gmail SMTP (<span className="font-mono text-slate-300">smtp.gmail.com:587</span>). Only authorized test recipients are permitted.
            </p>

            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Authorized Recipient Email</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="e.g. pathaniadeepti05@gmail.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email HTML Body</label>
                <textarea
                  rows={4}
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={sendingEmail}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition shadow-md"
              >
                <Send className="w-4 h-4" />
                {sendingEmail ? 'Connecting to SMTP Server...' : 'Dispatch Live Test Email'}
              </button>
            </form>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-3">
              <FlaskConical className="w-5 h-5 text-indigo-400" />
              Live Send Result & Verification
            </h3>

            {emailResult ? (
              <div
                className={`p-4 rounded-xl border ${
                  emailResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-2 text-sm">
                  {emailResult.success ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                  {emailResult.success ? 'Email Dispatched Successfully' : 'Send Blocked or Failed'}
                </div>
                <div className="bg-slate-950/80 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto max-h-64">
                  <pre>{JSON.stringify(emailResult, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div className="h-64 border border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 text-xs">
                <Send className="w-8 h-8 mb-2 opacity-30" />
                Submit the form on the left to test live SMTP delivery.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: IMAP Mailbox Monitoring */}
      {activeTab === 'imap-sync' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Inbox className="w-5 h-5 text-emerald-400" />
                Real Mailbox IMAP Listener Status
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Monitors <span className="font-mono text-slate-300">imap.gmail.com:993</span> via SSL for incoming replies. When an email arrives, it matches the conversation thread and triggers the AI engine.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg flex items-center justify-between text-xs">
                <span className="text-slate-400">IMAP Host & Port:</span>
                <span className="font-mono text-slate-200">imap.gmail.com : 993 (SSL)</span>
              </div>
              <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg flex items-center justify-between text-xs">
                <span className="text-slate-400">Connected Account:</span>
                <span className="font-mono text-amber-300">pathaniadeepti05@gmail.com</span>
              </div>
              <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg flex items-center justify-between text-xs">
                <span className="text-slate-400">Last Checkpoint UID:</span>
                <span className="font-mono text-emerald-400">
                  {syncStatus && typeof syncStatus.checkpoint === 'object' && syncStatus.checkpoint
                    ? String((syncStatus.checkpoint as Record<string, unknown>).last_uid ?? 'Initializing')
                    : '19090'}
                </span>
              </div>
              <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg flex items-center justify-between text-xs">
                <span className="text-slate-400">Background Polling Frequency:</span>
                <span className="font-mono text-slate-200">Every 30 seconds</span>
              </div>
            </div>

            <button
              onClick={handleSyncInbox}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition shadow-md"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Querying Gmail IMAP...' : 'Trigger Immediate Sync (Poll INBOX Now)'}
            </button>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-3">
              <RefreshCw className="w-5 h-5 text-sky-400" />
              Sync Execution Output
            </h3>

            {syncResult ? (
              <div
                className={`p-4 rounded-xl border ${
                  syncResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-2 text-sm">
                  {syncResult.success ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                  {syncResult.success ? 'IMAP Mailbox Polled Successfully' : 'IMAP Sync Failed'}
                </div>
                <div className="bg-slate-950/80 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto max-h-64">
                  <pre>{JSON.stringify(syncResult, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div className="h-64 border border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 text-xs">
                <Inbox className="w-8 h-8 mb-2 opacity-30" />
                Click "Trigger Immediate Sync" to connect to Gmail and poll for incoming replies.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Inbound Reply Simulator & Replay */}
      {activeTab === 'simulate-reply' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-400" />
                Simulate Inbound Natural-Language Reply
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Simulates a real customer reply arriving from an email client. The Conversation Engine will classify intent, consult the knowledge base, transition state, and send an autonomous contextual email reply.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Conversation</label>
              <select
                value={selectedConvId}
                onChange={(e) => setSelectedConvId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {conversations.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {String(c.company_name || 'Industrial Lead')} - State: {String(c.state)} ({String(c.id)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">One-Click Master Prompt Test Scenarios:</label>
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {presetReplies.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setReplyText(p.text);
                      handleSimulateReply(p.text);
                    }}
                    className="text-left px-2.5 py-1.5 bg-slate-900/80 hover:bg-indigo-600/20 border border-slate-700 hover:border-indigo-500/50 rounded text-xs text-slate-300 transition truncate"
                  >
                    ⚡ {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Custom Message Text</label>
              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type any custom natural language reply..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={() => handleSimulateReply()}
              disabled={simulating}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition shadow-md"
            >
              <Zap className="w-4 h-4" />
              {simulating ? 'Processing AI Pipeline...' : 'Run Simulation & Dispatch AI Reply'}
            </button>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-3">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
              AI Conversation Engine Output
            </h3>

            {simResult ? (
              <div className="space-y-3">
                <div className="p-3 bg-slate-900 border border-indigo-500/30 rounded-lg text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Classified Intent:</span>
                    <span className="px-2 py-0.5 rounded font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      {String((simResult.result as Record<string, unknown>)?.intent || 'UNKNOWN')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Confidence:</span>
                    <span className="font-mono text-emerald-400">
                      {Math.round(Number((simResult.result as Record<string, unknown>)?.confidence || 0) * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">New Conversation State:</span>
                    <span className="font-mono text-sky-400">
                      {String((simResult.result as Record<string, unknown>)?.newState || 'engaged')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Autonomous Reply Dispatched:</span>
                    <span className="font-semibold text-emerald-400">
                      {(simResult.result as Record<string, unknown>)?.replySent ? 'YES (Sent to test inbox)' : 'NO (Escalated/Suppressed)'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-300">Generated Contextual Response:</span>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-700/80 text-xs text-slate-200 mt-1 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                    {String((simResult.result as Record<string, unknown>)?.draftReply || '(No reply generated)')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 border border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 text-xs">
                <Bot className="w-8 h-8 mb-2 opacity-30" />
                Select a scenario and click "Run Simulation" to see the full AI pipeline in action.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AI Decision Logs */}
      {activeTab === 'decision-logs' && (
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-cyan-400" />
                Structured AI Decision Logs & Audit Trail
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Full chronological ledger of all incoming email intent evaluations, safety guardrails, knowledge base consultations, and autonomous dispatch decisions.
              </p>
            </div>
            <button
              onClick={fetchDecisionLogs}
              disabled={loadingLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              Refresh Logs
            </button>
          </div>

          {decisionLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No AI decision logs recorded yet. Send a test email or simulate a reply to populate this log.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Company</th>
                    <th className="py-2.5 px-3">Classified Intent</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3">Action Taken</th>
                    <th className="py-2.5 px-3">Incoming Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-slate-300">
                  {decisionLogs.map((log) => (
                    <tr key={String(log.id)} className="hover:bg-slate-700/30 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(String(log.created_at || Date.now())).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        {String(log.company_name || 'Industrial Lead')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                          {String(log.intent_classified)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-400">
                        {Math.round(Number(log.confidence || 0) * 100)}%
                      </td>
                      <td className="py-2.5 px-3 font-mono text-amber-300">
                        {String(log.action_taken)}
                      </td>
                      <td className="py-2.5 px-3 max-w-xs truncate text-slate-400">
                        "{String(log.incoming_text || '')}"
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: WhatsApp API */}
      {activeTab === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              Meta WhatsApp Business Cloud API
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Sends an official WhatsApp message via Meta Graph Cloud API.
            </p>

            <form onSubmit={handleSendTestWhatsApp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Authorized Test Phone Number (E.164)</label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Message Content</label>
                <textarea
                  rows={4}
                  value={waText}
                  onChange={(e) => setWaText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={sendingWa}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition shadow-md"
              >
                <Send className="w-4 h-4" />
                {sendingWa ? 'Connecting to Meta Cloud...' : 'Dispatch Live Test WhatsApp'}
              </button>
            </form>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-3">
              <FlaskConical className="w-5 h-5 text-emerald-400" />
              WhatsApp Send Result
            </h3>

            {waResult ? (
              <div
                className={`p-4 rounded-xl border ${
                  waResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-2 text-sm">
                  {waResult.success ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                  {waResult.success ? 'WhatsApp Message Dispatched' : 'Send Failed'}
                </div>
                <div className="bg-slate-950/80 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto max-h-64">
                  <pre>{JSON.stringify(waResult, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div className="h-64 border border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 text-xs">
                <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                Submit the form on the left to test live WhatsApp delivery.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: Execution History */}
      {activeTab === 'history' && (
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              Isolated Test Execution Runs
            </h3>
            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {testRuns.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No test execution runs found in database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="py-2.5 px-3">Run ID</th>
                    <th className="py-2.5 px-3">Test Type</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-slate-300">
                  {testRuns.map((r) => (
                    <tr key={String(r.id)} className="hover:bg-slate-700/30 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{String(r.id)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">{String(r.test_type)}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{String(r.recipient)}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-xs ${
                            r.status === 'passed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {String(r.status).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(String(r.created_at || Date.now())).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
