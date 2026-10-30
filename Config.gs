/**
 * @fileoverview Config.gs
 * Configuration management, Script Properties access, and default application constants.
 * G-MAPS INDUSTRIAL INTELLIGENCE DASHBOARD
 */

var Config = (function() {
  var DEFAULTS = {
    // Scoring thresholds
    GOLD_MIN_RATING: 4.5,
    GOLD_MIN_REVIEWS: 100,
    SILVER_MIN_RATING: 4.0,
    SILVER_MIN_REVIEWS: 25,
    
    // Geographical and Search constraints
    SEARCH_RADIUS_DEFAULT: 5000, // meters
    MAX_RESULTS_PER_KEYWORD: 60, // Google Places API hard ceiling per query (3 pages of 20)
    MAX_SEARCH_RADIUS_METERS: 50000, // 50km max for a single circle
    DUPLICATE_DISTANCE_THRESHOLD: 100, // meters for spatial proximity duplicate detection
    
    // Default country context for phone parsing
    DEFAULT_COUNTRY_CODE: 'IN', // Default context (supports international formatting as well)
    
    // Sheet Names
    SHEETS: {
      COMPANIES: 'Companies',
      SEARCH_SESSIONS: 'SearchSessions',
      SEARCH_KEYWORDS: 'SearchKeywords',
      SEARCH_RESULTS: 'SearchResults',
      AUDIT_LOG: 'AuditLog',
      DUPLICATE_REVIEW: 'DuplicateReview',
      SETTINGS: 'Settings',
      TEAM_ASSIGNMENTS: 'TeamAssignments'
    },
    
    // Place types that indicate non-industrial consumer businesses to exclude or flag
    EXCLUDED_CONSUMER_TYPES: [
      'restaurant', 'cafe', 'bar', 'food', 'bakery', 'meal_takeaway', 'meal_delivery',
      'clothing_store', 'shoe_store', 'hair_care', 'beauty_salon', 'spa',
      'florist', 'jewelry_store', 'supermarket', 'grocery_or_supermarket',
      'convenience_store', 'liquor_store', 'shopping_mall', 'department_store',
      'movie_theater', 'travel_agency', 'pet_store', 'veterinary_care',
      'pharmacy', 'dentist', 'doctor', 'hospital', 'lodging', 'hotel',
      'gym', 'bowling_alley', 'night_club', 'amusement_park', 'real_estate_agency'
    ],
    
    // Industrial seed keywords library categorized by sector (Section 6)
    DEFAULT_KEYWORDS: [
      // Manufacturing and factories
      { keyword: 'Industrial manufacturer', category: 'Manufacturing & Factories', is_enabled: true },
      { keyword: 'Manufacturing company', category: 'Manufacturing & Factories', is_enabled: true },
      { keyword: 'Factory', category: 'Manufacturing & Factories', is_enabled: true },
      { keyword: 'Industrial plant', category: 'Manufacturing & Factories', is_enabled: true },
      { keyword: 'Production facility', category: 'Manufacturing & Factories', is_enabled: true },
      { keyword: 'Engineering manufacturer', category: 'Manufacturing & Factories', is_enabled: true },
      { keyword: 'OEM manufacturer', category: 'Manufacturing & Factories', is_enabled: true },
      { keyword: 'Component manufacturer', category: 'Manufacturing & Factories', is_enabled: true },
      { keyword: 'Assembly plant', category: 'Manufacturing & Factories', is_enabled: true },
      { keyword: 'Industrial production unit', category: 'Manufacturing & Factories', is_enabled: true },
      
      // Engineering and machinery
      { keyword: 'Industrial machinery manufacturer', category: 'Engineering & Machinery', is_enabled: true },
      { keyword: 'Machine tools manufacturer', category: 'Engineering & Machinery', is_enabled: true },
      { keyword: 'CNC machining company', category: 'Engineering & Machinery', is_enabled: true },
      { keyword: 'Heavy engineering company', category: 'Engineering & Machinery', is_enabled: true },
      { keyword: 'Fabrication company', category: 'Engineering & Machinery', is_enabled: true },
      { keyword: 'Metal fabrication', category: 'Engineering & Machinery', is_enabled: true },
      { keyword: 'Industrial equipment manufacturer', category: 'Engineering & Machinery', is_enabled: true },
      { keyword: 'Precision engineering', category: 'Engineering & Machinery', is_enabled: true },
      { keyword: 'Industrial automation company', category: 'Engineering & Machinery', is_enabled: true },
      { keyword: 'Electrical equipment manufacturer', category: 'Engineering & Machinery', is_enabled: true },
      
      // Materials and processing
      { keyword: 'Steel manufacturer', category: 'Materials & Processing', is_enabled: true },
      { keyword: 'Metal processing company', category: 'Materials & Processing', is_enabled: true },
      { keyword: 'Aluminium manufacturer', category: 'Materials & Processing', is_enabled: true },
      { keyword: 'Chemical manufacturer', category: 'Materials & Processing', is_enabled: true },
      { keyword: 'Pharmaceutical manufacturing plant', category: 'Materials & Processing', is_enabled: true },
      { keyword: 'Plastic manufacturing company', category: 'Materials & Processing', is_enabled: true },
      { keyword: 'Polymer manufacturer', category: 'Materials & Processing', is_enabled: true },
      { keyword: 'Textile manufacturing unit', category: 'Materials & Processing', is_enabled: true },
      { keyword: 'Paper manufacturing company', category: 'Materials & Processing', is_enabled: true },
      { keyword: 'Packaging manufacturer', category: 'Materials & Processing', is_enabled: true },
      { keyword: 'Cement manufacturer', category: 'Materials & Processing', is_enabled: true },
      { keyword: 'Glass manufacturer', category: 'Materials & Processing', is_enabled: true },
      
      // Industrial supply chain
      { keyword: 'Industrial raw material supplier', category: 'Supply Chain', is_enabled: true },
      { keyword: 'Industrial components supplier', category: 'Supply Chain', is_enabled: true },
      { keyword: 'Industrial fasteners manufacturer', category: 'Supply Chain', is_enabled: true },
      { keyword: 'Industrial bearings supplier', category: 'Supply Chain', is_enabled: true },
      { keyword: 'Industrial valves manufacturer', category: 'Supply Chain', is_enabled: true },
      { keyword: 'Industrial pumps manufacturer', category: 'Supply Chain', is_enabled: true },
      { keyword: 'Industrial motors manufacturer', category: 'Supply Chain', is_enabled: true },
      { keyword: 'Industrial electrical supplier', category: 'Supply Chain', is_enabled: true },
      { keyword: 'Industrial tools supplier', category: 'Supply Chain', is_enabled: true },
      { keyword: 'Industrial warehouse facility', category: 'Supply Chain', is_enabled: true },
      
      // Other industrial sectors
      { keyword: 'Automotive parts manufacturer', category: 'Sector Specific', is_enabled: true },
      { keyword: 'Electronics manufacturer', category: 'Sector Specific', is_enabled: true },
      { keyword: 'Food processing plant', category: 'Sector Specific', is_enabled: true },
      { keyword: 'Industrial refrigeration manufacturer', category: 'Sector Specific', is_enabled: true },
      { keyword: 'Industrial robotics company', category: 'Sector Specific', is_enabled: true },
      { keyword: 'Renewable energy equipment manufacturer', category: 'Sector Specific', is_enabled: true },
      { keyword: 'Industrial instrumentation manufacturer', category: 'Sector Specific', is_enabled: true },
      { keyword: 'Industrial safety equipment manufacturer', category: 'Sector Specific', is_enabled: true }
    ]
  };

  /**
   * Retrieves a Script Property safely without throwing or exposing secrets.
   */
  function getProperty(key, fallback) {
    try {
      var props = PropertiesService.getScriptProperties();
      var val = props.getProperty(key);
      if (val !== null && val !== undefined && val.trim() !== '') {
        return val.trim();
      }
    } catch (e) {
      // In case PropertiesService is unavailable or uninitialized
    }
    return fallback !== undefined ? fallback : '';
  }

  /**
   * Sets a Script Property.
   */
  function setProperty(key, value) {
    var props = PropertiesService.getScriptProperties();
    props.setProperty(key, value);
  }

  /**
   * Returns current active runtime configuration, reading overrides from the Settings sheet if available.
   */
  function getConfig() {
    var goldRating = parseFloat(getProperty('GOLD_MIN_RATING', DEFAULTS.GOLD_MIN_RATING));
    var goldReviews = parseInt(getProperty('GOLD_MIN_REVIEWS', DEFAULTS.GOLD_MIN_REVIEWS), 10);
    var silverRating = parseFloat(getProperty('SILVER_MIN_RATING', DEFAULTS.SILVER_MIN_RATING));
    var silverReviews = parseInt(getProperty('SILVER_MIN_REVIEWS', DEFAULTS.SILVER_MIN_REVIEWS), 10);
    var searchRadius = parseInt(getProperty('SEARCH_RADIUS_DEFAULT', DEFAULTS.SEARCH_RADIUS_DEFAULT), 10);
    var spreadsheetId = getProperty('SPREADSHEET_ID', '');
    var placesApiKey = getProperty('PLACES_API_KEY', '');
    var mapsJsApiKey = getProperty('MAPS_JS_API_KEY', '');
    var geoapifyApiKey = getProperty('GEOAPIFY_API_KEY', '');

    return {
      spreadsheetId: spreadsheetId,
      hasSpreadsheetId: !!spreadsheetId,
      hasPlacesApiKey: !!placesApiKey,
      hasMapsJsApiKey: !!mapsJsApiKey,
      hasGeoapifyApiKey: !!geoapifyApiKey,
      geoapifyApiKey: geoapifyApiKey,
      mapsJsApiKey: mapsJsApiKey, // Sent to frontend for Maps JS API initialization
      goldMinRating: isNaN(goldRating) ? DEFAULTS.GOLD_MIN_RATING : goldRating,
      goldMinReviews: isNaN(goldReviews) ? DEFAULTS.GOLD_MIN_REVIEWS : goldReviews,
      silverMinRating: isNaN(silverRating) ? DEFAULTS.SILVER_MIN_RATING : silverRating,
      silverMinReviews: isNaN(silverReviews) ? DEFAULTS.SILVER_MIN_REVIEWS : silverReviews,
      searchRadiusDefault: isNaN(searchRadius) ? DEFAULTS.SEARCH_RADIUS_DEFAULT : searchRadius,
      duplicateDistanceThreshold: DEFAULTS.DUPLICATE_DISTANCE_THRESHOLD,
      defaultCountryCode: DEFAULTS.DEFAULT_COUNTRY_CODE,
      sheets: DEFAULTS.SHEETS,
      excludedConsumerTypes: DEFAULTS.EXCLUDED_CONSUMER_TYPES,
      defaultKeywords: DEFAULTS.DEFAULT_KEYWORDS
    };
  }

  /**
   * Verifies environment setup and returns diagnostic status for the manager UI.
   * Does NOT reveal the raw secret keys.
   */
  function verifyEnvironment() {
    var conf = getConfig();
    var issues = [];
    
    if (!conf.hasPlacesApiKey) {
      issues.push('Missing Google Places API Key in Script Properties (Key: PLACES_API_KEY). Server searches will not function.');
    }
    if (!conf.hasMapsJsApiKey) {
      issues.push('Missing Google Maps JavaScript API Key (Key: MAPS_JS_API_KEY). Interactive map cannot load.');
    }
    if (!conf.hasSpreadsheetId) {
      // Check if current script is bound to a container spreadsheet
      try {
        var activeSheet = SpreadsheetApp.getActiveSpreadsheet();
        if (activeSheet) {
          conf.spreadsheetId = activeSheet.getId();
          conf.hasSpreadsheetId = true;
        } else {
          issues.push('Missing Spreadsheet ID in Script Properties (Key: SPREADSHEET_ID) and script is not container-bound.');
        }
      } catch (e) {
        issues.push('Unable to detect active spreadsheet. Please set SPREADSHEET_ID in Script Properties.');
      }
    }

    return {
      isReady: issues.length === 0,
      hasPlacesApiKey: conf.hasPlacesApiKey,
      hasMapsJsApiKey: conf.hasMapsJsApiKey,
      hasSpreadsheetId: conf.hasSpreadsheetId,
      spreadsheetId: conf.spreadsheetId,
      issues: issues
    };
  }

  return {
    DEFAULTS: DEFAULTS,
    getProperty: getProperty,
    setProperty: setProperty,
    getConfig: getConfig,
    verifyEnvironment: verifyEnvironment
})();

var CONFIG = Config;
