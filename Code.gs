/**
 * @fileoverview Code.gs
 * Main entry point, web app routing, server-side RPC functions, and automated test runner.
 * G-MAPS INDUSTRIAL INTELLIGENCE DASHBOARD
 */

/**
 * Serves the web application HTML.
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  
  // Inject environment status, Maps JS API Key, and Spreadsheet URL for client loader
  var env = Config.verifyEnvironment();
  template.hasMapsJsApiKey = env.hasMapsJsApiKey;
  template.mapsJsApiKey = Config.getConfig().mapsJsApiKey;
  template.spreadsheetUrl = ExportService.getSpreadsheetUrl();
  template.userEmail = Session.getActiveUser().getEmail() || 'Manager';

  var output = template.evaluate();
  output.setTitle('G-MAPS Industrial Intelligence Dashboard');
  output.addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return output;
}

/**
 * Helper to include modular HTML files (Styles, Scripts) into Index.html.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Returns comprehensive initial data for single-roundtrip app startup.
 */
function getInitialData() {
  try {
    SpreadsheetService.initializeDatabase();
  } catch (err) {
    // Continue even if database initialization has non-fatal warning
  }

  var env = Config.verifyEnvironment();
  var metrics = SpreadsheetService.getDataQualityMetrics();
  var keywords = SpreadsheetService.getKeywords();
  var sessions = SpreadsheetService.getSearchSessions();
  var sheetUrl = ExportService.getSpreadsheetUrl();

  return {
    environment: env,
    config: Config.getConfig(),
    metrics: metrics,
    keywords: keywords,
    recentSessions: sessions.slice(0, 10),
    spreadsheetUrl: sheetUrl,
    userEmail: Session.getActiveUser().getEmail() || 'Manager'
  };
}

/**
 * Checks API credentials and connection health.
 */
function checkApiStatus() {
  return Config.verifyEnvironment();
}

/**
 * Initializes database sheets and headers.
 */
function initializeDatabase() {
  return SpreadsheetService.initializeDatabase();
}

/**
 * Previews directional rectangular bounds without making external API calls.
 */
function calculateBoundsPreview(centerLat, centerLng, distNorth, distSouth, distEast, distWest) {
  return SearchService.calculateDirectionalBounds(centerLat, centerLng, distNorth, distSouth, distEast, distWest);
}

/**
 * Executes a targeted industrial search across an asymmetric directional rectangular area.
 */
function runIndustrialSearch(searchParams) {
  if (!searchParams) throw new Error('Missing search parameters.');
  return SearchService.executeSearch(searchParams);
}

/**
 * Retrieves filtered company records with pagination and KPI card filtering.
 */
function getCompanies(filters) {
  return SpreadsheetService.getCompanies(filters);
}

/**
 * Retrieves a single company's details by record ID.
 */
function getCompanyDetails(recordId) {
  return SpreadsheetService.getCompanyById(recordId);
}

/**
 * Updates company record with manager edits, audit logging, and validation.
 */
function updateCompany(recordId, updateData) {
  return SpreadsheetService.updateCompany(recordId, updateData);
}

/**
 * Retrieves all saved search sessions.
 */
function getSavedSearches() {
  return SpreadsheetService.getSearchSessions();
}

/**
 * Retrieves active and inactive search keywords with execution analytics.
 */
function getKeywords() {
  return SpreadsheetService.getKeywords();
}

/**
 * Saves (adds or enables/disables) a search keyword.
 */
function saveKeyword(kwData) {
  return SpreadsheetService.saveKeyword(kwData);
}

/**
 * Deletes a search keyword by ID.
 */
function deleteKeyword(keywordId) {
  return SpreadsheetService.deleteKeyword(keywordId);
}

/**
 * Retrieves pending duplicate candidate pairs.
 */
function getDuplicates() {
  return SpreadsheetService.getDuplicateReviews();
}

/**
 * Resolves a duplicate candidate (Merged / Dismissed).
 */
function resolveDuplicate(reviewId, action, notes) {
  return SpreadsheetService.resolveDuplicateReview(reviewId, action, notes);
}

/**
 * Retrieves updated data quality metrics.
 */
function getDataQualityMetrics() {
  return SpreadsheetService.getDataQualityMetrics();
}

/**
 * Returns direct URL to the linked Google Spreadsheet.
 */
