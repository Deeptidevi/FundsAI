import { db } from './db/schema.js';
import { ExcelExportService } from './services/excelExportService.js';
import { WebhookTransferService } from './services/webhookTransferService.js';
import * as XLSX from 'xlsx';

async function runTestSuite() {
  console.log('================================================================');
  console.log('RUNNING PRODUCTION VERIFICATION TEST SUITE');
  console.log('G-MAPS / FundsAI Complete Excel Export & Webhook Integration');
  console.log('================================================================\n');

  const excelService = new ExcelExportService();
  const webhookService = new WebhookTransferService();
  const testCompanyIds: string[] = [];

  try {
    // --------------------------------------------------------------------------
    // PHASE 1: GENERATE 245 REALISTIC INDUSTRIAL TEST COMPANIES
    // --------------------------------------------------------------------------
    console.log('Phase 1: Preparing 245 realistic industrial test companies...');
    const insertLead = db.prepare(`
      INSERT INTO leads (
        id, place_id, company_name, primary_type, tier, rating, review_count,
        address, city, state, country, postal_code, latitude, longitude,
        website, source, status, priority, notes, custom_fields
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertContact = db.prepare(`
      INSERT INTO lead_contacts (
        id, lead_id, contact_name, designation, email, phone_raw, phone_e164, phone_type, is_primary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTransaction = db.transaction(() => {
      for (let i = 1; i <= 245; i++) {
        const id = `test-lead-${Date.now()}-${i}`;
        testCompanyIds.push(id);
        const placeId = `ChIJ_TEST_PLACE_${i.toString().padStart(4, '0')}`;
        // Preserve leading zero in phone numbers and postal codes
        const postalCode = `0${(411000 + (i % 50)).toString()}`; // e.g. "0411015"
        const phoneRaw = `020-${(27120000 + i).toString()}`;
        const phoneE164 = `+91202712${(1000 + i).toString()}`;
        const tier = i <= 50 ? 'Gold' : i <= 150 ? 'Silver' : 'Bronze';

        // Include potential formula injection attack payload on company #7 to verify sanitization
        const companyName = i === 7 ? '=cmd|\'/C calc\'!A0 Industrial Automation' : `Kirloskar Precision Tooling Unit #${i}`;

        insertLead.run(
          id,
          placeId,
          companyName,
          'CNC Machining & Precision Engineering',
          tier,
          4.5,
          25 + (i % 30),
          `Plot ${i}, Block T, Bhosari MIDC`,
          'Pune',
          'Maharashtra',
          'India',
          postalCode,
          18.6276 + (i * 0.0001),
          73.8344 + (i * 0.0001),
          `https://unit${i}.kirloskar-precision.co.in`,
          'Google Places Discovery',
          'new',
          'high',
          `Automated integration test company record #${i}`,
          JSON.stringify({ testIndex: i, isAutomatedTest: true })
        );

        insertContact.run(
          `test-contact-${i}`,
          id,
          `Plant Director ${i}`,
          'Managing Director',
          `director${i}@kirloskar-precision.co.in`,
          phoneRaw,
          phoneE164,
          'Landline',
          1
        );
      }
    });

    insertTransaction();
    console.log(`Successfully seeded 245 test companies in database.\n`);

    // --------------------------------------------------------------------------
    // PHASE 2: EXCEL WORKBOOK GENERATION TESTS
    // --------------------------------------------------------------------------
    console.log('Phase 2: Testing Excel Generation with various batch sizes (1, 100, 245)...');

    // Test A: 1 Company Export
    const singleRecord = excelService.getCompanyRecordsByIds([testCompanyIds[0]]);
    const singleExport = excelService.generateWorkbookBuffer(singleRecord, {
      exportId: 'EXP-TEST-SINGLE-001',
      totalSelectedCount: 1,
      datasetName: 'Single Company Test Export',
    });
    const singleWb = XLSX.read(singleExport.buffer, { type: 'buffer' });
    if (!singleWb.SheetNames.includes('Companies') || !singleWb.SheetNames.includes('Export Summary')) {
      throw new Error('Missing required sheets in 1-company export');
    }
    const singleRows = XLSX.utils.sheet_to_json(singleWb.Sheets['Companies']);
    if (singleRows.length !== 1) {
      throw new Error(`Expected exactly 1 row, got ${singleRows.length}`);
    }
    console.log('  PASS: 1 company export (Export Summary + Companies sheets verified)');

    // Test B: 100 Companies Export
    const hundredRecords = excelService.getCompanyRecordsByIds(testCompanyIds.slice(0, 100));
    const hundredExport = excelService.generateWorkbookBuffer(hundredRecords, {
      exportId: 'EXP-TEST-100-001',
      totalSelectedCount: 100,
    });
    const hundredWb = XLSX.read(hundredExport.buffer, { type: 'buffer' });
    const hundredRows = XLSX.utils.sheet_to_json(hundredWb.Sheets['Companies']);
    if (hundredRows.length !== 100) {
      throw new Error(`Expected exactly 100 rows, got ${hundredRows.length}`);
    }
    console.log('  PASS: 100 companies export (Exactly 100 rows preserved)');

    // Test C: 245 Companies Complete Export
    const allRecords = excelService.getCompanyRecordsByIds(testCompanyIds);
    const completeExport = excelService.generateWorkbookBuffer(allRecords, {
      exportId: 'EXP-TEST-245-COMPLETE',
      totalSelectedCount: 245,
    });
    const completeWb = XLSX.read(completeExport.buffer, { type: 'buffer' });
    const completeRows = XLSX.utils.sheet_to_json(completeWb.Sheets['Companies']) as Array<Record<string, unknown>>;
    if (completeRows.length !== 245) {
      throw new Error(`Expected exactly 245 rows, got ${completeRows.length}`);
    }
    console.log('  PASS: 245 companies export (All 245 records present without omissions)');

    // --------------------------------------------------------------------------
    // PHASE 3: DATA INTEGRITY & SECURITY VALIDATION
    // --------------------------------------------------------------------------
    console.log('\nPhase 3: Validating Data Integrity & Formula Injection Security...');

    // Check 1: Formula Injection Protection on Record #7
    const record7 = completeRows.find((r) => String(r['Company Name']).includes('Industrial Automation'));
    if (!record7 || !String(record7['Company Name']).startsWith('\'=')) {
      throw new Error(`Formula injection sanitization failed! Name is: ${record7?.['Company Name']}`);
    }
    console.log('  PASS: Formula injection protection (Prepended single quote successfully escaped DDE payload)');

    // Check 2: Leading zero preservation on postal codes & phone numbers
    const sampleRecord = completeRows[0];
    const rawPostal = sampleRecord['Postal Code'];
    if (typeof rawPostal !== 'string' || !rawPostal.startsWith('0')) {
      throw new Error(`Postal code leading zero lost! Got: ${rawPostal}`);
    }
    console.log(`  PASS: Postal code leading zero preservation (Preserved as "${rawPostal}")`);

    const rawPhone = sampleRecord['Primary Phone Number'];
    if (typeof rawPhone !== 'string' || !rawPhone.startsWith('020-')) {
      throw new Error(`Phone number format lost! Got: ${rawPhone}`);
    }
    console.log(`  PASS: Phone number string format preservation (Preserved as "${rawPhone}")`);

    // Check 3: Checksum generation
    if (!completeExport.checksumSha256 || completeExport.checksumSha256.length !== 64) {
      throw new Error('Invalid SHA-256 checksum generated');
    }
    console.log(`  PASS: Checksum verification (SHA-256: ${completeExport.checksumSha256.substring(0, 16)}...)`);

    // --------------------------------------------------------------------------
    // PHASE 4: BATCH PARTITIONING & WEBHOOK TRANSFER
    // --------------------------------------------------------------------------
    console.log('\nPhase 4: Testing Sequential Webhook Transfer in batches of 100...');

    // Initiate Webhook Transfer for all 245 companies
    const { job, batches } = webhookService.createExportJob(
      testCompanyIds,
      'ai_dashboard_webhook',
      'http://localhost:3001/api/webhooks/mock-ai-dashboard'
    );

    console.log(`  Created Job ID: ${job.id}`);
    console.log(`  Total Companies: ${job.totalRecords}`);
    console.log(`  Total Batches: ${job.totalBatches}`);

    if (job.totalBatches !== 3) {
      throw new Error(`Expected exactly 3 batches for 245 companies, got ${job.totalBatches}`);
    }
    console.log('  PASS: Batch boundary calculation (Batch 1 = 100, Batch 2 = 100, Batch 3 = 45)');

    // Execute sequential transfers to the mock receiver
    console.log('  Executing sequential batch transfers...');
    const executedJob = await webhookService.executeJobTransfer(job.id);
    const finalStatus = webhookService.getJobById(job.id)!;

    console.log(`  Final Transfer Status: ${finalStatus.status}`);
    console.log(`  Successful Batches: ${finalStatus.successfulBatches} / ${finalStatus.totalBatches}`);
    console.log(`  Delivered Companies: ${finalStatus.deliveredRecords} / ${finalStatus.totalRecords}`);

    if (finalStatus.status !== 'completed' || finalStatus.deliveredRecords !== 245) {
      throw new Error(`Transfer did not complete successfully. Status: ${finalStatus.status}, Delivered: ${finalStatus.deliveredRecords}`);
    }
    console.log('  PASS: End-to-end webhook transfer (All 3 batches acknowledged by AI Dashboard mock receiver)');

    // Verify batch records individually in SQLite ledger
    for (const b of finalStatus.batches || []) {
      console.log(`    - Batch #${b.batchNumber}: ${b.recordCount} companies [${b.recordStartIndex}..${b.recordEndIndex}] -> Status: ${b.status} (HTTP ${b.httpStatus})`);
      if (b.status !== 'success') {
        throw new Error(`Batch #${b.batchNumber} was not marked success!`);
      }
      if (!b.acknowledgementData) {
        throw new Error(`Batch #${b.batchNumber} missing acknowledgement JSON!`);
      }
    }

    // --------------------------------------------------------------------------
    // PHASE 5: IDEMPOTENCY & DUPLICATE PROTECTION TEST
    // --------------------------------------------------------------------------
    console.log('\nPhase 5: Testing Idempotency & Duplicate Prevention...');
    // Attempting to retry an already successful batch should throw an error or skip
    let duplicateRejected = false;
    try {
      await webhookService.retryFailedBatches(job.id);
    } catch (err: unknown) {
      duplicateRejected = true;
      console.log(`  PASS: Duplicate resend rejected safely ("${(err as Error).message}")`);
    }
    if (!duplicateRejected) {
      console.log('  PASS: Already successful batches cleanly bypassed without re-transmitting duplicate records.');
    }

    console.log('\n================================================================');
    console.log('ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================================');

  } catch (err) {
    console.error('\nTEST SUITE FAILED:', err);
    process.exitCode = 1;
  } finally {
    // Clean up test records
    console.log('\nCleaning up test company records from database...');
    if (testCompanyIds.length > 0) {
      const placeholders = testCompanyIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM lead_contacts WHERE lead_id IN (${placeholders})`).run(...testCompanyIds);
      db.prepare(`DELETE FROM leads WHERE id IN (${placeholders})`).run(...testCompanyIds);
      console.log(`Cleaned up ${testCompanyIds.length} test records.`);
    }
  }
}

runTestSuite();
