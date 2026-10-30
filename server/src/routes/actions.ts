// Interactive Email Action Handler & Anti-Scanner Intent Confirmation
import { Hono } from 'hono';
import { html } from 'hono/html';
import crypto from 'node:crypto';
import { db, dbQueries } from '../db/schema.js';
import { conversationEngine } from '../ai/conversationEngine.js';

export const actionRoutes = new Hono();

/**
 * GET /api/actions/click?token=...
 * Safe intent confirmation page.
 * Prevents security scanners and mail filter bots from executing actions automatically on link prefetch.
 */
actionRoutes.get('/click', (c) => {
  const tokenStr = c.req.query('token');

  if (!tokenStr) {
    return c.html(
      renderStatusPage(
        'Invalid Request',
        'No security action token was provided.',
        'error'
      ),
      400
    );
  }

  const tokenRecord = dbQueries.getActionToken(tokenStr);

  if (!tokenRecord) {
    return c.html(
      renderStatusPage(
        'Action Expired or Invalid',
        'This action link is either expired or does not exist.',
        'error'
      ),
      404
    );
  }

  if (tokenRecord.is_used) {
    return c.html(
      renderStatusPage(
        'Action Already Recorded',
        `Your selection (${tokenRecord.action_type}) has already been recorded and processed. Thank you!`,
        'info'
      )
    );
  }

  const actionLabels: Record<string, { title: string; desc: string; color: string }> = {
    INTERESTED: {
      title: 'Interested in G-MAPS Industrial Intelligence',
      desc: 'Our autonomous engineering agent will provide tailored industrial cluster analysis for your team.',
      color: '#0284c7',
    },
    SEND_DEMO: {
      title: 'Request a Live Demonstration',
      desc: 'Our technical team will prepare a live demonstration of geospatial manufacturing discovery for your facilities.',
      color: '#059669',
    },
    MAYBE_LATER: {
      title: 'Follow Up Later',
      desc: 'We will pause all current outreach and check back in with your team in several weeks.',
      color: '#d97706',
    },
    NOT_INTERESTED: {
      title: 'Not Interested',
      desc: 'We will immediately update our records and cancel any further automated outreach to your email.',
      color: '#64748b',
    },
  };

  const normType = String(tokenRecord.action_type || '').toUpperCase();
  const actionInfo = actionLabels[normType] || {
    title: 'Confirm Your Choice',
    desc: 'Please confirm your response below.',
    color: '#0f172a',
  };

  return c.html(html`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Confirm Your Response | G-MAPS</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #0f172a;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 16px;
        }
        .card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 32px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
          text-align: center;
        }
        .badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 20px;
          background-color: ${actionInfo.color};
          color: #ffffff;
        }
        h1 {
          font-size: 22px;
          margin: 0 0 12px 0;
        }
        p {
          font-size: 14px;
          color: #94a3b8;
          line-height: 1.5;
          margin: 0 0 24px 0;
        }
        button {
          background: ${actionInfo.color};
          color: white;
          border: none;
          padding: 12px 28px;
          font-size: 15px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          width: 100%;
          transition: opacity 0.2s;
        }
        button:hover {
          opacity: 0.9;
        }
        .brand {
          margin-top: 24px;
          font-size: 12px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">Selection Confirmation</span>
        <h1>${actionInfo.title}</h1>
        <p>${actionInfo.desc}</p>
        <form method="POST" action="/api/actions/confirm">
          <input type="hidden" name="token" value="${tokenStr}" />
          <button type="submit">Confirm My Response</button>
        </form>
        <div class="brand">G-MAPS Industrial Outreach & Geospatial Intelligence</div>
      </div>
    </body>
    </html>
  `);
});

/**
 * POST /api/actions/confirm
 * Processes confirmed intent securely
 */
actionRoutes.post('/confirm', async (c) => {
  const body = await c.req.parseBody();
  const tokenStr = String(body['token'] || '');

  if (!tokenStr) {
    return c.html(renderStatusPage('Invalid Request', 'Missing action token.', 'error'), 400);
  }

  const tokenRecord = dbQueries.getActionToken(tokenStr);

  if (!tokenRecord) {
    return c.html(renderStatusPage('Invalid Token', 'This action link does not exist.', 'error'), 404);
  }

  if (tokenRecord.is_used) {
    return c.html(
      renderStatusPage(
        'Already Recorded',
        `Your selection has already been recorded. Thank you!`,
        'info'
      )
    );
  }

  // Consume token
  const clientIp = c.req.header('x-forwarded-for') || c.req.header('remote-addr') || 'unknown';
  const userAgent = c.req.header('user-agent') || 'unknown';
  dbQueries.consumeActionToken(tokenStr, clientIp, userAgent);

  const actionType = tokenRecord.action_type as string;
  const conversationId = tokenRecord.conversation_id as string;

  // Insert virtual inbound confirmation message into messages table
  const virtualMsgId = crypto.randomUUID();
  const intentDescription = `[Interactive Email Click Action] Recipient selected: ${actionType}`;

  dbQueries.insertMessage({
    id: virtualMsgId,
    conversationId,
    campaignId: (tokenRecord.campaign_id as string) || undefined,
    direction: 'inbound',
    senderIdentifier: (tokenRecord.recipient_email as string) || 'Recipient Action Click',
    recipientIdentifier: 'G-MAPS Interactive Action',
    channel: 'email',
    messageType: 'interactive',
    content: intentDescription,
    subject: `Interactive Response: ${actionType}`,
    providerMessageId: `click-action-${tokenStr}`,
    deliveryStatus: 'received',
    sentAt: new Date().toISOString(),
  });

  // Trigger conversation engine
  let simulatedText = '';
  switch (actionType.toUpperCase()) {
    case 'INTERESTED':
      simulatedText = "I'm interested. Please share more details.";
      break;
    case 'SEND_DEMO':
      simulatedText = 'Can we schedule a demo?';
      break;
    case 'MAYBE_LATER':
      simulatedText = 'Maybe next month.';
      break;
    case 'NOT_INTERESTED':
      simulatedText = "I'm not interested.";
      break;
    default:
      simulatedText = actionType;
      break;
  }

  await conversationEngine.processInboundMessage(conversationId, simulatedText, virtualMsgId);

  return c.html(
    renderStatusPage(
      'Response Confirmed',
      'Thank you! Your response has been securely recorded. Our industrial outreach system has updated your preferences accordingly.',
      'success'
    )
  );
});

function renderStatusPage(title: string, message: string, type: 'success' | 'error' | 'info'): string {
  const color = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#0284c7';
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title} | G-MAPS</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #0f172a;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 16px;
        }
        .card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 36px 32px;
          max-width: 480px;
          width: 100%;
          text-align: center;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }
        .icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: ${color}20;
          border: 2px solid ${color};
          color: ${color};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        h1 {
          font-size: 22px;
          margin: 0 0 12px 0;
        }
        p {
          font-size: 14px;
          color: #94a3b8;
          line-height: 1.6;
          margin: 0 0 24px 0;
        }
        .brand {
          font-size: 12px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="brand">G-MAPS Industrial Outreach & Geospatial Intelligence</div>
      </div>
    </body>
    </html>
  `;
}
