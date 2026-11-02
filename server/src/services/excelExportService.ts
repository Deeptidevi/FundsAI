import * as XLSX from 'xlsx';
import crypto from 'node:crypto';
import { db } from '../db/schema.js';
import { Lead, LeadContact } from '@gmaps/shared';

export interface CompanyExportData {
  id: string;
  placeId?: string | null;
  companyName: string;
  businessName?: string | null;
  primaryType?: string | null;
  category?: string | null;
  industry?: string | null;
  subIndustry?: string | null;
  industrialEstate?: string | null;
  phonePrimary?: string | null;
  phoneSecondary?: string | null;
  phoneType?: string | null;
  emailPrimary?: string | null;
  emailSecondary?: string | null;
  website?: string | null;
  contactPerson?: string | null;
  designation?: string | null;
  linkedinUrl?: string | null;
  address?: string | null;
  streetArea?: string | null;
  city?: string | null;
  district?: string | null;
  taluka?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  businessDescription?: string | null;
  services?: string | null;
  products?: string | null;
  targetMarket?: string | null;
  operatingStatus?: string | null;
  tier?: string | null;
  qualificationStatus?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  priority?: string | null;
  source?: string | null;
  notes?: string | null;
  discoveryDate?: string | null;
  lastUpdated?: string | null;
  customFieldsJson?: string | null;
  sequenceNumber?: number;
  distanceKm?: string | null;
  radiusBelt?: string | null;
  searchAnchor?: string | null;
  searchRadiusKm?: number | string | null;
  subCategories?: string | null;
}

export interface ExcelGenerationOptions {
  exportId: string;
  batchId?: string;
  batchNumber?: number;
  totalBatches?: number;
  totalSelectedCount?: number;
  datasetName?: string;
  schemaVersion?: string;
}


export class ExcelExportService {
  /**
   * Formula injection protection (DDE attacks)
   * Any cell starting with =, +, -, @, \t, or \r is prefixed with a single quote.
   */
  public sanitizeText(val: unknown): string {
    if (val === null || val === undefined) return '';
    const str = String(val);
    const trimmed = str.trim();
    if (['=', '+', '-', '@', '\t', '\r'].some((ch) => trimmed.startsWith(ch))) {
      return `'${str}`;
    }
    return str;
  }