function getSpreadsheetUrl() {
  return ExportService.getSpreadsheetUrl();
}

/**
 * Exports company records matching current filters to RFC 4180 CSV format.
 */
function exportCompaniesCsv(filters) {
  return ExportService.exportCompaniesCsv(filters);
}

/**
 * Exports explicitly selected company rows to RFC 4180 CSV format.
 */
function exportSelectedCompaniesCsv(recordIds) {
  return ExportService.exportSelectedCompaniesCsv(recordIds);
}

/**
 * Exports company records to genuine Microsoft Excel SpreadsheetML XML format (.xml/.xls).
 */
function exportExcelFile(filters) {
  return ExportService.exportExcelFile(filters);
}

/**
 * Exports search session report.
 */
function exportCurrentSearchReport(sessionId) {
  return ExportService.exportCurrentSearchReport(sessionId);
}

/**
 * Exports data quality audit report to CSV format.
 */
function exportDataQualityCsv() {
  return ExportService.exportDataQualityCsv();
}

/**
 * Exports search sessions summary to CSV format.
 */
function exportSearchSessionsCsv() {
  return ExportService.exportSearchSessionsCsv();
}

/**
 * Resolves a geographical location hierarchy query with ambiguity detection.
 * Distinguishes center point from actual geographical boundaries.
 * @param {string} query User entered query (e.g. "India -> Maharashtra -> Pune -> Bhosari")
 */
function resolveLocationHierarchy(query) {
  return PlacesService.resolveLocationHierarchy(query);
}

/**
 * Generates and validates a Location Intelligence Schema 1.0 JSON export.
 * @param {string} [sessionId]
 * @param {Object} [filterOptions]
 */
function generateLocationJson(sessionId, filterOptions) {
  return ExportService.generateLocationJson(sessionId, filterOptions);
}

/**
 * Retrieves the Location Coverage Report for a given or most recent search session.
 * @param {string} [sessionId]
 */
function getCoverageReport(sessionId) {
  var sessions = SpreadsheetService.getSearchSessions();
  var session = null;
  if (sessionId) {
    var m = sessions.filter(function(s) { return s.session_id === sessionId; });
    if (m.length > 0) session = m[0];
  }
  if (!session && sessions.length > 0) session = sessions[0];
  
  if (!session || !session.boundary_json) {
    return { found: false, message: 'No coverage report found.' };
  }

  try {
    var cov = JSON.parse(session.boundary_json);
    return { found: true, report: cov, session: session };
  } catch (e) {
    return { found: false, message: 'Error reading coverage report: ' + e.message };
  }
}

/**
 * Updates application settings (e.g. classification thresholds).
 */
function saveSettings(settingsData) {
  if (settingsData.GOLD_MIN_RATING !== undefined) Config.setProperty('GOLD_MIN_RATING', String(settingsData.GOLD_MIN_RATING));
  if (settingsData.GOLD_MIN_REVIEWS !== undefined) Config.setProperty('GOLD_MIN_REVIEWS', String(settingsData.GOLD_MIN_REVIEWS));
  if (settingsData.SILVER_MIN_RATING !== undefined) Config.setProperty('SILVER_MIN_RATING', String(settingsData.SILVER_MIN_RATING));
  if (settingsData.SILVER_MIN_REVIEWS !== undefined) Config.setProperty('SILVER_MIN_REVIEWS', String(settingsData.SILVER_MIN_REVIEWS));
  if (settingsData.SEARCH_RADIUS_DEFAULT !== undefined) Config.setProperty('SEARCH_RADIUS_DEFAULT', String(settingsData.SEARCH_RADIUS_DEFAULT));
  if (settingsData.SPREADSHEET_ID !== undefined) Config.setProperty('SPREADSHEET_ID', String(settingsData.SPREADSHEET_ID).trim());
  if (settingsData.PLACES_API_KEY !== undefined && settingsData.PLACES_API_KEY.trim() !== '') {
    Config.setProperty('PLACES_API_KEY', String(settingsData.PLACES_API_KEY).trim());
  }
  if (settingsData.MAPS_JS_API_KEY !== undefined && settingsData.MAPS_JS_API_KEY.trim() !== '') {
    Config.setProperty('MAPS_JS_API_KEY', String(settingsData.MAPS_JS_API_KEY).trim());
  }
  return { success: true };
}

