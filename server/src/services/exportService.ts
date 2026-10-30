// Export Engine with CSV Formula Injection Sanitization migrated from ExportService.gs
import { db } from '../db/schema.js';

export class ExportService {
  /**
   * Sanitizes cell values to prevent CSV formula injection (DDE attacks)
   */
  public sanitizeCellValue(val: unknown): string {
    if (val === null || val === undefined) return '';
    const str = String(val);
    const trimmed = str.trim();
    if (['=', '+', '-', '@', '\t', '\r'].some((char) => trimmed.startsWith(char))) {
      return `'${str}`; // Escape with leading quote
    }
    return str;
  }

  /**
   * Generates sanitized CSV from leads table
   */
  public exportLeadsToCsv(filterStatus?: string): string {
    let sql = `
      SELECT l.company_name, l.primary_type, l.tier, l.rating, l.review_count,
             l.address, l.city, l.state, l.country, l.website, l.status, l.priority,
             lc.contact_name, lc.email, lc.phone_e164, lc.phone_type
      FROM leads l
      LEFT JOIN lead_contacts lc ON l.id = lc.lead_id AND lc.is_primary = 1
    `;
    const params: string[] = [];
    if (filterStatus) {
      sql += ' WHERE l.status = ?';
      params.push(filterStatus);
    }
    sql += ' ORDER BY l.created_at DESC';

    const records = db.prepare(sql).all(...params) as Record<string, unknown>[];

    const headers = [
      'Company Name',
      'Primary Type',
      'Tier',
      'Rating',
      'Review Count',
      'Address',
      'City',
      'State',
      'Country',
      'Website',
      'Status',
      'Priority',
      'Contact Name',
      'Email',
      'Phone Formatted',
      'Phone Type',
    ];

    const lines: string[] = [headers.join(',')];

    for (const r of records) {
      const row = [
        this.escapeCsvField(this.sanitizeCellValue(r.company_name)),
        this.escapeCsvField(this.sanitizeCellValue(r.primary_type)),
        this.escapeCsvField(this.sanitizeCellValue(r.tier)),
        this.escapeCsvField(this.sanitizeCellValue(r.rating)),
        this.escapeCsvField(this.sanitizeCellValue(r.review_count)),
        this.escapeCsvField(this.sanitizeCellValue(r.address)),
        this.escapeCsvField(this.sanitizeCellValue(r.city)),
        this.escapeCsvField(this.sanitizeCellValue(r.state)),
        this.escapeCsvField(this.sanitizeCellValue(r.country)),
        this.escapeCsvField(this.sanitizeCellValue(r.website)),
        this.escapeCsvField(this.sanitizeCellValue(r.status)),
        this.escapeCsvField(this.sanitizeCellValue(r.priority)),
        this.escapeCsvField(this.sanitizeCellValue(r.contact_name)),
        this.escapeCsvField(this.sanitizeCellValue(r.email)),
        this.escapeCsvField(this.sanitizeCellValue(r.phone_e164)),
        this.escapeCsvField(this.sanitizeCellValue(r.phone_type)),
      ];
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  private escapeCsvField(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }
}

export const exportService = new ExportService();