  /**
   * Resolves complete company export records from database for given lead IDs
   */
  public getCompanyRecordsByIds(leadIds: string[]): CompanyExportData[] {
    if (!leadIds || leadIds.length === 0) return [];

    // Query in chunks of 500 to stay well under SQLite parameter limits
    const CHUNK_SIZE = 500;
    const records: CompanyExportData[] = [];

    for (let i = 0; i < leadIds.length; i += CHUNK_SIZE) {
      const slice = leadIds.slice(i, i + CHUNK_SIZE);
      const placeholders = slice.map(() => '?').join(',');

      const sql = `
        SELECT l.*,
               cr.industry as res_industry,
               cr.products_services as res_products,
               cr.business_summary as res_summary
        FROM leads l
        LEFT JOIN company_research cr ON l.id = cr.lead_id
        WHERE l.id IN (${placeholders})
      `;

      const rows = db.prepare(sql).all(...slice) as Array<Record<string, unknown>>;

      // Fetch contacts for these leads
      const contactSql = `
        SELECT * FROM lead_contacts
        WHERE lead_id IN (${placeholders})
        ORDER BY is_primary DESC, created_at ASC
      `;
      const rawContacts = db.prepare(contactSql).all(...slice) as Array<Record<string, unknown>>;

      const contactsByLead = new Map<string, Array<Record<string, unknown>>>();
      for (const c of rawContacts) {
        const leadId = (c.lead_id as string) || (c.leadId as string);
        if (!leadId) continue;
        const list = contactsByLead.get(leadId) || [];
        list.push(c);
        contactsByLead.set(leadId, list);
      }

      // Map preserving requested order
      const rowMap = new Map<string, Record<string, unknown>>();
      for (const r of rows) {
        rowMap.set(r.id as string, r);
      }

      for (const id of slice) {
        const row = rowMap.get(id);
        if (!row) continue;

        const leadContacts = contactsByLead.get(id) || [];
        const primaryContact = leadContacts.find((c) => c.is_primary || c.isPrimary) || leadContacts[0];
        const secondaryContact = leadContacts.length > 1 ? leadContacts[1] : undefined;

        let customObj: Record<string, unknown> | null = null;
        if (row.custom_fields) {
          try {
            customObj = typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields as string) : (row.custom_fields as Record<string, unknown>);
          } catch {
            customObj = null;
          }
        }

        const phonePrimary = (primaryContact?.phone_raw as string) || (primaryContact?.phone_e164 as string) || (primaryContact?.phoneRaw as string) || (primaryContact?.phoneE164 as string) || null;
        const phoneSecondary = (secondaryContact?.phone_raw as string) || (secondaryContact?.phone_e164 as string) || (secondaryContact?.phoneRaw as string) || (secondaryContact?.phoneE164 as string) || null;
        const phoneType = (primaryContact?.phone_type as string) || (primaryContact?.phoneType as string) || null;
        const emailPrimary = (primaryContact?.email as string) || null;
        const emailSecondary = (secondaryContact?.email as string) || null;
        const contactPerson = (primaryContact?.contact_name as string) || (primaryContact?.contactName as string) || null;
        const designation = (primaryContact?.designation as string) || null;

        const distVal = customObj?.distanceKm ? String(customObj.distanceKm) : null;
        const distNum = parseFloat(distVal || '0');
        let radiusBelt: string | null = null;
        if (distVal !== null) {
          if (!isNaN(distNum) && distNum >= 0) {
            if (distNum <= 1) radiusBelt = 'Immediate Belt (≤ 1 km)';
            else if (distNum <= 2) radiusBelt = 'Cluster Core (≤ 2 km)';
            else if (distNum <= 3) radiusBelt = 'MSME Zone (≤ 3 km)';
            else if (distNum <= 5) radiusBelt = 'Industrial Estate (≤ 5 km)';
            else if (distNum <= 10) radiusBelt = 'Cluster Radius (≤ 10 km)';
            else if (distNum <= 15) radiusBelt = 'Regional Corridor (≤ 15 km)';
            else radiusBelt = 'Metro Belt (≤ 25 km)';
          }
        }
        const searchAnchor = (customObj?.searchAnchor as string) || (row.city ? `${row.city}, ${row.state || ''}`.trim() : null);

        const industrialEstate = (customObj?.industrialEstate as string) || (customObj?.estate as string) || null;
        const district = (customObj?.district as string) || (row.city as string) || null;
        const taluka = (customObj?.taluka as string) || null;
        const targetMarket = (customObj?.targetMarket as string) || null;
        const searchRadiusKm = (customObj?.searchRadiusKm as number | string) || (row.search_radius_km as number | string) || null;

        let subCategories: string | null = null;
        if (customObj?.subCategories) {
          subCategories = Array.isArray(customObj.subCategories) ? customObj.subCategories.join('; ') : String(customObj.subCategories);
        } else if (row.primary_type) {
          subCategories = String(row.primary_type);
        }

        records.push({
          sequenceNumber: records.length + 1,
          id: (row.id as string) || '',
          placeId: (row.place_id as string) || null,
          companyName: (row.company_name as string) || '',
          businessName: (row.company_name as string) || null,
          primaryType: (row.primary_type as string) || null,
          category: (row.primary_type as string) || null,
          industry: (row.res_industry as string) || (row.primary_type as string) || null,
          subIndustry: null,
          industrialEstate,
          distanceKm: distVal ? `${distVal} km` : null,
          radiusBelt,
          searchAnchor,
          searchRadiusKm,
          phonePrimary,
          phoneSecondary,
          phoneType,
          emailPrimary,
          emailSecondary,
          website: (row.website as string) || null,
          contactPerson,
          designation,
          linkedinUrl: null,
          address: (row.address as string) || null,
          streetArea: (row.city as string) ? `${row.city}, ${row.state || ''}`.trim() : null,
          city: (row.city as string) || null,
          district,
          taluka,
          state: (row.state as string) || null,
          country: (row.country as string) || 'India',
          postalCode: (row.postal_code as string) || null,
          latitude: typeof row.latitude === 'number' ? row.latitude : null,
          longitude: typeof row.longitude === 'number' ? row.longitude : null,
          googleMapsUrl: (row.google_maps_url as string) || (row.place_id ? `https://maps.google.com/?q=place_id:${row.place_id}` : null),
          businessDescription: (row.res_summary as string) || (row.notes as string) || null,
          services: (row.res_products as string) || null,
          products: (row.res_products as string) || null,
          targetMarket,
          subCategories,
          operatingStatus: 'OPERATIONAL',
          tier: (row.tier as string) || 'Bronze',
          qualificationStatus: (row.status as string) || 'new',
          rating: typeof row.rating === 'number' ? row.rating : null,
          reviewCount: typeof row.review_count === 'number' ? row.review_count : null,
          priority: (row.priority as string) || 'medium',
          source: (row.source as string) || 'FundsAI Industrial Intelligence',
          notes: (row.notes as string) || null,
          discoveryDate: (row.created_at as string) || null,
          lastUpdated: (row.updated_at as string) || null,
          customFieldsJson: customObj ? JSON.stringify(customObj) : null,
        });
      }
    }

