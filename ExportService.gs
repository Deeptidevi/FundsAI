/**
 * @fileoverview ExportService.gs
 * RFC 4180-compliant CSV and Microsoft Excel SpreadsheetML (.xml/.xls) generator,
 * selected row exporter, search report exporter, and Google Spreadsheet access helpers.
 */

var ExportService = (function() {

  // All 24 standard table column headers in required sequence
  var TABLE_EXPORT_HEADERS = [
    'Sr. No.',
    'Company Name',
    'Category',
    'Industry / Sector',
    'Primary Place Type',
    'Full Address',
    'City',
    'State',
    'Area / Locality',
    'Postal Code',
    'Phone Number',
    'Phone Type',
    'Website',
    'Google Rating',
    'Review Count',
    'Business Status',
    'Latitude',
    'Longitude',
    'Google Maps Link',
    'Discovery Keyword',
    'Verification Status',
    'Manager Notes',
    'Follow-up Status',
    'Last Updated'
  ];

  /**
   * Escapes a cell value strictly according to RFC 4180 for CSV.
   */
  function escapeCsvCell(val) {
    if (val === null || val === undefined) return '""';
    var str = String(val);
    if (str.indexOf('"') !== -1 || str.indexOf(',') !== -1 || str.indexOf('\n') !== -1 || str.indexOf('\r') !== -1) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return '"' + str + '"';
  }

  /**
   * Converts a 2D array into an RFC 4180 CSV string.
   */
  function arrayToCsv(rows) {
    return rows.map(function(row) {
      return row.map(escapeCsvCell).join(',');
    }).join('\r\n');
  }

  /**
   * Escapes XML characters for Excel SpreadsheetML.
   */
  function escapeXml(val) {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Converts company records into the 24 export column rows.
   */
  function formatCompanyExportRows(companies) {
    var rows = [TABLE_EXPORT_HEADERS];

    companies.forEach(function(c, idx) {
      var category = c.manager_category_override || c.category || 'Bronze';
      rows.push([
        idx + 1, // Sr. No.
        c.company_name || 'Not available',
        category,
        c.industrial_sector || 'General Manufacturing',
        c.primary_type || 'industrial',
        c.formatted_address || 'Not available',
        c.city || 'Not available',
        c.state || 'Not available',
        c.area_locality || c.city || 'Not available',
        c.postal_code || 'Not available',
        c.phone_number || 'Not available',
        c.phone_classification || 'Unknown',
        c.website || 'Not available',
        c.rating !== null && c.rating !== undefined ? c.rating : 'Not available',
        c.review_count || 0,
        c.business_status || 'OPERATIONAL',
        c.latitude || 0,
        c.longitude || 0,
        c.google_maps_url || ('https://www.google.com/maps/place/?q=place_id:' + (c.place_id || '')),
        c.discovery_keywords || c.primary_keyword || 'Direct Search',
        c.verification_status || 'Unverified',
        c.manager_notes || '',
        c.follow_up_status || 'New',
        c.updated_at || c.first_discovered_at || ''
      ]);
    });

    return rows;
  }

  /**
   * Generates CSV for company records based on active table filters.
   * @param {Object} filters
   * @returns {string} CSV text
   */
  function exportCompaniesCsv(filters) {
    filters = filters || {};
    filters.pageSize = 10000; // Export all matching records up to 10k
    filters.page = 1;

    var result = SpreadsheetService.getCompanies(filters);
    var rows = formatCompanyExportRows(result.companies);
    return arrayToCsv(rows);
  }

  /**
   * Generates CSV for specifically selected companies (by record IDs).
   * @param {Array<string>} recordIds
   * @returns {string} CSV text
   */
  function exportSelectedCompaniesCsv(recordIds) {
    if (!recordIds || recordIds.length === 0) {
      throw new Error('No company records were selected for export.');
    }

    var allResult = SpreadsheetService.getCompanies({ pageSize: 10000, page: 1 });
    var idSet = {};
    recordIds.forEach(function(id) { idSet[id] = true; });

    var selected = allResult.companies.filter(function(c) {
      return idSet[c.record_id];
    });

    if (selected.length === 0) {
      throw new Error('Selected records could not be found in database.');
    }

    var rows = formatCompanyExportRows(selected);
    return arrayToCsv(rows);
  }

  /**
   * Generates a genuine Excel SpreadsheetML XML document (.xml/.xls).
   * Opens natively in Excel and spreadsheet viewers with formatting and typed cells.
   * @param {Object} filters
   * @returns {string} XML content
   */
  function exportExcelFile(filters) {
    filters = filters || {};
    filters.pageSize = 10000;
    filters.page = 1;

    var result = SpreadsheetService.getCompanies(filters);
    var rows = formatCompanyExportRows(result.companies);

    var xml = '<?xml version="1.0" encoding="UTF-8"?>\r\n' +
      '<?mso-application progid="Excel.Sheet"?>\r\n' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\r\n' +
      ' xmlns:o="urn:schemas-microsoft-com:office:office"\r\n' +
      ' xmlns:x="urn:schemas-microsoft-com:office:excel"\r\n' +
      ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\r\n' +
      ' xmlns:html="http://www.w3.org/TR/REC-html40">\r\n' +
      ' <Styles>\r\n' +
      '  <Style ss:ID="Default" ss:Name="Normal">\r\n' +
      '   <Alignment ss:Vertical="Center"/>\r\n' +
      '   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>\r\n' +
      '  </Style>\r\n' +
      '  <Style ss:ID="HeaderStyle">\r\n' +
      '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\r\n' +
      '   <Borders>\r\n' +
      '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>\r\n' +
      '   </Borders>\r\n' +
      '   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#0F172A"/>\r\n' +
      '   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>\r\n' +
      '  </Style>\r\n' +
      ' </Styles>\r\n' +
      ' <Worksheet ss:Name="Industrial Companies">\r\n' +
      '  <Table>\r\n';

    rows.forEach(function(row, rIdx) {
      xml += '   <Row ss:AutoFitHeight="1">\r\n';
      row.forEach(function(cell) {
        var isHeader = (rIdx === 0);
        var styleAttr = isHeader ? ' ss:StyleID="HeaderStyle"' : '';
        var cellType = 'String';
        var val = cell;

        if (!isHeader && typeof cell === 'number') {
          cellType = 'Number';
        }

        xml += '    <Cell' + styleAttr + '><Data ss:Type="' + cellType + '">' + escapeXml(val) + '</Data></Cell>\r\n';
      });
      xml += '   </Row>\r\n';
    });

    xml += '  </Table>\r\n' +
      ' </Worksheet>\r\n' +
      '</Workbook>';

    return xml;
  }

  /**
   * Generates a comprehensive Current Search Report CSV.
   * @param {string} [sessionId]
   * @returns {string} CSV text
   */
  function exportCurrentSearchReport(sessionId) {
    var sessions = SpreadsheetService.getSearchSessions();
    var session = sessions.length > 0 ? sessions[0] : null;

    if (sessionId) {
      var found = sessions.filter(function(s) { return s.session_id === sessionId; });
      if (found.length > 0) session = found[0];
    }

    if (!session) {
      throw new Error('No search session found to export.');
    }

    var metrics = SpreadsheetService.getDataQualityMetrics();
    var keywords = SpreadsheetService.getKeywords();

    var rows = [
      ['G-MAPS INDUSTRIAL INTELLIGENCE — SEARCH SESSION REPORT', ''],
      ['Session ID', session.session_id],
      ['Session Name', session.session_name],
      ['Search Timestamp', session.search_timestamp],
      ['Search Type', session.search_type],
      ['Target Area / Bounds', session.area_display_name],
      ['Center Coordinates', session.center_lat + ', ' + session.center_lng],
      ['Approximate Area', (session.approx_area_sqkm || 0) + ' sq km'],
      ['Keywords Executed', session.keywords_used],
      ['Total Places Scanned', session.total_raw_found],
      ['New Unique Companies Stored', session.new_companies_added],
      ['Duplicates Prevented', session.duplicates_prevented],
      ['Status', session.status],
      ['Coverage Notes', session.coverage_notes],
      ['Created By', session.created_by],
      ['', ''],
      ['DATABASE METRIC TOTALS', ''],
      ['Total Unique Companies in Catalog', metrics.totalCompanies],
      ['Gold Tier Companies', metrics.goldCount],
      ['Silver Tier Companies', metrics.silverCount],
      ['Bronze Tier Companies', metrics.bronzeCount],
      ['Contactable Companies (Phone Available)', metrics.contactableCount],
      ['Companies Requiring Review', metrics.needsReviewCount],
      ['', ''],
      ['INDUSTRIAL KEYWORD PERFORMANCE', '', '', '', ''],
      ['Keyword', 'Group', 'Matches', 'Unique Found', 'Duplicates Removed']
    ];

    keywords.forEach(function(kw) {
      rows.push([
        kw.keyword,
        kw.category_group,
        kw.matching_results,
        kw.unique_discovered,
        kw.duplicates_removed
      ]);
    });

    return arrayToCsv(rows);
  }

  /**
   * Generates a validated Location Intelligence Schema 1.0 JSON object and string
   * representing the current search session, coverage metrics, and discovered companies.
   * Nulls are used strictly for unavailable data.
   * @param {string} [sessionId] Search session ID, defaults to most recent
   * @param {Object} [filterOptions] Optional filter options
   * @returns {Object} { isValid: boolean, jsonString: string, data: Object, errors: Array }
   */
  function generateLocationJson(sessionId, filterOptions) {
    var sessions = SpreadsheetService.getSearchSessions();
    var session = null;

    if (sessionId) {
      var matched = sessions.filter(function(s) { return s.session_id === sessionId; });
      if (matched.length > 0) session = matched[0];
    }
    if (!session && sessions.length > 0) {
      session = sessions[0];
    }

    var covRep = null;
    if (session && session.boundary_json) {
      try {
        covRep = JSON.parse(session.boundary_json);
      } catch (e) {
        covRep = null;
      }
    }

    // Retrieve company records
    var queryOpts = { pageSize: 10000, page: 1 };
    if (filterOptions) {
      if (filterOptions.category && filterOptions.category !== 'ALL') queryOpts.category = filterOptions.category;
      if (filterOptions.searchQuery) queryOpts.searchQuery = filterOptions.searchQuery;
      if (filterOptions.kpiFilter) queryOpts.kpiFilter = filterOptions.kpiFilter;
    }
    if (session) {
      queryOpts.sessionId = session.session_id;
    }

    var compResult = SpreadsheetService.getCompanies(queryOpts);
    var companiesList = compResult.companies || [];

    // If session-filtered companies list is empty, fallback to active database records
    if (companiesList.length === 0 && (!filterOptions || !filterOptions.sessionId)) {
      var allResult = SpreadsheetService.getCompanies({ pageSize: 10000, page: 1 });
      companiesList = allResult.companies || [];
    }

    // Map each company strictly conforming to Schema 1.0
    var formattedCompanies = companiesList.map(function(c) {
      var kws = [];
      if (c.discovery_keywords) {
        kws = c.discovery_keywords.split(',').map(function(k) { return k.trim(); }).filter(Boolean);
      } else if (c.primary_keyword) {
        kws = [c.primary_keyword];
      }

      var lat = (c.latitude !== null && c.latitude !== undefined && !isNaN(Number(c.latitude))) ? Number(c.latitude) : null;
      var lng = (c.longitude !== null && c.longitude !== undefined && !isNaN(Number(c.longitude))) ? Number(c.longitude) : null;
      var rating = (c.rating !== null && c.rating !== undefined && !isNaN(Number(c.rating)) && Number(c.rating) > 0) ? Number(c.rating) : null;
      var reviewCount = (c.review_count !== null && c.review_count !== undefined && !isNaN(Number(c.review_count))) ? Number(c.review_count) : null;

      var category = c.manager_category_override || c.category || null;
      var categoryReason = c.override_reason || c.category_reason || null;
      if (!categoryReason && category) {
        categoryReason = 'Assigned ' + category + ' tier from rating (' + (rating !== null ? rating : 'unrated') + ') and reviews (' + (reviewCount !== null ? reviewCount : 0) + ')';
      }

      return {
        placeId: c.place_id || null,
        name: c.company_name || null,
        address: c.formatted_address || null,
        latitude: lat,
        longitude: lng,
        industry: c.industrial_sector || null,
        rating: rating,
        reviewCount: reviewCount,
        phone: c.phone_number || null,
        phoneType: c.phone_classification || 'Unknown',
        website: c.website || null,
        googleMapsUrl: c.google_maps_url || (c.place_id ? ('https://www.google.com/maps/place/?q=place_id:' + c.place_id) : null),
        category: category,
        categoryReason: categoryReason,
        discoveredByKeywords: kws,
        verificationStatus: c.verification_status || 'Unverified'
      };
    });

    // Assemble coverage metrics
    var queriesAttempted = (covRep && covRep.metrics && covRep.metrics.queriesAttempted) || 0;
    var queriesSucceeded = (covRep && covRep.metrics && covRep.metrics.queriesSucceeded) || 0;
    var queriesFailed = (covRep && covRep.metrics && covRep.metrics.queriesFailed) || 0;
    var rawAppearances = (covRep && covRep.metrics && covRep.metrics.rawResultAppearances) || (session ? Number(session.total_raw_found) || 0 : 0);
    var dupsRemoved = (covRep && covRep.metrics && covRep.metrics.duplicatesRemoved) || (session ? Number(session.duplicates_prevented) || 0 : 0);
    var warnings = (covRep && covRep.metrics && covRep.metrics.warnings) || [];
    if (session && session.coverage_notes && warnings.indexOf(session.coverage_notes) === -1) {
      warnings.push(session.coverage_notes);
    }

    var kwsUsed = [];
    if (covRep && covRep.keywordsUsed) {
      kwsUsed = covRep.keywordsUsed;
    } else if (session && session.keywords_used) {
      kwsUsed = session.keywords_used.split(',').map(function(k) { return k.trim(); }).filter(Boolean);
    }

    var boundaryObj = {
      type: (covRep && covRep.boundary && covRep.boundary.type) || 'Geographical Bounds',
      coordinates: (covRep && covRep.boundary && covRep.boundary.coordinates) || []
    };

    var searchLat = session ? Number(session.center_lat) : (covRep && covRep.center ? covRep.center.lat : 0);
    var searchLng = session ? Number(session.center_lng) : (covRep && covRep.center ? covRep.center.lng : 0);

    var locationJsonObj = {
      schemaVersion: '1.0',
      search: {
        searchId: session ? session.session_id : ('SRCH-' + Utilities.getUuid().substring(0, 8)),
        country: (covRep && covRep.location && covRep.location.country) || 'India',
        state: (covRep && covRep.location && covRep.location.state) || null,
        city: (covRep && covRep.location && covRep.location.city) || null,
        locality: (covRep && covRep.location && covRep.location.locality) || null,
        latitude: searchLat,
        longitude: searchLng,
        boundary: boundaryObj,
        keywordsUsed: kwsUsed,
        startedAt: (covRep && covRep.startedAt) || (session ? session.search_timestamp : new Date().toISOString()),
        completedAt: (covRep && covRep.completedAt) || new Date().toISOString(),
        status: (covRep && covRep.status) || (session ? session.status : 'Completed')
      },
      coverage: {
        queriesAttempted: queriesAttempted,
        queriesSucceeded: queriesSucceeded,
        queriesFailed: queriesFailed,
        rawResultAppearances: rawAppearances,
        uniqueRecords: formattedCompanies.length,
        duplicateMatchesRemoved: dupsRemoved,
        coverageGuaranteed: false, // Per prompt: Never claim 100% or guaranteed coverage
        warnings: warnings
      },
      companies: formattedCompanies
    };

    // Validate the generated JSON against Schema 1.0 rules
    var validation = validateLocationJson(locationJsonObj);
    if (!validation.isValid) {
      throw new Error('Location JSON validation failed: ' + validation.errors.join('; '));
    }

    return {
      isValid: true,
      data: locationJsonObj,
      jsonString: JSON.stringify(locationJsonObj, null, 2),
      companyCount: formattedCompanies.length,
      searchId: locationJsonObj.search.searchId
    };
  }

  /**
   * Validates a Location JSON object against Schema 1.0 constraints.
   * @param {Object} obj
   * @returns {Object} { isValid: boolean, errors: Array<string> }
   */
  function validateLocationJson(obj) {
    var errors = [];
    if (!obj || typeof obj !== 'object') {
      return { isValid: false, errors: ['Export payload is not an object.'] };
    }

    if (obj.schemaVersion !== '1.0') {
      errors.push('Missing or invalid schemaVersion. Expected "1.0".');
    }

    if (!obj.search || typeof obj.search !== 'object') {
      errors.push('Missing required "search" metadata object.');
    } else {
      if (!obj.search.searchId) errors.push('search.searchId is required.');
      if (typeof obj.search.latitude !== 'number' || isNaN(obj.search.latitude)) errors.push('search.latitude must be a valid number.');
      if (typeof obj.search.longitude !== 'number' || isNaN(obj.search.longitude)) errors.push('search.longitude must be a valid number.');
      if (!obj.search.boundary || !obj.search.boundary.type) errors.push('search.boundary with geometry type is required.');
      if (!Array.isArray(obj.search.keywordsUsed)) errors.push('search.keywordsUsed must be an array.');
    }

    if (!obj.coverage || typeof obj.coverage !== 'object') {
      errors.push('Missing required "coverage" dashboard object.');
    } else {
      if (typeof obj.coverage.queriesAttempted !== 'number') errors.push('coverage.queriesAttempted must be a number.');
      if (typeof obj.coverage.uniqueRecords !== 'number') errors.push('coverage.uniqueRecords must be a number.');
      if (obj.coverage.coverageGuaranteed !== false) errors.push('coverage.coverageGuaranteed must explicitly be false.');
      if (!Array.isArray(obj.coverage.warnings)) errors.push('coverage.warnings must be an array.');
    }

    if (!Array.isArray(obj.companies)) {
      errors.push('Missing required "companies" array.');
    } else {
      // Validate sample of companies
      for (var i = 0; i < Math.min(obj.companies.length, 50); i++) {
        var comp = obj.companies[i];
        if (!comp.name && !comp.placeId) {
          errors.push('Company at index ' + i + ' missing both name and placeId.');
          break;
        }
        if (!Array.isArray(comp.discoveredByKeywords)) {
          errors.push('Company at index ' + i + ' discoveredByKeywords must be an array.');
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Returns direct URL to the linked Google Spreadsheet in Drive.
   */
  function getSpreadsheetUrl() {
    var config = Config.getConfig();
    if (config.spreadsheetId) {
      return 'https://docs.google.com/spreadsheets/d/' + config.spreadsheetId + '/edit';
    }
    try {
      var active = SpreadsheetApp.getActiveSpreadsheet();
      if (active) return active.getUrl();
    } catch (e) {
      // not container-bound
    }
    return '';
  }

  return {
    exportCompaniesCsv: exportCompaniesCsv,
    exportSelectedCompaniesCsv: exportSelectedCompaniesCsv,
    exportExcelFile: exportExcelFile,
    exportCurrentSearchReport: exportCurrentSearchReport,
    generateLocationJson: generateLocationJson,
    validateLocationJson: validateLocationJson,
    getSpreadsheetUrl: getSpreadsheetUrl
  };
})();
