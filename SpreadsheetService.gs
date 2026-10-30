/**
 * @fileoverview SpreadsheetService.gs
 * Persistent storage layer on Google Sheets with automatic schema provisioning,
 * thread-safe writes via LockService, batch operations, filtering, and audit logging.
 */

var SpreadsheetService = (function() {

  // Column definitions for the Companies sheet (Includes all 24 required table attributes)
  var COMPANY_HEADERS = [
    'record_id', 'place_id', 'company_name', 'source_name', 'manager_corrected_name',
    'category', 'auto_category', 'category_reason', 'manager_category_override', 'override_reason',
    'industrial_sector', 'primary_type', 'all_types',
    'formatted_address', 'source_address', 'manager_corrected_address',
    'city', 'state', 'country', 'postal_code', 'area_locality',
    'latitude', 'longitude',
    'phone_number', 'source_phone', 'manager_corrected_phone', 'normalized_phone',
    'phone_classification', 'phone_country_code',
    'website', 'manager_corrected_website', 'rating', 'review_count', 'business_status',
    'google_maps_url', 'discovery_keywords', 'primary_keyword', 'search_session_id', 'search_area_name',
    'relevance_score', 'relevance_reason', 'verification_status', 'verified_by', 'verified_at',
    'lead_priority', 'follow_up_status', 'next_follow_up_date', 'last_contacted_date', 'assigned_to',
    'manager_notes', 'contact_person', 'first_discovered_at', 'last_checked_at', 'updated_at'
  ];

  var SESSION_HEADERS = [
    'session_id', 'session_name', 'search_timestamp', 'search_type', 'center_lat', 'center_lng',
    'radius_meters', 'boundary_json', 'area_display_name', 'approx_area_sqkm', 'keywords_used',
    'total_raw_found', 'new_companies_added', 'duplicates_prevented', 'status', 'coverage_notes', 'created_by'
  ];

  // Headers for the INDUSTRIAL KEYWORD ANALYSIS panel
  var KEYWORD_HEADERS = [
    'keyword_id', 'keyword', 'category_group', 'is_enabled', 'is_custom',
    'matching_results', 'unique_discovered', 'duplicates_removed', 'rejected_irrelevant',
    'requiring_review', 'last_search_at', 'search_status', 'added_at'
  ];

  var AUDIT_HEADERS = [
    'audit_id', 'record_id', 'entity_type', 'action', 'field_name', 'old_value', 'new_value', 'user_email', 'timestamp', 'notes'
  ];

  var DUPLICATE_HEADERS = [
    'review_id', 'primary_record_id', 'incoming_record_id', 'company_name_a', 'company_name_b',
    'place_id_a', 'place_id_b', 'phone_a', 'phone_b', 'address_a', 'address_b', 'distance_meters',
    'similarity_reason', 'status', 'created_at', 'resolved_at', 'resolved_by'
  ];

  var SETTINGS_HEADERS = [
    'setting_key', 'setting_value', 'description', 'updated_at'
  ];

  /**
   * Retrieves the active or configured Spreadsheet.
   */
  function getSpreadsheet() {
    var config = Config.getConfig();
    if (config.spreadsheetId) {
      try {
        return SpreadsheetApp.openById(config.spreadsheetId);
      } catch (e) {
        throw new Error('Could not open spreadsheet with ID "' + config.spreadsheetId + '". Check permissions or ID in Script Properties.');
      }
    }

    try {
      var active = SpreadsheetApp.getActiveSpreadsheet();
      if (active) return active;
    } catch (e) {
      // not container-bound
    }

    throw new Error('No Google Sheet connected. Please set SPREADSHEET_ID in Script Properties or link this script to a Google Sheet.');
  }

  /**
   * Ensures all required sheets exist with valid headers without overwriting existing data.
   */
  function initializeDatabase() {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) {
      throw new Error('Database is currently locked by another concurrent process. Please retry.');
    }

    try {
      var ss = getSpreadsheet();
      var sheetDefinitions = [
        { name: Config.DEFAULTS.SHEETS.COMPANIES, headers: COMPANY_HEADERS },
        { name: Config.DEFAULTS.SHEETS.SEARCH_SESSIONS, headers: SESSION_HEADERS },
        { name: Config.DEFAULTS.SHEETS.SEARCH_KEYWORDS, headers: KEYWORD_HEADERS },
        { name: Config.DEFAULTS.SHEETS.AUDIT_LOG, headers: AUDIT_HEADERS },
        { name: Config.DEFAULTS.SHEETS.DUPLICATE_REVIEW, headers: DUPLICATE_HEADERS },
        { name: Config.DEFAULTS.SHEETS.SETTINGS, headers: SETTINGS_HEADERS }
      ];

      sheetDefinitions.forEach(function(def) {
        var sheet = ss.getSheetByName(def.name);
        if (!sheet) {
          sheet = ss.insertSheet(def.name);
          sheet.appendRow(def.headers);
          sheet.getRange(1, 1, 1, def.headers.length).setFontWeight('bold').setBackground('#f1f5f9');
          sheet.setFrozenRows(1);
        } else {
          // If sheet exists but is empty, add headers
          if (sheet.getLastRowNum() === 0) {
            sheet.appendRow(def.headers);
            sheet.getRange(1, 1, 1, def.headers.length).setFontWeight('bold').setBackground('#f1f5f9');
            sheet.setFrozenRows(1);
          }
        }
      });

      // Seed default keywords if SearchKeywords sheet is empty
      var kwSheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.SEARCH_KEYWORDS);
      if (kwSheet.getLastRowNum() <= 1) {
        var nowIso = new Date().toISOString();
        var defaultKws = Config.DEFAULTS.DEFAULT_KEYWORDS.map(function(item, idx) {
          return [
            'KW-' + (idx + 1),
            item.keyword,
            item.category,
            item.is_enabled ? 'TRUE' : 'FALSE',
            'FALSE',
            0, // matching_results
            0, // unique_discovered
            0, // duplicates_removed
            0, // rejected_irrelevant
            0, // requiring_review
            '', // last_search_at
            'Ready', // search_status
            nowIso
          ];
        });
        if (defaultKws.length > 0) {
          kwSheet.getRange(2, 1, defaultKws.length, defaultKws[0].length).setValues(defaultKws);
        }
      }

      // Seed default settings if Settings sheet is empty
      var setSheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.SETTINGS);
      if (setSheet.getLastRowNum() <= 1) {
        var nowIso = new Date().toISOString();
        var defaultSettings = [
          ['GOLD_MIN_RATING', '4.5', 'Minimum Google rating required for Gold tier', nowIso],
          ['GOLD_MIN_REVIEWS', '100', 'Minimum Google review count required for Gold tier', nowIso],
          ['SILVER_MIN_RATING', '4.0', 'Minimum Google rating required for Silver tier', nowIso],
          ['SILVER_MIN_REVIEWS', '25', 'Minimum Google review count required for Silver tier', nowIso],
          ['SEARCH_RADIUS_DEFAULT', '5000', 'Default geographical search radius in meters', nowIso],
          ['DUPLICATE_DISTANCE_THRESHOLD', '100', 'Proximity radius in meters for fuzzy name matching', nowIso]
        ];
        setSheet.getRange(2, 1, defaultSettings.length, defaultSettings[0].length).setValues(defaultSettings);
      }

      return { success: true, message: 'Database sheets initialized successfully.' };
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Light-weight read of existing companies for fast duplicate checks.
   */
  function getExistingCompaniesLight() {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.COMPANIES);
    if (!sheet || sheet.getLastRowNum() <= 1) return [];

    var lastRow = sheet.getLastRowNum();
    var values = sheet.getRange(2, 1, lastRow - 1, COMPANY_HEADERS.length).getValues();

    var recIdIdx = COMPANY_HEADERS.indexOf('record_id');
    var placeIdIdx = COMPANY_HEADERS.indexOf('place_id');
    var nameIdx = COMPANY_HEADERS.indexOf('company_name');
    var phoneIdx = COMPANY_HEADERS.indexOf('phone_number');
    var normPhoneIdx = COMPANY_HEADERS.indexOf('normalized_phone');
    var latIdx = COMPANY_HEADERS.indexOf('latitude');
    var lngIdx = COMPANY_HEADERS.indexOf('longitude');
    var addrIdx = COMPANY_HEADERS.indexOf('formatted_address');
    var kwIdx = COMPANY_HEADERS.indexOf('discovery_keywords');

    return values.map(function(row) {
      return {
        record_id: row[recIdIdx],
        place_id: row[placeIdIdx],
        company_name: row[nameIdx],
        phone_number: row[phoneIdx],
        normalized_phone: row[normPhoneIdx],
        latitude: parseFloat(row[latIdx]) || 0,
        longitude: parseFloat(row[lngIdx]) || 0,
        formatted_address: row[addrIdx],
        discovery_keywords: row[kwIdx]
      };
    });
  }

  /**
   * Thread-safe batch insertion of companies.
   */
  function batchInsertCompanies(records) {
    if (!records || records.length === 0) return;
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      throw new Error('Lock timeout while inserting company records.');
    }

    try {
      var ss = getSpreadsheet();
      var sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.COMPANIES);
      if (!sheet) {
        initializeDatabase();
        sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.COMPANIES);
      }

      var rows = records.map(function(rec) {
        return COMPANY_HEADERS.map(function(header) {
          var val = rec[header];
          return val !== undefined && val !== null ? val : '';
        });
      });

      var nextRow = sheet.getLastRowNum() + 1;
      sheet.getRange(nextRow, 1, rows.length, COMPANY_HEADERS.length).setValues(rows);

      // Record audit entries for newly added companies
      var auditSheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.AUDIT_LOG);
      if (auditSheet) {
        var userEmail = Session.getActiveUser().getEmail() || 'Manager';
        var nowIso = new Date().toISOString();
        var auditRows = records.map(function(rec) {
          return [
            'AUD-' + Utilities.getUuid().substring(0, 8).toUpperCase(),
            rec.record_id,
            'Company',
            'Created',
            'ALL',
            '',
            rec.company_name,
            userEmail,
            nowIso,
            'Discovered via search keyword: ' + rec.primary_keyword
          ];
        });
        var nextAuditRow = auditSheet.getLastRowNum() + 1;
        auditSheet.getRange(nextAuditRow, 1, auditRows.length, AUDIT_HEADERS.length).setValues(auditRows);
      }
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Appends keyword to an existing company record if not already present.
   */
  function appendKeywordToCompany(recordId, newKeywords) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.COMPANIES);
    if (!sheet || sheet.getLastRowNum() <= 1) return;

    var kwIdx = COMPANY_HEADERS.indexOf('discovery_keywords') + 1;
    var recIdIdx = COMPANY_HEADERS.indexOf('record_id') + 1;
    var lastCheckedIdx = COMPANY_HEADERS.indexOf('last_checked_at') + 1;

    var lastRow = sheet.getLastRowNum();
    var recIds = sheet.getRange(2, recIdIdx, lastRow - 1, 1).getValues();

    for (var i = 0; i < recIds.length; i++) {
      if (recIds[i][0] === recordId) {
        var rowNum = i + 2;
        var currentKws = sheet.getRange(rowNum, kwIdx).getValue() || '';
        var kwList = currentKws ? currentKws.split(', ').map(function(s){return s.trim();}) : [];
        var incomingKws = newKeywords.split(', ').map(function(s){return s.trim();});

        var changed = false;
        incomingKws.forEach(function(k) {
          if (k && kwList.indexOf(k) === -1) {
            kwList.push(k);
            changed = true;
          }
        });

        if (changed) {
          sheet.getRange(rowNum, kwIdx).setValue(kwList.join(', '));
        }
        sheet.getRange(rowNum, lastCheckedIdx).setValue(new Date().toISOString());
        break;
      }
    }
  }

  /**
   * Batch inserts duplicate review candidates.
   */
  function batchInsertDuplicateReviews(reviews) {
    if (!reviews || reviews.length === 0) return;
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.DUPLICATE_REVIEW);
    if (!sheet) return;

    var rows = reviews.map(function(r) {
      return DUPLICATE_HEADERS.map(function(h) {
        return r[h] !== undefined ? r[h] : '';
      });
    });

    var nextRow = sheet.getLastRowNum() + 1;
    sheet.getRange(nextRow, 1, rows.length, DUPLICATE_HEADERS.length).setValues(rows);
  }

  /**
   * Saves a search session record.
   */
  function saveSearchSession(session) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.SEARCH_SESSIONS);
    if (!sheet) return;

    var row = SESSION_HEADERS.map(function(h) {
      return session[h] !== undefined ? session[h] : '';
    });

    sheet.appendRow(row);
  }

  /**
   * Retrieves companies matching multi-attribute filter criteria.
   * Supports filtering by the 6 KPI cards, search query, category, sector, verification.
   * @param {Object} filters
   * @returns {Object} { total: number, companies: Array<Object>, page: number, totalPages: number }
   */
  function getCompanies(filters) {
    filters = filters || {};
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.COMPANIES);
    if (!sheet || sheet.getLastRowNum() <= 1) {
      return { total: 0, companies: [], page: 1, totalPages: 1 };
    }

    var lastRow = sheet.getLastRowNum();
    var data = sheet.getRange(2, 1, lastRow - 1, COMPANY_HEADERS.length).getValues();

    var companies = data.map(function(row) {
      var obj = {};
      COMPANY_HEADERS.forEach(function(h, idx) {
        obj[h] = row[idx];
      });
      if (filters.centerLat && filters.centerLng && obj.latitude && obj.longitude) {
        var d = CompanyService.calculateDistanceMeters(Number(filters.centerLat), Number(filters.centerLng), Number(obj.latitude), Number(obj.longitude));
        obj.distance_meters = Math.round(d);
        obj.distance_km = Math.round((d / 1000) * 100) / 100;
        obj.distance_text = d < 1000 ? Math.round(d) + ' m' : (d / 1000).toFixed(2) + ' km';
      } else {
        obj.distance_meters = null;
        obj.distance_km = null;
        obj.distance_text = 'N/A';
      }
      return obj;
    });

    // Apply filtering
    var filtered = companies.filter(function(c) {
      var effCategory = c.manager_category_override || c.category;

      // Max distance filter (e.g. within 1,000 meters)
      if (filters.maxDistanceMeters && c.distance_meters !== null) {
        if (c.distance_meters > Number(filters.maxDistanceMeters)) return false;
      }

      // Relevance filter
      if (filters.relevance && filters.relevance !== 'ALL') {
        if (filters.relevance === 'HIGH' && c.relevance_score !== 'High Industrial Relevance') return false;
        if (filters.relevance === 'MEDIUM' && c.relevance_score !== 'Medium Industrial Relevance') return false;
        if (filters.relevance === 'REVIEW' && c.relevance_score !== 'Needs Review') return false;
      }

      // KPI Card Filter Interaction
      if (filters.kpiFilter) {
        if (filters.kpiFilter === 'GOLD' && effCategory !== 'Gold') return false;
        if (filters.kpiFilter === 'SILVER' && effCategory !== 'Silver') return false;
        if (filters.kpiFilter === 'BRONZE' && effCategory !== 'Bronze') return false;
        if (filters.kpiFilter === 'CONTACTABLE') {
          if (!c.phone_number || String(c.phone_number).trim() === '') return false;
        }
        if (filters.kpiFilter === 'NEEDS_REVIEW') {
          var isReview = (c.verification_status !== 'Verified') ||
                         (c.relevance_score === 'Needs Review') ||
                         (c.relevance_score === 'Excluded (Consumer Business)') ||
                         (c.phone_classification === 'Unknown — Verify' || c.phone_classification === 'Unknown');
          if (!isReview) return false;
        }
      }

      // Explicit Category filter dropdown
      if (filters.category && filters.category !== 'ALL') {
        if (effCategory !== filters.category) return false;
      }

      // Sector filter dropdown
      if (filters.sector && filters.sector !== 'ALL') {
        if (c.industrial_sector !== filters.sector) return false;
      }

      // Verification status filter
      if (filters.verificationStatus && filters.verificationStatus !== 'ALL') {
        if (c.verification_status !== filters.verificationStatus) return false;
      }

      // Follow-up status filter
      if (filters.followUpStatus && filters.followUpStatus !== 'ALL') {
        if (c.follow_up_status !== filters.followUpStatus) return false;
      }

      // Lead Priority filter
      if (filters.priority && filters.priority !== 'ALL') {
        if (c.lead_priority !== filters.priority) return false;
      }

      // Missing contact filter
      if (filters.missingContact) {
        if (filters.missingContact === 'phone' && c.phone_number) return false;
        if (filters.missingContact === 'website' && c.website) return false;
      }

      // Rating filter
      if (filters.minRating !== undefined && filters.minRating !== null && filters.minRating !== '') {
        if (c.rating === null || c.rating < parseFloat(filters.minRating)) return false;
      }

      // Search text query (matches name, phone, address, city, state, locality, or keyword)
      if (filters.searchQuery && filters.searchQuery.trim() !== '') {
        var q = filters.searchQuery.toLowerCase().trim();
        var match = (c.company_name && c.company_name.toLowerCase().indexOf(q) !== -1) ||
                    (c.phone_number && c.phone_number.toLowerCase().indexOf(q) !== -1) ||
                    (c.formatted_address && c.formatted_address.toLowerCase().indexOf(q) !== -1) ||
                    (c.city && c.city.toLowerCase().indexOf(q) !== -1) ||
                    (c.state && c.state.toLowerCase().indexOf(q) !== -1) ||
                    (c.area_locality && c.area_locality.toLowerCase().indexOf(q) !== -1) ||
                    (c.industrial_sector && c.industrial_sector.toLowerCase().indexOf(q) !== -1) ||
                    (c.discovery_keywords && c.discovery_keywords.toLowerCase().indexOf(q) !== -1);
        if (!match) return false;
      }

      return true;
    });

    // Sorting
    var sortBy = filters.sortBy || 'rating';
    var sortOrder = filters.sortOrder || 'desc';

    filtered.sort(function(a, b) {
      var valA = a[sortBy];
      var valB = b[sortBy];

      if (sortBy === 'rating' || sortBy === 'review_count') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    var page = parseInt(filters.page || 1, 10);
    var pageSize = parseInt(filters.pageSize || 25, 10);
    var total = filtered.length;
    var totalPages = Math.ceil(total / pageSize) || 1;
    var startIdx = (page - 1) * pageSize;
    var paginated = filtered.slice(startIdx, startIdx + pageSize);

    return {
      total: total,
      companies: paginated,
      page: page,
      totalPages: totalPages
    };
  }

  /**
   * Retrieves single company details by internal record ID.
   */
  function getCompanyById(recordId) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.COMPANIES);
    if (!sheet || sheet.getLastRowNum() <= 1) return null;

    var lastRow = sheet.getLastRowNum();
    var data = sheet.getRange(2, 1, lastRow - 1, COMPANY_HEADERS.length).getValues();

    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === recordId) {
        var obj = {};
        COMPANY_HEADERS.forEach(function(h, idx) {
          obj[h] = data[i][idx];
        });
        return obj;
      }
    }
    return null;
  }

  /**
   * Updates company record with manager edits, validates inputs, and records audit trail.
   */
  function updateCompany(recordId, updateData) {
    if (!recordId) throw new Error('Missing recordId.');

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) {
      throw new Error('Lock timeout while updating company.');
    }

    try {
      var ss = getSpreadsheet();
      var sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.COMPANIES);
      if (!sheet || sheet.getLastRowNum() <= 1) throw new Error('Company sheet is empty.');

      var lastRow = sheet.getLastRowNum();
      var data = sheet.getRange(2, 1, lastRow - 1, COMPANY_HEADERS.length).getValues();
      var rowIndex = -1;

      for (var i = 0; i < data.length; i++) {
        if (data[i][0] === recordId) {
          rowIndex = i + 2;
          break;
        }
      }

      if (rowIndex === -1) {
        throw new Error('Company with ID ' + recordId + ' not found.');
      }

      var userEmail = Session.getActiveUser().getEmail() || 'Manager';
      var nowIso = new Date().toISOString();
      var auditEntries = [];

      function updateField(headerName, newVal) {
        var colIdx = COMPANY_HEADERS.indexOf(headerName) + 1;
        var oldVal = sheet.getRange(rowIndex, colIdx).getValue();
        if (newVal !== undefined && newVal !== null && newVal !== oldVal) {
          sheet.getRange(rowIndex, colIdx).setValue(newVal);
          auditEntries.push([
            'AUD-' + Utilities.getUuid().substring(0, 8).toUpperCase(),
            recordId,
            'Company',
            'Updated',
            headerName,
            String(oldVal),
            String(newVal),
            userEmail,
            nowIso,
            'Manager edit via dashboard'
          ]);
        }
      }

      if (updateData.manager_corrected_name !== undefined) {
        updateField('manager_corrected_name', updateData.manager_corrected_name);
        if (updateData.manager_corrected_name.trim() !== '') {
          updateField('company_name', updateData.manager_corrected_name.trim());
        }
      }

      if (updateData.manager_corrected_phone !== undefined) {
        updateField('manager_corrected_phone', updateData.manager_corrected_phone);
        if (updateData.manager_corrected_phone.trim() !== '') {
          var pAnalysis = PhoneService.parseAndClassify(updateData.manager_corrected_phone);
          updateField('phone_number', updateData.manager_corrected_phone);
          updateField('normalized_phone', pAnalysis.normalized);
          updateField('phone_classification', pAnalysis.classification);
          updateField('phone_country_code', pAnalysis.countryCode);
        }
      }

      if (updateData.manager_corrected_address !== undefined) {
        updateField('manager_corrected_address', updateData.manager_corrected_address);
        if (updateData.manager_corrected_address.trim() !== '') {
          updateField('formatted_address', updateData.manager_corrected_address.trim());
        }
      }

      if (updateData.manager_corrected_website !== undefined) {
        updateField('manager_corrected_website', updateData.manager_corrected_website);
        if (updateData.manager_corrected_website.trim() !== '') {
          updateField('website', updateData.manager_corrected_website.trim());
        }
      }

      if (updateData.manager_category_override !== undefined) {
        updateField('manager_category_override', updateData.manager_category_override);
        if (updateData.manager_category_override !== '') {
          updateField('category', updateData.manager_category_override);
        }
      }

      if (updateData.override_reason !== undefined) updateField('override_reason', updateData.override_reason);
      if (updateData.industrial_sector !== undefined) updateField('industrial_sector', updateData.industrial_sector);
      if (updateData.manager_notes !== undefined) updateField('manager_notes', updateData.manager_notes);
      if (updateData.contact_person !== undefined) updateField('contact_person', updateData.contact_person);
      if (updateData.lead_priority !== undefined) updateField('lead_priority', updateData.lead_priority);
      if (updateData.follow_up_status !== undefined) updateField('follow_up_status', updateData.follow_up_status);
      if (updateData.next_follow_up_date !== undefined) updateField('next_follow_up_date', updateData.next_follow_up_date);
      if (updateData.assigned_to !== undefined) updateField('assigned_to', updateData.assigned_to);

      if (updateData.verification_status !== undefined) {
        updateField('verification_status', updateData.verification_status);
        if (updateData.verification_status === 'Verified') {
          updateField('verified_by', userEmail);
          updateField('verified_at', nowIso);
        }
      }

      updateField('updated_at', nowIso);

      if (auditEntries.length > 0) {
        var auditSheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.AUDIT_LOG);
        if (auditSheet) {
          var nextAuditRow = auditSheet.getLastRowNum() + 1;
          auditSheet.getRange(nextAuditRow, 1, auditEntries.length, AUDIT_HEADERS.length).setValues(auditEntries);
        }
      }

      return getCompanyById(recordId);
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Retrieves data quality metrics calculated directly from stored company records.
   * Accurately calculates the exact six KPI matrix cards without double-counting.
   */
  function getDataQualityMetrics() {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.COMPANIES);
    
    var metrics = {
      totalCompanies: 0,
      goldCount: 0,
      silverCount: 0,
      bronzeCount: 0,
      contactableCount: 0, // Unique companies with an available phone number
      needsReviewCount: 0, // Unique companies requiring review (without double-counting)
      verifiedCount: 0,
      unverifiedCount: 0,
      missingPhoneCount: 0,
      missingWebsiteCount: 0,
      missingRatingCount: 0,
      unknownPhoneClassificationCount: 0,
      mobilePhoneCount: 0,
      landlinePhoneCount: 0,
      tollFreeCount: 0,
      pendingDuplicatesCount: 0
    };

    if (!sheet || sheet.getLastRowNum() <= 1) return metrics;

    var lastRow = sheet.getLastRowNum();
    var data = sheet.getRange(2, 1, lastRow - 1, COMPANY_HEADERS.length).getValues();
    metrics.totalCompanies = data.length;

    var catIdx = COMPANY_HEADERS.indexOf('category');
    var overrideCatIdx = COMPANY_HEADERS.indexOf('manager_category_override');
    var verIdx = COMPANY_HEADERS.indexOf('verification_status');
    var phoneIdx = COMPANY_HEADERS.indexOf('phone_number');
    var webIdx = COMPANY_HEADERS.indexOf('website');
    var ratingIdx = COMPANY_HEADERS.indexOf('rating');
    var phoneClassIdx = COMPANY_HEADERS.indexOf('phone_classification');
    var relIdx = COMPANY_HEADERS.indexOf('relevance_score');

    data.forEach(function(row) {
      var cat = row[overrideCatIdx] || row[catIdx];
      if (cat === 'Gold') metrics.goldCount++;
      else if (cat === 'Silver') metrics.silverCount++;
      else if (cat === 'Bronze') metrics.bronzeCount++;

      var hasPhone = row[phoneIdx] && String(row[phoneIdx]).trim() !== '';
      if (hasPhone) {
        metrics.contactableCount++;
      } else {
        metrics.missingPhoneCount++;
      }

      if (row[verIdx] === 'Verified') {
        metrics.verifiedCount++;
      } else {
        metrics.unverifiedCount++;
      }

      if (!row[webIdx] || String(row[webIdx]).trim() === '') metrics.missingWebsiteCount++;
      if (row[ratingIdx] === '' || row[ratingIdx] === null) metrics.missingRatingCount++;

      var pClass = row[phoneClassIdx];
      if (pClass === 'Mobile') metrics.mobilePhoneCount++;
      else if (pClass === 'Landline') metrics.landlinePhoneCount++;
      else if (pClass === 'Toll-free') metrics.tollFreeCount++;
      else if (pClass === 'Unknown — Verify' || pClass === 'Unknown') metrics.unknownPhoneClassificationCount++;

      // Accurate evaluation of Needs Review: a single company is counted once
      var companyNeedsReview = (row[verIdx] !== 'Verified') ||
                               (row[relIdx] === 'Needs Review') ||
                               (row[relIdx] === 'Excluded (Consumer Business)') ||
                               (pClass === 'Unknown — Verify' || pClass === 'Unknown');
      if (companyNeedsReview) {
        metrics.needsReviewCount++;
      }
    });

    // Check Duplicate Review sheet
    var dupSheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.DUPLICATE_REVIEW);
    if (dupSheet && dupSheet.getLastRowNum() > 1) {
      var dupData = dupSheet.getRange(2, 14, dupSheet.getLastRowNum() - 1, 1).getValues();
      dupData.forEach(function(r) {
        if (r[0] === 'Pending') metrics.pendingDuplicatesCount++;
      });
    }

    return metrics;
  }

  /**
   * Retrieves all search sessions.
   */
  function getSearchSessions() {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.SEARCH_SESSIONS);
    if (!sheet || sheet.getLastRowNum() <= 1) return [];

    var lastRow = sheet.getLastRowNum();
    var data = sheet.getRange(2, 1, lastRow - 1, SESSION_HEADERS.length).getValues();

    return data.map(function(row) {
      var obj = {};
      SESSION_HEADERS.forEach(function(h, idx) {
        obj[h] = row[idx];
      });
      return obj;
    }).reverse();
  }

  /**
   * Retrieves keywords from the SearchKeywords sheet including real-time analysis statistics.
   */
  function getKeywords() {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.SEARCH_KEYWORDS);
    if (!sheet || sheet.getLastRowNum() <= 1) return [];

    var lastRow = sheet.getLastRowNum();
    var data = sheet.getRange(2, 1, lastRow - 1, KEYWORD_HEADERS.length).getValues();

    return data.map(function(row) {
      var obj = {};
      KEYWORD_HEADERS.forEach(function(h, idx) {
        obj[h] = row[idx];
      });
      obj.is_enabled = obj.is_enabled === 'TRUE' || obj.is_enabled === true;
      obj.matching_results = parseInt(obj.matching_results, 10) || 0;
      obj.unique_discovered = parseInt(obj.unique_discovered, 10) || 0;
      obj.duplicates_removed = parseInt(obj.duplicates_removed, 10) || 0;
      obj.rejected_irrelevant = parseInt(obj.rejected_irrelevant, 10) || 0;
      obj.requiring_review = parseInt(obj.requiring_review, 10) || 0;
      return obj;
    });
  }

  /**
   * Updates keyword execution statistics in the SearchKeywords sheet based on search results.
   */
  function updateKeywordAnalytics(statsMap) {
    if (!statsMap) return;
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.SEARCH_KEYWORDS);
    if (!sheet || sheet.getLastRowNum() <= 1) return;

    var lastRow = sheet.getLastRowNum();
    var kwValues = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); // Column 2 is keyword
    var nowIso = new Date().toISOString();

    var matchCol = KEYWORD_HEADERS.indexOf('matching_results') + 1;
    var uniqCol = KEYWORD_HEADERS.indexOf('unique_discovered') + 1;
    var dupCol = KEYWORD_HEADERS.indexOf('duplicates_removed') + 1;
    var rejCol = KEYWORD_HEADERS.indexOf('rejected_irrelevant') + 1;
    var revCol = KEYWORD_HEADERS.indexOf('requiring_review') + 1;
    var lastSearchCol = KEYWORD_HEADERS.indexOf('last_search_at') + 1;
    var statusCol = KEYWORD_HEADERS.indexOf('search_status') + 1;

    for (var i = 0; i < kwValues.length; i++) {
      var kw = kwValues[i][0];
      if (statsMap[kw]) {
        var rowNum = i + 2;
        var s = statsMap[kw];
        var curMatches = parseInt(sheet.getRange(rowNum, matchCol).getValue(), 10) || 0;
        var curUniq = parseInt(sheet.getRange(rowNum, uniqCol).getValue(), 10) || 0;
        var curDups = parseInt(sheet.getRange(rowNum, dupCol).getValue(), 10) || 0;
        var curRej = parseInt(sheet.getRange(rowNum, rejCol).getValue(), 10) || 0;
        var curRev = parseInt(sheet.getRange(rowNum, revCol).getValue(), 10) || 0;

        sheet.getRange(rowNum, matchCol).setValue(curMatches + s.matches);
        sheet.getRange(rowNum, uniqCol).setValue(curUniq + s.unique);
        sheet.getRange(rowNum, dupCol).setValue(curDups + s.duplicates);
        sheet.getRange(rowNum, rejCol).setValue(curRej + s.rejected);
        sheet.getRange(rowNum, revCol).setValue(curRev + s.needsReview);
        sheet.getRange(rowNum, lastSearchCol).setValue(nowIso);
        sheet.getRange(rowNum, statusCol).setValue(s.status || 'Success');
      }
    }
  }

  /**
   * Adds or toggles a keyword.
   */
  function saveKeyword(kwData) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.SEARCH_KEYWORDS);
    if (!sheet) {
      initializeDatabase();
      sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.SEARCH_KEYWORDS);
    }

    if (kwData.keyword_id) {
      var lastRow = sheet.getLastRowNum();
      var idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < idValues.length; i++) {
        if (idValues[i][0] === kwData.keyword_id) {
          var rowNum = i + 2;
          if (kwData.is_enabled !== undefined) {
            sheet.getRange(rowNum, 4).setValue(kwData.is_enabled ? 'TRUE' : 'FALSE');
          }
          if (kwData.category_group) sheet.getRange(rowNum, 3).setValue(kwData.category_group);
          return { success: true };
        }
      }
    } else {
      var newId = 'KW-CUSTOM-' + Utilities.getUuid().substring(0, 6).toUpperCase();
      sheet.appendRow([
        newId,
        kwData.keyword,
        kwData.category_group || 'Custom Keywords',
        'TRUE',
        'TRUE',
        0, 0, 0, 0, 0,
        '',
        'Ready',
        new Date().toISOString()
      ]);
      return { success: true, keyword_id: newId };
    }
  }

  /**
   * Deletes a keyword by ID.
   */
  function deleteKeyword(keywordId) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.SEARCH_KEYWORDS);
    if (!sheet || sheet.getLastRowNum() <= 1) return { success: false };

    var lastRow = sheet.getLastRowNum();
    var idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < idValues.length; i++) {
      if (idValues[i][0] === keywordId) {
        sheet.deleteRow(i + 2);
        return { success: true };
      }
    }
    return { success: false };
  }

  /**
   * Retrieves pending duplicate reviews.
   */
  function getDuplicateReviews() {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.DUPLICATE_REVIEW);
    if (!sheet || sheet.getLastRowNum() <= 1) return [];

    var lastRow = sheet.getLastRowNum();
    var data = sheet.getRange(2, 1, lastRow - 1, DUPLICATE_HEADERS.length).getValues();

    return data.map(function(row) {
      var obj = {};
      DUPLICATE_HEADERS.forEach(function(h, idx) {
        obj[h] = row[idx];
      });
      return obj;
    }).filter(function(r) {
      return r.status === 'Pending';
    });
  }

  /**
   * Resolves a duplicate review item.
   */
  function resolveDuplicateReview(reviewId, action, notes) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(Config.DEFAULTS.SHEETS.DUPLICATE_REVIEW);
    if (!sheet || sheet.getLastRowNum() <= 1) return;

    var lastRow = sheet.getLastRowNum();
    var idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    var userEmail = Session.getActiveUser().getEmail() || 'Manager';
    var nowIso = new Date().toISOString();

    for (var i = 0; i < idValues.length; i++) {
      if (idValues[i][0] === reviewId) {
        var rowNum = i + 2;
        sheet.getRange(rowNum, 14).setValue(action);
        sheet.getRange(rowNum, 16).setValue(nowIso);
        sheet.getRange(rowNum, 17).setValue(userEmail);
        return { success: true };
      }
    }
  }

  return {
    getSpreadsheet: getSpreadsheet,
    initializeDatabase: initializeDatabase,
    getExistingCompaniesLight: getExistingCompaniesLight,
    batchInsertCompanies: batchInsertCompanies,
    appendKeywordToCompany: appendKeywordToCompany,
    batchInsertDuplicateReviews: batchInsertDuplicateReviews,
    saveSearchSession: saveSearchSession,
    getCompanies: getCompanies,
    getCompanyById: getCompanyById,
    updateCompany: updateCompany,
    getDataQualityMetrics: getDataQualityMetrics,
    getSearchSessions: getSearchSessions,
    getKeywords: getKeywords,
    updateKeywordAnalytics: updateKeywordAnalytics,
    saveKeyword: saveKeyword,
    deleteKeyword: deleteKeyword,
    getDuplicateReviews: getDuplicateReviews,
    resolveDuplicateReview: resolveDuplicateReview
  };
})();
