// Excel & CSV Import Engine for G-MAPS Industrial Intelligence
import * as XLSX from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';
import { db, dbQueries } from '../db/schema.js';
import {
  parseIndianPhone,
  classifyBusinessTier,
  checkDuplicateWithBranchPreservation,
  DeduplicationEntity,
  ImportSummary,
} from '@gmaps/shared';

export interface ColumnMapping {
  companyName: string;
  contactPerson?: string;
  designation?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  leadSource?: string;
  notes?: string;
  emailConsent?: string;
  whatsAppConsent?: string;
  rating?: string;
  reviewCount?: string;
}

export class ImportService {
  /**
   * Parses buffer from .xlsx or .csv and returns headers & preview rows
   */
  public parseFilePreview(buffer: Buffer, filename: string): { headers: string[]; previewRows: Record<string, string>[]; totalRows: number } {
    const isCsv = filename.toLowerCase().endsWith('.csv');
    let rows: Record<string, string>[] = [];

    if (isCsv) {
      const records = csvParse(buffer.toString('utf-8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];
      rows = records;
    } else {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: '' });
    }

    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return {
      headers,
      previewRows: rows.slice(0, 10),
      totalRows: rows.length,
    };
  }

  /**
   * Executes full validated import with column mapping, DoT phone parsing, deduplication, and error reporting
   */
  public executeImport(
    buffer: Buffer,
    filename: string,
    mapping: ColumnMapping,
    userId?: string
  ): ImportSummary {
    const { totalRows } = this.parseFilePreview(buffer, filename);
    const jobId = `imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Create import job record
    db.prepare(`
      INSERT INTO import_jobs (id, file_name, file_size_bytes, total_rows, status, column_mapping, imported_by)
      VALUES (?, ?, ?, ?, 'processing', ?, ?)
    `).run(jobId, filename, buffer.length, totalRows, JSON.stringify(mapping), userId || null);

    // Read full rows
    let rows: Record<string, string>[] = [];
    if (filename.toLowerCase().endsWith('.csv')) {
      rows = csvParse(buffer.toString('utf-8'), { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
    } else {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
    }

    // Load existing leads for deduplication
    const existingLeads = db.prepare(`
      SELECT l.id, l.place_id, l.company_name, l.latitude, l.longitude, lc.phone_e164
      FROM leads l
      LEFT JOIN lead_contacts lc ON l.id = lc.lead_id AND lc.is_primary = 1
    `).all() as Array<{
      id: string;
      place_id?: string;
      company_name: string;
      latitude?: number;
      longitude?: number;
      phone_e164?: string;
    }>;

    const dedupEntities: DeduplicationEntity[] = existingLeads.map((e) => ({
      id: e.id,
      placeId: e.place_id,
      companyName: e.company_name,
      normalizedPhone: e.phone_e164,
      coords: e.latitude && e.longitude ? { lat: e.latitude, lng: e.longitude } : undefined,
    }));

    let validRows = 0;
    let duplicateRows = 0;
    let invalidRows = 0;
    const errors: ImportSummary['errors'] = [];

    // Transaction for batched execution
    const insertTransaction = db.transaction(() => {
      rows.forEach((row, idx) => {
        const rowNumber = idx + 2; // spreadsheet 1-indexed header + data row
        const companyName = String(row[mapping.companyName] || '').trim();

        if (!companyName) {
          invalidRows++;
          errors.push({
            rowNumber,
            fieldName: 'companyName',
            rawValue: '',
            errorMessage: 'Company Name is required.',
          });
          return;
        }

        const rawPhone = mapping.phone ? String(row[mapping.phone] || '').trim() : '';
        const parsedPhone = rawPhone ? parseIndianPhone(rawPhone) : null;

        const email = mapping.email ? String(row[mapping.email] || '').trim() : '';
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          invalidRows++;
          errors.push({
            rowNumber,
            fieldName: 'email',
            rawValue: email,
            errorMessage: 'Invalid email syntax format.',
          });
          return;
        }

        // Deduplication & Branch Preservation check
        const candidateEntity: DeduplicationEntity = {
          companyName,
          normalizedPhone: parsedPhone?.e164,
        };

        const dedupResult = checkDuplicateWithBranchPreservation(candidateEntity, dedupEntities);
        if (dedupResult.isDuplicate) {
          duplicateRows++;
          return; // Skip duplicate record without throwing
        }

        // Tier classification
        const rawRating = mapping.rating ? parseFloat(row[mapping.rating]) : 0;
        const rawReviews = mapping.reviewCount ? parseInt(row[mapping.reviewCount], 10) : 0;
        const tier = classifyBusinessTier(rawRating, rawReviews);

        // Generate Lead ID
        const leadId = `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        // Insert lead
        dbQueries.insertLead({
          id: leadId,
          companyName,
          primaryType: mapping.industry ? String(row[mapping.industry] || '').trim() : undefined,
          tier,
          rating: isNaN(rawRating) ? 0 : rawRating,
          reviewCount: isNaN(rawReviews) ? 0 : rawReviews,
          address: mapping.address ? String(row[mapping.address] || '').trim() : undefined,
          city: mapping.city ? String(row[mapping.city] || '').trim() : undefined,
          state: mapping.state ? String(row[mapping.state] || '').trim() : undefined,
          country: mapping.country ? String(row[mapping.country] || 'India').trim() : 'India',
          postalCode: mapping.postalCode ? String(row[mapping.postalCode] || '').trim() : undefined,
          website: mapping.website ? String(row[mapping.website] || '').trim() : undefined,
          source: mapping.leadSource ? String(row[mapping.leadSource] || 'excel_import').trim() : 'excel_import',
          notes: mapping.notes ? String(row[mapping.notes] || '').trim() : undefined,
        });

        // Insert contact
        const contactId = `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        dbQueries.insertContact({
          id: contactId,
          leadId,
          contactName: mapping.contactPerson ? String(row[mapping.contactPerson] || '').trim() : undefined,
          designation: mapping.designation ? String(row[mapping.designation] || '').trim() : undefined,
          email: email || undefined,
          phoneRaw: rawPhone || undefined,
          phoneE164: parsedPhone?.e164 || undefined,
          phoneType: parsedPhone?.type || 'Unknown',
          isPrimary: true,
          isVerified: parsedPhone?.isValid || false,
        });

        // Record channel consent explicitly
        const emailConsentVal = mapping.emailConsent ? String(row[mapping.emailConsent] || '').toLowerCase() : '';
        const emailGranted = emailConsentVal === 'yes' || emailConsentVal === 'true' || emailConsentVal === '1';

        const waConsentVal = mapping.whatsAppConsent ? String(row[mapping.whatsAppConsent] || '').toLowerCase() : '';
        const waGranted = waConsentVal === 'yes' || waConsentVal === 'true' || waConsentVal === '1';

        if (emailGranted) {
          db.prepare(`
            INSERT INTO consent_records (id, lead_id, contact_id, channel, consent_status, source)
            VALUES (?, ?, ?, 'email', 'granted', 'excel_import_flag')
          `).run(`cst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, leadId, contactId);
        }

        if (waGranted) {
          db.prepare(`
            INSERT INTO consent_records (id, lead_id, contact_id, channel, consent_status, source)
            VALUES (?, ?, ?, 'whatsapp', 'granted', 'excel_import_flag')
          `).run(`cst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, leadId, contactId);
        }

        // Add to in-memory dedup list for subsequent rows in the same spreadsheet
        dedupEntities.push({
          id: leadId,
          companyName,
          normalizedPhone: parsedPhone?.e164,
        });

        validRows++;
      });
    });

    insertTransaction();

    // Persist error report rows
    const errorStmt = db.prepare(`
      INSERT INTO import_errors (id, import_job_id, row_number, field_name, raw_value, error_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    errors.forEach((err) => {
      errorStmt.run(
        `err-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        jobId,
        err.rowNumber,
        err.fieldName || null,
        err.rawValue || null,
        err.errorMessage
      );
    });

    // Finalize import job status
    db.prepare(`
      UPDATE import_jobs 
      SET valid_rows = ?, duplicate_rows = ?, invalid_rows = ?, status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(validRows, duplicateRows, invalidRows, jobId);

    return {
      jobId,
      fileName: filename,
      totalRows,
      validRows,
      duplicateRows,
      invalidRows,
      errors,
    };
  }
}

export const importService = new ImportService();