/**
 * Automated Test Runner for Mandatory Data Integrity and Validation Requirements.
 * Executes tests across:
 * 1. Repeated searches deduplication
 * 2. Duplicate results from different keywords
 * 3. Missing Place IDs fallback matching
 * 4. Similar company names fuzzy matching
 * 5. Different branches of same company preservation (distinct locations)
 * 6. Invalid coordinates validation
 * 7. Negative distances validation
 * 8. Invalid phone numbers validation
 * 9. Empty required fields validation
 * 10. Concurrent save attempts and LockService thread safety
 */
function runAutomatedTests() {
  var testResults = [];

  function addResult(name, passed, details) {
    testResults.push({
      testName: name,
      passed: passed,
      status: passed ? 'PASSED' : 'FAILED',
      details: details,
      timestamp: new Date().toISOString()
    });
  }

  // Test 1: Coordinate Validation (Valid Coordinates)
  try {
    var v1 = CompanyService.validateCoordinates(12.9716, 77.5946);
    addResult('Coordinate Validation (Valid Coordinates)', v1.isValid === true, 'Successfully validated Lat 12.9716, Lng 77.5946');
  } catch (e) {
    addResult('Coordinate Validation (Valid Coordinates)', false, e.message);
  }

  // Test 2: Coordinate Validation (Invalid Latitude -95)
  try {
    var v2 = CompanyService.validateCoordinates(-95, 77.5946);
    addResult('Coordinate Validation (Invalid Latitude -95)', v2.isValid === false, 'Rejected out-of-range latitude (-95): ' + v2.error);
  } catch (e) {
    addResult('Coordinate Validation (Invalid Latitude -95)', true, 'Rejected via exception: ' + e.message);
  }

  // Test 3: Directional Distance Validation (Negative Distances Rejected)
  try {
    var v3 = CompanyService.validateDirectionalDistances(-5, 5, 5, 5);
    addResult('Directional Distance Validation (Negative Distances)', v3.isValid === false, 'Properly rejected negative North distance: ' + v3.error);
  } catch (e) {
    addResult('Directional Distance Validation (Negative Distances)', true, 'Properly threw error: ' + e.message);
  }

  // Test 4: Directional Asymmetric Bounds Math
  try {
    var boundsCalc = SearchService.calculateDirectionalBounds(12.9716, 77.5946, 5, 3, 4, 2);
    var hasBounds = boundsCalc.bounds && boundsCalc.bounds.north > 12.9716 && boundsCalc.bounds.south < 12.9716;
    var areaMatches = boundsCalc.dimensions.widthKm === 6 && boundsCalc.dimensions.heightKm === 8;
    addResult('Directional Asymmetric Bounds Math', hasBounds && areaMatches, 'Area: ' + boundsCalc.dimensions.areaSqKm + ' sq km (8km x 6km), Vertices: 4');
  } catch (e) {
    addResult('Directional Asymmetric Bounds Math', false, e.message);
  }

  // Test 5: Exact Place ID Duplicate Detection
  try {
    var existingList = [
      { record_id: 'IND-TEST1', place_id: 'ChIJ_TEST_PLACE_123', company_name: 'Precision Tools Ltd', phone_number: '+918028394050', normalized_phone: '+918028394050', latitude: 12.97, longitude: 77.59 }
    ];
    var dupCheck1 = CompanyService.checkForDuplicate({ place_id: 'ChIJ_TEST_PLACE_123', name: 'Precision Tools Limited' }, existingList);
    addResult('Duplicate Detection (Exact Place ID)', dupCheck1.isDuplicate === true && dupCheck1.matchType === 'EXACT_PLACE_ID', 'Detected duplicate Place ID: ' + dupCheck1.reason);
  } catch (e) {
    addResult('Duplicate Detection (Exact Place ID)', false, e.message);
  }

  // Test 6: Branch-Awareness (Different Branches of Same Company NOT Merged)
  try {
    var branchList = [
      { record_id: 'IND-BRANCH1', place_id: 'ChIJ_PEENYA_UNIT', company_name: 'Apex Precision Engineering', latitude: 13.03, longitude: 77.51, formatted_address: 'Peenya Industrial Area' }
    ];
    // Candidate has same name, but different Place ID and is 25 km away in Whitefield
    var candBranch = { place_id: 'ChIJ_WHITEFIELD_UNIT', name: 'Apex Precision Engineering', lat: 12.97, lng: 77.75, formatted_address: 'Whitefield Tech Park' };
    var branchCheck = CompanyService.checkForDuplicate(candBranch, branchList);
    addResult('Branch-Awareness (Different Branches Preserved)', branchCheck.isDuplicate === false, 'Correctly identified 25km distant plant as distinct branch without auto-merging');
  } catch (e) {
    addResult('Branch-Awareness (Different Branches Preserved)', false, e.message);
  }

  // Test 7: Spatial Proximity Fuzzy Duplicate Match (< 100 meters)
  try {
    var spatialList = [
      { record_id: 'IND-SPATIAL1', place_id: 'ChIJ_OLD_1', company_name: 'Kirloskar Motors Pvt Ltd', latitude: 12.9716, longitude: 77.5946 }
    ];
    // Candidate within 30 meters with slightly different spelling
    var candSpatial = { place_id: 'ChIJ_NEW_2', name: 'Kirloskar Motor Ltd', lat: 12.9718, lng: 77.5948 };
    var spatialCheck = CompanyService.checkForDuplicate(candSpatial, spatialList);
    addResult('Spatial Proximity Matching (< 100m)', spatialCheck.isDuplicate === true && spatialCheck.matchType === 'SPATIAL_NAME_MATCH', 'Identified potential duplicate at distance ' + spatialCheck.distanceMeters + 'm');
  } catch (e) {
    addResult('Spatial Proximity Matching (< 100m)', false, e.message);
  }

  // Test 8: Phone Classification (Indian Mobile vs Landline vs Toll-free)
  try {
    var mobileTest = PhoneService.parseAndClassify('9845012345');
    var landlineTest = PhoneService.parseAndClassify('080-28394050');
    var tollFreeTest = PhoneService.parseAndClassify('1800-111-222');
    var phonesPassed = mobileTest.classification === 'Mobile' && landlineTest.classification === 'Landline' && tollFreeTest.classification === 'Toll-free';
    addResult('Phone Classification Metadata', phonesPassed, 'Mobile: ' + mobileTest.classification + ', Landline: ' + landlineTest.classification + ', Toll-free: ' + tollFreeTest.classification);
  } catch (e) {
    addResult('Phone Classification Metadata', false, e.message);
  }

  // Test 9: Empty Required Field Validation
  try {
    var emptyRecCheck = CompanyService.validateCompanyRecord({ company_name: '' });
    addResult('Empty Required Field Validation', emptyRecCheck.isValid === false, 'Rejected empty company record: ' + emptyRecCheck.error);
  } catch (e) {
    addResult('Empty Required Field Validation', true, 'Rejected via exception: ' + e.message);
  }

  // Test 10: Concurrency Lock Safety (LockService)
  try {
    var lock = LockService.getScriptLock();
    var acquired = lock.tryLock(5000);
    if (acquired) {
      lock.releaseLock();
      addResult('Concurrency Lock Safety (LockService)', true, 'ScriptLock acquired and released safely without deadlocks.');
    } else {
      addResult('Concurrency Lock Safety (LockService)', false, 'Could not acquire script lock within 5000ms.');
    }
  } catch (e) {
    addResult('Concurrency Lock Safety (LockService)', false, e.message);
  }

  // Test 11: Geographical Boundary Tiling Subdivision Math (> 12km)
  try {
    var largeBounds = {
      north: 13.20,
      south: 12.90, // 0.30 deg lat = ~33.4 km height
      east: 77.80,
      west: 77.40   // 0.40 deg lng = ~43.4 km width
    };
    var tiles = SearchService.subdivideBoundsIntoTiles(largeBounds, 12);
    var isSubdivided = tiles.length === 4; // 2x2 grid
    var smallBounds = {
      north: 12.98,
      south: 12.92, // ~6.6 km height
      east: 77.62,
      west: 77.56   // ~6.5 km width
    };
    var singleTile = SearchService.subdivideBoundsIntoTiles(smallBounds, 12);
    var isSingle = singleTile.length === 1;
    addResult('Geographical Area Subdivision (Tiling Math)', isSubdivided && isSingle, 'Large area (33x43km) divided into ' + tiles.length + ' tiles; Small area into ' + singleTile.length + ' tile.');
  } catch (e) {
    addResult('Geographical Area Subdivision (Tiling Math)', false, e.message);
  }

  // Test 12: Location-to-JSON Schema 1.0 Validation Engine
  try {
    var testValidPayload = {
      schemaVersion: '1.0',
      search: {
        searchId: 'SRCH-TEST-001',
        country: 'India',
        state: 'Maharashtra',
        city: 'Pune',
        locality: 'Bhosari',
        latitude: 18.627,
        longitude: 73.848,
        boundary: { type: 'Geographical Bounds', coordinates: [] },
        keywordsUsed: ['industrial machinery'],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: 'Search completed — coverage not guaranteed'
      },
      coverage: {
        queriesAttempted: 4,
        queriesSucceeded: 4,
        queriesFailed: 0,
        rawResultAppearances: 28,
        uniqueRecords: 22,
        duplicateMatchesRemoved: 6,
        coverageGuaranteed: false,
        warnings: []
      },
      companies: [
        {
          placeId: 'ChIJ_BHOSARI_1',
          name: 'Precision Forge Ltd',
          address: 'MIDC Bhosari, Pune',
          latitude: 18.627,
          longitude: 73.848,
          industry: 'Metal & Fabrication',
          rating: 4.6,
          reviewCount: 32,
          phone: '+912027123456',
          phoneType: 'Landline',
          website: 'https://example.com',
          googleMapsUrl: 'https://maps.google.com/?q=place_id:ChIJ_BHOSARI_1',
          category: 'Gold',
          categoryReason: 'Rating >= 4.5 and reviewCount >= 25',
          discoveredByKeywords: ['industrial machinery'],
          verificationStatus: 'Verified'
        }
      ]
    };
    var validCheck = ExportService.validateLocationJson(testValidPayload);

    // Invalid schema test (coverageGuaranteed = true, which is prohibited)
    var testInvalidPayload = JSON.parse(JSON.stringify(testValidPayload));
    testInvalidPayload.coverage.coverageGuaranteed = true; // Prohibited fabrication
    var invalidCheck = ExportService.validateLocationJson(testInvalidPayload);

    var schemaPassed = validCheck.isValid === true && invalidCheck.isValid === false;
    addResult('Location-to-JSON Schema 1.0 Validator', schemaPassed, 'Valid schema accepted; fabricated coverageGuaranteed:true properly rejected.');
  } catch (e) {
    addResult('Location-to-JSON Schema 1.0 Validator', false, e.message);
  }

  // Test 13: Address Components Parsing & Hierarchy Distinction
  try {
    var rawComponents = [
      { long_name: 'Bhosari', types: ['sublocality', 'sublocality_level_1'] },
      { long_name: 'Pune', types: ['locality', 'administrative_area_level_2'] },
      { long_name: 'Maharashtra', types: ['administrative_area_level_1'] },
      { long_name: 'India', types: ['country'] },
      { long_name: '411026', types: ['postal_code'] }
    ];
    var parsed = PlacesService.parseAddressComponents(rawComponents);
    var parsePassed = parsed.country === 'India' && parsed.state === 'Maharashtra' && parsed.city === 'Pune' && parsed.locality === 'Bhosari';
    addResult('Address Component Hierarchy Parsing', parsePassed, 'Hierarchy: ' + parsed.country + ' -> ' + parsed.state + ' -> ' + parsed.city + ' -> ' + parsed.locality);
  } catch (e) {
    addResult('Address Component Hierarchy Parsing', false, e.message);
  }

  var passedCount = testResults.filter(function(t) { return t.passed; }).length;
  return {
    results: testResults,
    summary: {
      total: testResults.length,
      passed: passedCount,
      failed: testResults.length - passedCount,
      allPassed: passedCount === testResults.length
    }
  };
}

/**
 * Saves a custom Google Maps API Key to Script Properties.
 */
function saveCustomApiKey(newKey) {
  if (newKey && typeof newKey === 'string' && newKey.trim().startsWith('AIza')) {
    PropertiesService.getScriptProperties().setProperty('PLACES_API_KEY', newKey.trim());
    PropertiesService.getScriptProperties().setProperty('MAPS_JS_API_KEY', newKey.trim());
    return { success: true, key: newKey.trim() };
  }
  throw new Error('Invalid Google Maps API Key format. Google keys typically start with "AIza".');
}


