// Types definition for G-MAPS Industrial Intelligence Platform

export type LeadTier = 'Gold' | 'Silver' | 'Bronze' | 'Unranked';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'engaged'
  | 'qualified'
  | 'meeting_scheduled'
  | 'won'
  | 'lost'
  | 'suppressed';

export type LeadPriority = 'high' | 'medium' | 'low';

export type PhoneType = 'Mobile' | 'Landline' | 'TollFree' | 'Unknown';

export interface LeadContact {
  id: string;
  leadId: string;
  contactName?: string;
  designation?: string;
  email?: string;
  phoneRaw?: string;
  phoneE164?: string;
  phoneType: PhoneType;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  placeId?: string;
  companyName: string;
  primaryType?: string;
  tier: LeadTier;
  rating: number;
  reviewCount: number;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  googleMapsUrl?: string;
  source: string;
  status: LeadStatus;
  priority: LeadPriority;
  assignedTo?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
  contacts?: LeadContact[];
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus =
  | 'draft'
  | 'validating'
  | 'pending_approval'
  | 'approved'
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type OutreachChannel = 'email' | 'whatsapp';

export interface Campaign {
  id: string;
  name: string;
  purpose?: string;
  channels: OutreachChannel[];
  status: CampaignStatus;
  targetCriteria?: Record<string, unknown>;
  emailSubject?: string;
  emailBodyTemplate?: string;
  whatsappTemplateName?: string;
  whatsappTemplateNamespace?: string;
  aiPersonalizationRules?: Record<string, unknown>;
  dailySendLimit: number;
  totalLeadsTargeted: number;
  approvedBy?: string;
  approvedAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConversationState =
  | 'new'
  | 'outreach_sent'
  | 'awaiting_reply'
  | 'engaged'
  | 'interested'
  | 'demo_requested'
  | 'information_requested'
  | 'pricing_requested'
  | 'meeting_requested'
  | 'followup_scheduled'
  | 'not_interested'
  | 'human_handoff'
  | 'opted_out'
  | 'resolved';

export interface Conversation {
  id: string;
  leadId: string;
  contactId?: string;
  channel: OutreachChannel;
  externalThreadId?: string;
  state: ConversationState;
  aiMode: 'autonomous' | 'copilot_draft' | 'paused';
  assignedTo?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageDirection = 'inbound' | 'outbound';
export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';

export interface Message {
  id: string;
  conversationId: string;
  campaignId?: string;
  direction: MessageDirection;
  senderIdentifier: string;
  recipientIdentifier: string;
  channel: OutreachChannel;
  messageType: string;
  content: string;
  subject?: string;
  providerMessageId?: string;
  deliveryStatus: DeliveryStatus;
  isAiGenerated: boolean;
  aiIntent?: string;
  aiConfidence?: number;
  errorDetails?: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface CompanyKnowledgeItem {
  id: string;
  category:
    | 'overview'
    | 'products'
    | 'services'
    | 'pricing_policy'
    | 'faq'
    | 'prohibited_claims'
    | 'escalation_policy'
    | 'template';
  title: string;
  content: string;
  isActive: boolean;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportSummary {
  jobId: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  errors: Array<{
    rowNumber: number;
    fieldName?: string;
    rawValue?: string;
    errorMessage: string;
  }>;
}

export interface DashboardMetrics {
  totalLeads: number;
  validLeads: number;
  invalidLeads: number;
  duplicates: number;
  eligibleLeads: number;
  pendingApprovals: number;
  emailsSent: number;
  emailFailures: number;
  whatsappSent: number;
  whatsappFailures: number;
  repliesReceived: number;
  interestedLeads: number;
  meetingsRequested: number;
  humanHandoffs: number;
  optOuts: number;
  pendingJobs: number;
}

export type AIIntentType =
  | 'INTERESTED'
  | 'DEMO_REQUESTED'
  | 'PRICING_QUERY'
  | 'INFORMATION_REQUESTED'
  | 'MEETING_REQUESTED'
  | 'FOLLOW_UP_LATER'
  | 'OBJECTION'
  | 'NOT_INTERESTED'
  | 'UNSUBSCRIBE'
  | 'OUT_OF_OFFICE'
  | 'COMPLAINT'
  | 'WRONG_CONTACT'
  | 'HUMAN_HANDOFF'
  | 'UNKNOWN';

export interface CompanyResearch {
  id: string;
  leadId: string;
  companyName: string;
  industry?: string;
  productsServices?: string;
  businessSummary?: string;
  valuePropositions: string[];
  sources: string[];
  verifiedFacts: Record<string, unknown>;
  researchedAt: string;
}

export interface EmailDraft {
  id: string;
  campaignId?: string;
  leadId: string;
  contactId?: string;
  subject: string;
  htmlContent: string;
  plainContent?: string;
  researchId?: string;
  status: 'draft' | 'approved' | 'queued' | 'sent' | 'rejected';
  aiModel?: string;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

export type ActionButtonType = 'interested' | 'send_demo' | 'maybe_later' | 'not_interested' | 'unsubscribe';

export interface ActionToken {
  token: string;
  conversationId: string;
  leadId: string;
  campaignId?: string;
  actionType: ActionButtonType;
  recipientEmail: string;
  expiresAt: string;
  isUsed: boolean;
  usedAt?: string;
}

export interface AiDecisionLog {
  id: string;
  conversationId?: string;
  messageId?: string;
  incomingText?: string;
  intentClassified: AIIntentType;
  confidence: number;
  decisionSummary: string;
  responseGenerated?: string;
  knowledgeConsulted?: string[];
  safetyValidation: 'passed' | 'flagged_for_human' | 'suppressed';
  actionTaken: 'auto_replied' | 'human_escalated' | 'opted_out' | 'followup_scheduled';
  createdAt: string;
}

// --- EXPORT & AI DASHBOARD WEBHOOK TYPES ---
export type ExportJobType = 'excel_download' | 'ai_dashboard_webhook';
export type ExportJobStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type ExportBatchStatus = 'pending' | 'in_progress' | 'success' | 'retrying' | 'failed' | 'cancelled';

export interface ExportJob {
  id: string;
  exportType: ExportJobType;
  status: ExportJobStatus;
  totalRecords: number;
  batchSize: number;
  totalBatches: number;
  successfulBatches: number;
  failedBatches: number;
  deliveredRecords: number;
  targetWebhookUrl?: string;
  idempotencyKey?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  batches?: ExportBatch[];
}

export interface ExportBatch {
  id: string;
  exportJobId: string;
  batchNumber: number;
  totalBatches: number;
  recordStartIndex: number;
  recordEndIndex: number;
  recordCount: number;
  companyIds: string[];
  status: ExportBatchStatus;
  retryCount: number;
  maxRetries: number;
  idempotencyKey: string;
  checksumSha256?: string;
  httpStatus?: number;
  errorMessage?: string;
  acknowledgementData?: Record<string, unknown>;
  sentAt?: string;
  acknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookBatchMetadata {
  exportId: string;
  batchId: string;
  batchNumber: number;
  totalBatches: number;
  batchRecordCount: number;
  totalRecordCount: number;
  schemaVersion: string;
  fileName: string;
  checksumSha256: string;
  timestamp: string;
  senderSystem: string;
  source?: string;
  // Backward compatibility fields
  totalRecords?: number;
  recordCount?: number;
  idempotencyKey?: string;
  batchRecordStart?: number;
  batchRecordEnd?: number;
}


