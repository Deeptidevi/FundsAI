// Typed API Client for G-MAPS Backend
import {
  Lead,
  Campaign,
  DashboardMetrics,
  CompanyKnowledgeItem,
  ImportSummary,
} from '@gmaps/shared';

const API_BASE = '/api';

export const api = {
  async getDashboard(): Promise<{
    metrics: DashboardMetrics;
    tierDistribution: Array<{ tier: string; count: number }>;
    cityDistribution: Array<{ city: string; count: number }>;
    statusDistribution: Array<{ status: string; count: number }>;
  }> {
    const res = await fetch(`${API_BASE}/analytics/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
    return res.json();
  },

  async getIntegrationsHealth(): Promise<Record<string, { status: string; message: string; details?: unknown }>> {
    const res = await fetch(`${API_BASE}/analytics/integrations-health`);
    if (!res.ok) throw new Error('Failed to fetch integrations health');
    return res.json();
  },

  async getLeads(params?: { limit?: number; offset?: number; status?: string; city?: string; tier?: string }): Promise<{
    leads: Lead[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.status) query.set('status', params.status);
    if (params?.city) query.set('city', params.city);
    if (params?.tier) query.set('tier', params.tier);

    const res = await fetch(`${API_BASE}/leads?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch leads');
    return res.json();
  },

  async getLeadById(id: string): Promise<{ lead: Lead }> {
    const res = await fetch(`${API_BASE}/leads/${id}`);
    if (!res.ok) throw new Error('Failed to fetch lead');
    return res.json();
  },

  async updateLead(id: string, updates: { status?: string; priority?: string; notes?: string }): Promise<{ lead: Lead }> {
    const res = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update lead');
    return res.json();
  },

  async previewImport(file: File): Promise<{
    headers: string[];
    previewRows: Record<string, string>[];
    totalRows: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/leads/import/preview`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to preview file');
    }
    return res.json();
  },

  async executeImport(file: File, mapping: Record<string, string>): Promise<{ summary: ImportSummary }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    const res = await fetch(`${API_BASE}/leads/import/execute`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to execute import');
    }
    return res.json();
  },

  async getCampaigns(): Promise<{ campaigns: Campaign[] }> {
    const res = await fetch(`${API_BASE}/campaigns`);
    if (!res.ok) throw new Error('Failed to fetch campaigns');
    return res.json();
  },

  async createCampaign(data: {
    name: string;
    purpose?: string;
    channels: string[];
    emailSubject?: string;
    emailBodyTemplate?: string;
    whatsappTemplateName?: string;
    dailySendLimit?: number;
    leadIds: string[];
  }): Promise<{ campaignId: string; totalTargeted: number }> {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create campaign');
    }
    return res.json();
  },

  async getCampaignPreview(id: string): Promise<{
    campaignId: string;
    samplePreviews: Array<{
      leadId: string;
      companyName: string;
      recipient: string;
      channel: string;
      renderedSubject?: string;
      renderedContent: string;
      isSuppressed: boolean;
    }>;
    totalEligible: number;
    totalSuppressed: number;
  }> {
    const res = await fetch(`${API_BASE}/campaigns/${id}/preview`);
    if (!res.ok) throw new Error('Failed to generate campaign preview');
    return res.json();
  },

  async approveCampaign(id: string): Promise<{ success: boolean; enqueuedJobs: number; message: string }> {
    const res = await fetch(`${API_BASE}/campaigns/${id}/approve`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to approve campaign');
    }
    return res.json();
  },

  async pauseCampaign(id: string): Promise<void> {
    await fetch(`${API_BASE}/campaigns/${id}/pause`, { method: 'POST' });
  },

  async resumeCampaign(id: string): Promise<void> {
    await fetch(`${API_BASE}/campaigns/${id}/resume`, { method: 'POST' });
  },

  async cancelCampaign(id: string): Promise<void> {
    await fetch(`${API_BASE}/campaigns/${id}/cancel`, { method: 'POST' });
  },

  async getConversations(params?: { channel?: string; state?: string }): Promise<{ conversations: Array<Record<string, unknown>> }> {
    const query = new URLSearchParams();
    if (params?.channel) query.set('channel', params.channel);
    if (params?.state) query.set('state', params.state);
    const res = await fetch(`${API_BASE}/inbox?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  },

  async getConversationMessages(id: string): Promise<{ conversation: Record<string, unknown>; messages: Array<Record<string, unknown>> }> {
    const res = await fetch(`${API_BASE}/inbox/${id}/messages`);
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  },

  async sendInboxMessage(conversationId: string, content: string, subject?: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/inbox/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, subject }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send message');
    }
    return res.json();
  },

  async updateConversationState(id: string, state: string): Promise<void> {
    await fetch(`${API_BASE}/inbox/${id}/state`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });
  },

  async suggestAIDraft(conversationId: string): Promise<{ draftReply?: string; newState: string; humanHandoffRequired: boolean }> {
    const res = await fetch(`${API_BASE}/inbox/${conversationId}/suggest-draft`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to generate AI draft');
    return res.json();
  },

  async getKnowledge(): Promise<{ items: CompanyKnowledgeItem[] }> {
    const res = await fetch(`${API_BASE}/knowledge`);
    if (!res.ok) throw new Error('Failed to fetch company knowledge');
    return res.json();
  },

  async createKnowledge(data: { category: string; title: string; content: string }): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`${API_BASE}/knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save knowledge item');
    return res.json();
  },

  async deleteKnowledge(id: string): Promise<void> {
    await fetch(`${API_BASE}/knowledge/${id}`, { method: 'DELETE' });
  },

  // Test Lab APIs
  async sendTestEmail(recipient: string, subject: string, content: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/test-lab/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient, subject, content }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Email test failed');
    return data;
  },

  async sendTestWhatsApp(phone: string, text: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/test-lab/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'WhatsApp test failed');
    return data;
  },

  async runAiSandbox(message: string, companyName?: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/test-lab/ai-sandbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, companyName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'AI Sandbox run failed');
    return data;
  },

  async getTestRuns(): Promise<{ runs: Array<Record<string, unknown>> }> {
    const res = await fetch(`${API_BASE}/test-lab/runs`);
    if (!res.ok) throw new Error('Failed to fetch test runs');
    return res.json();
  },

  async resolveLocation(query: string): Promise<{
    found: boolean;
    resolvedLocation?: {
      name: string;
      formattedName: string;
      detailedAddress: string;
      placeId: string;
      country: string;
      latitude: number;
      longitude: number;
      phone?: string;
      rating?: number | null;
      userRatingsTotal?: number;
      website?: string;
      googleMapsUrl?: string;
      primaryType?: string;
      types?: string[];
      resolutionStatus: string;
    };
    matches: Array<{
      name: string;
      formattedName: string;
      detailedAddress: string;
      placeId: string;
      latitude: number;
      longitude: number;
      primaryType?: string;
    }>;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/places/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || err.error || 'Failed to resolve location');
    }
    return res.json();
  },

  async getPlacesStatus(): Promise<{
    configured: boolean;
    status: 'CONNECTED' | 'ERROR' | 'QUOTA_EXCEEDED';
    maskedKey: string;
    responseTimeMs?: number;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/places/status`);
    if (!res.ok) throw new Error('Failed to fetch Places API status');
    return res.json();
  },

  async searchPlaces(data: {
    query?: string;
    latitude: number;
    longitude: number;
    radiusKm: number;
    directionBias?: string;
    category?: string;
    anchorName?: string;
  }): Promise<{
    places: Array<Record<string, unknown>>;
    filteredOutCount: number;
    diagnostics?: {
      resolvedCenter: { lat: number; lng: number };
      radiusKm: number;
      directionBias: string;
      tilesCount: number;
      queriesExecuted: string[];
      totalRawResults: number;
      duplicatesRemoved: number;
      branchesPreserved: number;
      consumerFilteredOut: number;
      outsidePerimeterFilteredOut: number;
      finalDiscoveredCount: number;
      searchDurationMs: number;
      apiStatus: 'OK' | 'NO_RESULTS' | 'PARTIAL' | 'ERROR';
      errorMessage?: string;
    };
  }> {
    const res = await fetch(`${API_BASE}/places/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Search failed');
    }
    return res.json();
  },

  async syncInbox(): Promise<{
    success: boolean;
    messagesProcessed: number;
    matchedConversations: number;
    lastUid?: number;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE}/test-lab/sync-inbox`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'IMAP sync failed');
    return data;
  },

  async getSyncStatus(): Promise<{
    checkpoint: { mailbox: string; last_uid: number; last_synced_at?: string; status: string; last_error?: string };
    emailHealth: { status: string; message: string };
    geminiHealth: { status: string; message: string };
    testAllowlistEmail: string;
    emailMode: string;
  }> {
    const res = await fetch(`${API_BASE}/test-lab/sync-status`);
    if (!res.ok) throw new Error('Failed to fetch sync status');
    return res.json();
  },

  async researchCompany(leadId: string, forceRefresh = false): Promise<{ success: boolean; research: Record<string, unknown> }> {
    const res = await fetch(`${API_BASE}/test-lab/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, forceRefresh }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Company research failed');
    return data;
  },

  async generatePersonalizedDraft(leadId: string, recipientEmail?: string, campaignId?: string): Promise<{
    success: boolean;
    draft: { id: string; subject: string; htmlContent: string; plainContent: string; valuePropositions: string[] };
  }> {
    const res = await fetch(`${API_BASE}/test-lab/generate-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, recipientEmail, campaignId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Draft generation failed');
    return data;
  },

  async simulateReply(messageText: string, conversationId?: string): Promise<{
    success: boolean;
    conversationId: string;
    result: {
      newState: string;
      intent: string;
      confidence: number;
      draftReply?: string;
      replySent: boolean;
      humanHandoffRequired: boolean;
      decisionSummary: string;
    };
  }> {
    const res = await fetch(`${API_BASE}/test-lab/simulate-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageText, conversationId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Simulation failed');
    return data;
  },

  async getAiDecisionLogs(): Promise<{ logs: Array<Record<string, unknown>> }> {
    const res = await fetch(`${API_BASE}/test-lab/ai-decision-logs`);
    if (!res.ok) throw new Error('Failed to fetch AI decision logs');
    return res.json();
  },

  async toggleAiMode(conversationId: string, aiMode: 'autonomous' | 'copilot'): Promise<{ success: boolean; aiMode: string }> {
    const res = await fetch(`${API_BASE}/inbox/${conversationId}/ai-mode`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiMode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to toggle AI mode');
    return data;
  },
};
