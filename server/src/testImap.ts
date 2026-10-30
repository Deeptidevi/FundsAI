import 'dotenv/config';
import { ImapFlow } from 'imapflow';

async function testConnection() {
  const host = process.env.IMAP_HOST || 'imap.gmail.com';
  const port = parseInt(process.env.IMAP_PORT || '993', 10);
  const user = process.env.IMAP_USER || '';
  const pass = process.env.IMAP_PASS || '';

  console.log(`Testing IMAP connection to ${host}:${port} with user: ${user}`);

  if (!user || !pass) {
    console.error('ERROR: IMAP_USER or IMAP_PASS missing in environment');
    process.exit(1);
  }

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  try {
    await client.connect();
    console.log('SUCCESS: Connected to IMAP server successfully!');

    const lock = await client.getMailboxLock('INBOX');
    try {
      const mailbox = client.mailbox;
      console.log(`INBOX status: total messages = ${mailbox ? mailbox.exists : 'unknown'}`);
    } finally {
      lock.release();
    }

    await client.logout();
    console.log('Logged out cleanly.');
  } catch (err) {
    console.error('IMAP Connection Failed:', err);
    process.exit(1);
  }
}

testConnection();
