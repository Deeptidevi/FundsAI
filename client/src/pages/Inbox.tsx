import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  MessageSquare,
  Mail,
  Send,
  Sparkles,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Phone,
  Clock,
  Check,
  CheckCheck,
} from 'lucide-react';

export const Inbox: React.FC = () => {
  const [conversations, setConversations] = useState<Array<Record<string, unknown>>>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<Record<string, unknown> | null>(null);
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [draftSuggestion, setDraftSuggestion] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await api.getConversations();
      setConversations(res.conversations);
      if (res.conversations.length > 0 && !activeConvId) {
        selectConversation(res.conversations[0].id as string);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (id: string) => {
    setActiveConvId(id);
    setDraftSuggestion(null);
    try {
      const res = await api.getConversationMessages(id);
      setActiveConv(res.conversation);
      setMessages(res.messages);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || !messageInput.trim()) return;

    try {
      setSending(true);
      await api.sendInboxMessage(activeConvId, messageInput);
      setMessageInput('');
      setDraftSuggestion(null);
      selectConversation(activeConvId);
      fetchConversations();
    } catch (err: unknown) {
      alert(`Send failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSending(false);
    }
  };

  const handleSuggestAIDraft = async () => {
    if (!activeConvId) return;
    try {
      setSuggesting(true);
      const res = await api.suggestAIDraft(activeConvId);
      if (res.draftReply) {
        setDraftSuggestion(res.draftReply);
      }
    } catch (err: unknown) {
      alert(`AI draft error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSuggesting(false);
    }
  };

  const handleUpdateState = async (newState: string) => {
    if (!activeConvId) return;
    await api.updateConversationState(activeConvId, newState);
    selectConversation(activeConvId);
    fetchConversations();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-6rem)] flex gap-6">
      {/* Conversations List Sidebar */}
      <div className="w-80 glass-panel rounded-2xl flex flex-col shrink-0 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">Active Conversations</h2>
          <span className="text-[11px] text-slate-400">{conversations.length} total active threads</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading threads...</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No conversations yet. Inbound replies from email or WhatsApp will appear here automatically.
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeConvId;
              const isWa = c.channel === 'whatsapp';
              return (
                <div
                  key={c.id as string}
                  onClick={() => selectConversation(c.id as string)}
                  className={`p-3.5 cursor-pointer transition text-xs space-y-1 ${
                    isActive ? 'bg-blue-600/15 border-l-2 border-blue-500' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white truncate max-w-[160px]">{c.company_name as string}</span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      {isWa ? <MessageSquare size={12} className="text-emerald-400" /> : <Mail size={12} className="text-indigo-400" />}
                      <span className="uppercase">{c.channel as string}</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{c.contact_name as string || 'Representative'}</div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-mono">
                      {c.state as string}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Message Timeline & Chat Window */}
      <div className="flex-1 glass-panel rounded-2xl flex flex-col justify-between overflow-hidden">
        {activeConv ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{activeConv.company_name as string}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono uppercase">
                    {activeConv.channel as string}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                  <span>Contact: {String(activeConv.contact_name || 'Engineering Team')}</span>
                  {Boolean(activeConv.email) && <span>{String(activeConv.email)}</span>}
                  {Boolean(activeConv.phone_e164) && <span>{String(activeConv.phone_e164)}</span>}
                </div>
              </div>

              {/* State & AI Mode Controls */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    const currentMode = String(activeConv.ai_mode || 'autonomous');
                    const nextMode = currentMode === 'autonomous' ? 'copilot' : 'autonomous';
                    await api.toggleAiMode(activeConvId!, nextMode);
                    selectConversation(activeConvId!);
                    fetchConversations();
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
                    activeConv.ai_mode === 'autonomous'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 hover:bg-indigo-500/30'
                  }`}
                  title="Toggle Autonomous auto-reply vs Copilot review"
                >
                  <Sparkles size={12} />
                  <span>{activeConv.ai_mode === 'autonomous' ? 'AI: Autonomous' : 'AI: Copilot Drafts'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Status:</span>
                  <select
                    value={activeConv.state as string}
                    onChange={(e) => handleUpdateState(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                  >
                    <option value="engaged">Engaged</option>
                    <option value="interested">Interested</option>
                    <option value="demo_requested">Demo Requested</option>
                    <option value="pricing_requested">Pricing Requested</option>
                    <option value="meeting_requested">Meeting Requested</option>
                    <option value="followup_scheduled">Follow-up Scheduled</option>
                    <option value="human_handoff">Human Handoff</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="opted_out">Opted Out</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Message Bubble List */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-20 text-xs text-slate-500">No messages in this thread yet.</div>
              ) : (
                messages.map((m) => {
                  const isOutbound = m.direction === 'outbound';
                  return (
                    <div key={m.id as string} className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[70%] p-3.5 rounded-2xl text-xs space-y-1.5 ${
                          isOutbound
                            ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20'
                            : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/80'
                        }`}
                      >
                        {Boolean(m.subject) && (
                          <div className={`font-semibold pb-1 border-b ${isOutbound ? 'border-blue-500 text-blue-100' : 'border-slate-700 text-white'}`}>
                            {String(m.subject)}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{String(m.content || '')}</p>
                        <div className={`flex items-center justify-end gap-1 text-[10px] pt-1 ${isOutbound ? 'text-blue-200' : 'text-slate-400'}`}>
                          <span>{m.sent_at ? new Date(m.sent_at as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          {isOutbound && (
                            <span>
                              {m.delivery_status === 'delivered' || m.delivery_status === 'read' ? (
                                <CheckCheck size={12} className="text-emerald-300" />
                              ) : (
                                <Check size={12} />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* AI Suggested Draft Area */}
            {draftSuggestion && (
              <div className="p-3 mx-4 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                <div className="flex items-center justify-between text-amber-400 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} />
                    <span>Gemini AI Copilot Suggested Draft (Verified Knowledge)</span>
                  </div>
                  <button
                    onClick={() => {
                      setMessageInput(draftSuggestion);
                      setDraftSuggestion(null);
                    }}
                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px]"
                  >
                    Insert to Reply
                  </button>
                </div>
                <p className="text-slate-300 whitespace-pre-wrap text-[11px] font-sans">{draftSuggestion}</p>
              </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900/40 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSuggestAIDraft}
                disabled={suggesting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-semibold shrink-0 transition"
              >
                <Sparkles size={14} />
                <span>{suggesting ? 'Drafting...' : 'AI Suggest'}</span>
              </button>

              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type your message or insert AI draft..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />

              <button
                type="submit"
                disabled={sending || !messageInput.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-blue-600/30 shrink-0"
              >
                <Send size={14} />
                <span>{sending ? 'Sending...' : 'Send'}</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
            Select an active conversation thread from the left.
          </div>
        )}
      </div>
    </div>
  );
};
