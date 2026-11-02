import { db } from './db/schema.js';
import { WebhookTransferService } from './services/webhookTransferService.js';

async function testErrorAndRetry() {
  console.log('Testing Webhook Error & Retry Recovery Flow...');
  const webhookService = new WebhookTransferService();

  // Create 5 test companies
  const ids: string[] = [];
  const insertLead = db.prepare(`
    INSERT INTO leads (id, company_name, primary_type, tier, status)
    VALUES (?, ?, 'Precision Engineering', 'Gold', 'new')
  `);
  for (let i = 1; i <= 5; i++) {
    const id = `retry-test-${Date.now()}-${i}`;
    ids.push(id);
    insertLead.run(id, `Retry Test Corp #${i}`);
  }

  try {
    // 1. Send with simulated error endpoint
    console.log('1. Initiating transfer to simulated error receiver (?simulate=error)...');
    const { job } = webhookService.createExportJob(
      ids,
      'ai_dashboard_webhook',
      'http://localhost:3001/api/webhooks/mock-ai-dashboard?simulate=error'
    );

    await webhookService.executeJobTransfer(job.id);
    const failedStatus = webhookService.getJobById(job.id)!;

    console.log(`Job Status after error simulation: ${failedStatus.status}`);
    console.log(`Failed batches: ${failedStatus.failedBatches}`);
    const batch = (failedStatus.batches || [])[0];
    if (!batch) throw new Error('No batches found for failed job');
    console.log(`Batch retry count reached: ${batch.retryCount} / ${batch.maxRetries}`);
    console.log(`Recorded error message: ${batch.errorMessage}`);

    if (failedStatus.status !== 'failed' || batch.status !== 'failed') {
      throw new Error('Batch was expected to fail on simulated 500 receiver.');
    }
    console.log('PASS: Simulated receiver failure handled, logged, and marked as failed after max retries.');

    // 2. Test Safe Recovery / Retry: Switch target URL to healthy endpoint and call retryFailedBatches
    console.log('\n2. Testing Recovery: Updating webhook target to healthy endpoint and retrying...');
    db.prepare(`UPDATE export_jobs SET target_webhook_url = ? WHERE id = ?`).run(
      'http://localhost:3001/api/webhooks/mock-ai-dashboard',
      job.id
    );

    await webhookService.retryFailedBatches(job.id);
    const recoveredStatus = webhookService.getJobById(job.id)!;

    console.log(`Job Status after retry: ${recoveredStatus.status}`);
    console.log(`Successful batches: ${recoveredStatus.successfulBatches}`);
    console.log(`Delivered records: ${recoveredStatus.deliveredRecords}`);

    if (recoveredStatus.status !== 'completed' || recoveredStatus.deliveredRecords !== 5) {
      throw new Error('Batch retry failed to recover to success.');
    }
    console.log('PASS: Failed batch safely retried and recovered to completed status!');
    console.log('\nError & Retry Recovery Test PASSED 100%!');

  } finally {
    // Clean up
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM leads WHERE id IN (${placeholders})`).run(...ids);
  }
}

testErrorAndRetry();