    return records;
  }

  /**
   * Generates a complete XLSX workbook buffer from company records
   */
  public generateWorkbookBuffer(records: CompanyExportData[], options: ExcelGenerationOptions): {
    buffer: Buffer;
    checksumSha256: string;
    totalRecords: number;
    filename: string;
  } {
    const workbook = XLSX.utils.book_new();

    // 1. SHEET 1: EXPORT SUMMARY
    const summaryData: Array<[string, string | number]> = [
      ['FundsAI Industrial Intelligence Platform', ''],
      ['Dataset / Export Title', options.datasetName || 'Industrial Companies & MSME Directory Export'],
      ['Export ID', options.exportId],
      ['Schema Version', options.schemaVersion || '1.0.0'],
      ['Generated Timestamp (UTC)', new Date().toISOString()],
      ['Generated Timestamp (Local IST)', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
      ['Total Selected Companies', options.totalSelectedCount ?? records.length],
      ['Records in this Workbook', records.length],
    ];

    if (options.batchNumber && options.totalBatches) {
      if (options.batchId) {
        summaryData.push(['Batch ID', options.batchId]);
      }
      summaryData.push(['Batch Number', `${options.batchNumber} of ${options.totalBatches}`]);
      summaryData.push(['Transfer Destination', 'External AI Agent Dashboard']);
    } else {
      summaryData.push(['Export Scope', 'Complete Selected Workbook']);
    }

    summaryData.push(['Data Integrity Verification', 'Formula Injection Sanitized & Text Type Enforced']);
    summaryData.push(['Platform Corporation', 'FundsAI Platform (formerly G-MAPS)']);

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 32 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(workbook, summaryWs, 'Export Summary');

    // 2. SHEET 2: COMPANIES
    const columnDefinitions: Array<{
      header: string;
      key: keyof CompanyExportData;
      width: number;
      isNumeric?: boolean;
    }> = [
      // Sequence & Distance Ordering
      { header: '#', key: 'sequenceNumber', width: 6, isNumeric: true },
      { header: 'Distance from Anchor', key: 'distanceKm', width: 16 },
      { header: 'Radius Perimeter', key: 'radiusBelt', width: 22 },
      { header: 'Search Anchor', key: 'searchAnchor', width: 26 },
      { header: 'Search Radius (km)', key: 'searchRadiusKm', width: 18, isNumeric: true },

      // Company Identity
      { header: 'Company ID', key: 'id', width: 24 },
      { header: 'Google Place ID', key: 'placeId', width: 28 },
      { header: 'Company Name', key: 'companyName', width: 36 },
      { header: 'Business Name', key: 'businessName', width: 34 },
      { header: 'Industrial Estate', key: 'industrialEstate', width: 26 },
      { header: 'Primary Category', key: 'primaryType', width: 28 },
      { header: 'Sub Categories', key: 'subCategories', width: 32 },
      { header: 'Industry Sector', key: 'industry', width: 26 },

      // Contact Information
      { header: 'Primary Phone Number', key: 'phonePrimary', width: 22 },
      { header: 'Secondary Phone Number', key: 'phoneSecondary', width: 22 },
      { header: 'Phone Type', key: 'phoneType', width: 16 },
      { header: 'Primary Email Address', key: 'emailPrimary', width: 30 },
      { header: 'Additional Email Addresses', key: 'emailSecondary', width: 30 },
      { header: 'Website', key: 'website', width: 32 },
      { header: 'Contact Person Name', key: 'contactPerson', width: 24 },
      { header: 'Contact Designation', key: 'designation', width: 28 },
      { header: 'Contact Direct Phone', key: 'phonePrimary', width: 22 },
      { header: 'Contact Direct Email', key: 'emailPrimary', width: 30 },

      // Location Information
      { header: 'Complete Address', key: 'address', width: 48 },
      { header: 'Street / Area', key: 'streetArea', width: 26 },
      { header: 'Pincode', key: 'postalCode', width: 14 },
      { header: 'District', key: 'district', width: 20 },
      { header: 'Taluka', key: 'taluka', width: 20 },
      { header: 'City', key: 'city', width: 18 },
      { header: 'State', key: 'state', width: 18 },
      { header: 'Country', key: 'country', width: 14 },
      { header: 'Latitude', key: 'latitude', width: 14, isNumeric: true },
      { header: 'Longitude', key: 'longitude', width: 14, isNumeric: true },
      { header: 'Google Maps URL', key: 'googleMapsUrl', width: 36 },

      // Business Information & Intelligence
      { header: 'Products and Services', key: 'products', width: 32 },
      { header: 'Business Capabilities Summary', key: 'businessDescription', width: 44 },
      { header: 'Target Market', key: 'targetMarket', width: 28 },
      { header: 'Business Status', key: 'operatingStatus', width: 18 },
      { header: 'Lead Qualification Tier', key: 'tier', width: 22 },
      { header: 'Lead Qualification Status', key: 'qualificationStatus', width: 22 },
      { header: 'Google Rating', key: 'rating', width: 14, isNumeric: true },
      { header: 'Reviews Count', key: 'reviewCount', width: 16, isNumeric: true },
      { header: 'Priority', key: 'priority', width: 14 },
      { header: 'Lead Source', key: 'source', width: 26 },

      // Audit & Metadata
      { header: 'Discovery Date', key: 'discoveryDate', width: 22 },
      { header: 'Last Updated', key: 'lastUpdated', width: 22 },
      { header: 'Internal Notes', key: 'notes', width: 32 },
      { header: 'Custom Fields JSON', key: 'customFieldsJson', width: 32 },
    ];

    // Ensure sequence numbers are populated
    for (let idx = 0; idx < records.length; idx++) {
      if (records[idx].sequenceNumber === undefined || records[idx].sequenceNumber === null) {
        records[idx].sequenceNumber = idx + 1;
      }
    }

    // Build Companies Worksheet Rows
    const companyHeaders = columnDefinitions.map((c) => c.header);
    const companyRows: Array<Array<string | number | null>> = [companyHeaders];

    for (const r of records) {
      const row: Array<string | number | null> = [];
      for (const col of columnDefinitions) {
        const rawVal = r[col.key];

        if (rawVal === null || rawVal === undefined) {
          row.push('');
        } else if (col.isNumeric && typeof rawVal === 'number') {
          row.push(rawVal);
        } else {
          // Explicit text conversion with formula injection protection
          // Guarantees phone numbers like "+91 98220" and postal codes like "01234"
          // are strictly preserved as text without stripping leading zeroes
          const sanitized = this.sanitizeText(String(rawVal));
          row.push(sanitized);
        }
      }
      companyRows.push(row);
    }

    const companiesWs = XLSX.utils.aoa_to_sheet(companyRows);

    // Apply Column Widths
    companiesWs['!cols'] = columnDefinitions.map((col) => ({ wch: col.width }));

    // Freeze Header Row & Set Auto-filter Range
    const totalCols = columnDefinitions.length;
    const totalRows = companyRows.length;
    const lastColLetter = XLSX.utils.encode_col(totalCols - 1);

    companiesWs['!freeze'] = { xSplit: 0, ySplit: 1 };
    companiesWs['!autofilter'] = { ref: `A1:${lastColLetter}${totalRows}` };

    // Format postal codes, phone numbers, and IDs explicitly as string cells
    for (let R = 1; R < totalRows; ++R) {
      for (let C = 0; C < totalCols; ++C) {
        const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
        const cell = companiesWs[cellRef];
        if (cell && !columnDefinitions[C].isNumeric) {
          cell.t = 's'; // Force string type in Excel
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, companiesWs, 'Companies');

    // Generate binary buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    const filename = options.batchNumber && options.totalBatches
      ? `fundsai_export_${options.exportId}_batch_${String(options.batchNumber).padStart(3, '0')}_of_${String(options.totalBatches).padStart(3, '0')}.xlsx`
      : `fundsai_export_${options.exportId}_complete.xlsx`;

    return {
      buffer,
      checksumSha256,
      totalRecords: records.length,
      filename,
    };
  }

  /**
   * Directly transforms discovered MapPlace items into detailed CompanyExportData
   * for immediate, complete Excel generation with sequence numbers and distance metrics.
   */
  public convertPlacesToExportData(
    places: Array<{
      placeId: string;
      name: string;
      rating?: number | null;
      reviewCount?: number;
      tier?: string;
      phone?: string;
      phoneType?: string;
      address?: string;
      location?: { latitude: number; longitude: number };
      distanceMeters?: number;
      distanceKm?: string;
      website?: string;
      googleMapsUri?: string;
      primaryType?: string;
    }>,
    anchorName?: string,
    radiusKm?: number,
    query?: string
  ): CompanyExportData[] {
    return places.map((p, idx) => {
      const distNum = parseFloat(p.distanceKm || '0');
      let radiusBelt = `Within ${radiusKm || 25} km`;
      if (!isNaN(distNum) && distNum >= 0) {
        if (distNum <= 1) radiusBelt = 'Immediate Belt (≤ 1 km)';
        else if (distNum <= 2) radiusBelt = 'Cluster Core (≤ 2 km)';
        else if (distNum <= 3) radiusBelt = 'MSME Zone (≤ 3 km)';
        else if (distNum <= 5) radiusBelt = 'Industrial Estate (≤ 5 km)';
        else if (distNum <= 10) radiusBelt = 'Cluster Radius (≤ 10 km)';
        else if (distNum <= 15) radiusBelt = 'Regional Corridor (≤ 15 km)';
        else radiusBelt = 'Metro Belt (≤ 25 km)';
      }

      // Extract City, State, Postal code from address
      const addr = p.address || '';
      let postalCode: string | null = null;
      const pinMatch = addr.match(/\b([1-9][0-9]{5})\b/);
      if (pinMatch) postalCode = pinMatch[1];

      let city = 'Industrial Hub';
      let state = 'India';

      if (addr) {
        const parts = addr.split(',').map((s) => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const lastPart = parts[parts.length - 1];
          const secondLast = parts[parts.length - 2];
          if (lastPart.toLowerCase().includes('india') && parts.length >= 3) {
            state = parts[parts.length - 2].replace(/\d+/g, '').trim();
            city = parts[parts.length - 3].trim();
          } else {
            state = lastPart.replace(/\d+/g, '').trim();
            city = secondLast.trim();
          }
        } else if (parts.length === 1) {
          city = parts[0];
        }
      }

      if ((city === 'Industrial Hub' || !city) && anchorName) {
        const aParts = anchorName.split(',').map((s) => s.trim());
        city = aParts[0];
        if (aParts.length > 1) state = aParts[1];
      }

      return {
        sequenceNumber: idx + 1,
        id: `PLACE-${p.placeId ? p.placeId.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 24) : String(idx + 1)}`,
        placeId: p.placeId || null,
        companyName: p.name,
        businessName: p.name,
        primaryType: p.primaryType || 'Industrial Enterprise',
        category: p.primaryType || 'Manufacturing & Industrial',
        industry: query || p.primaryType || 'Industrial Manufacturing',
        subIndustry: null,
        distanceKm: p.distanceKm ? `${p.distanceKm} km` : `${distNum.toFixed(1)} km`,
        radiusBelt,
        searchAnchor: anchorName || 'Industrial Search Area',
        phonePrimary: p.phone || null,
        phoneSecondary: null,
        phoneType: p.phoneType || 'Business Phone',
        emailPrimary: null,
        emailSecondary: null,
        website: p.website || null,
        contactPerson: null,
        designation: 'Operations / Managing Director',
        linkedinUrl: null,
        address: p.address || null,
        streetArea: city && state ? `${city}, ${state}` : null,
        city,
        state,
        country: 'India',
        postalCode,
        latitude: p.location?.latitude || null,
        longitude: p.location?.longitude || null,
        googleMapsUrl: p.googleMapsUri || (p.placeId ? `https://maps.google.com/?q=place_id:${p.placeId}` : null),
        businessDescription: `Industrial enterprise discovered in ${anchorName || 'Industrial Corridor'} within ${p.distanceKm || radiusKm} km`,
        services: p.primaryType || null,
        products: p.primaryType || null,
        operatingStatus: 'OPERATIONAL',
        tier: p.tier || 'Bronze',
        qualificationStatus: 'Verified Industrial Unit',
        rating: typeof p.rating === 'number' ? p.rating : null,
        reviewCount: typeof p.reviewCount === 'number' ? p.reviewCount : null,
        priority: p.tier === 'Gold' ? 'HIGH' : p.tier === 'Silver' ? 'MEDIUM' : 'NORMAL',
        source: 'Google Places Discovery',
        notes: `Haversine Distance: ${p.distanceKm || '0'} km from ${anchorName || 'Search Centre'}`,
        discoveryDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };
    });
  }
}

export const excelExportService = new ExcelExportService();
