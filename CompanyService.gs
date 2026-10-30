/**
 * @fileoverview CompanyService.gs
 * Industrial relevance evaluation, scoring & classification (Gold/Silver/Bronze),
 * duplicate prevention with branch-awareness, record normalization, and validation.
 */

var CompanyService = (function() {

  /**
   * Generates a collision-resistant internal record identifier.
   */
  function generateRecordId() {
    return 'IND-' + Utilities.getUuid().substring(0, 8).toUpperCase();
  }

  /**
   * Validates geographical coordinates.
   */
  function validateCoordinates(lat, lng) {
    if (lat === undefined || lat === null || lat === '' || isNaN(lat)) {
      return { isValid: false, error: 'Latitude must be a valid number.' };
    }
    if (lng === undefined || lng === null || lng === '' || isNaN(lng)) {
      return { isValid: false, error: 'Longitude must be a valid number.' };
    }
    var numLat = Number(lat);
    var numLng = Number(lng);
    if (numLat < -90 || numLat > 90) {
      return { isValid: false, error: 'Latitude must be between -90 and 90 degrees. Received: ' + lat };
    }
    if (numLng < -180 || numLng > 180) {
      return { isValid: false, error: 'Longitude must be between -180 and 180 degrees. Received: ' + lng };
    }
    return { isValid: true, lat: numLat, lng: numLng };
  }

  /**
   * Validates directional distances (North, South, East, West in km).
   */
  function validateDirectionalDistances(distNorth, distSouth, distEast, distWest, maxExtentKm) {
    maxExtentKm = maxExtentKm || 200; // 200km maximum single search extent
    var distances = [
      { name: 'North', val: distNorth },
      { name: 'South', val: distSouth },
      { name: 'East', val: distEast },
      { name: 'West', val: distWest }
    ];

    for (var i = 0; i < distances.length; i++) {
      var d = distances[i];
      if (d.val === undefined || d.val === null || d.val === '' || isNaN(d.val)) {
        return { isValid: false, error: d.name + ' distance must be a valid number.' };
      }
      var numVal = Number(d.val);
      if (numVal < 0) {
        return { isValid: false, error: d.name + ' distance cannot be negative. Received: ' + d.val + ' km' };
      }
      if (numVal > maxExtentKm) {
        return { isValid: false, error: d.name + ' distance exceeds maximum permitted extent of ' + maxExtentKm + ' km. Received: ' + d.val + ' km' };
      }
    }

    return {
      isValid: true,
      distNorth: Number(distNorth),
      distSouth: Number(distSouth),
      distEast: Number(distEast),
      distWest: Number(distWest)
    };
  }

  /**
   * Validates required company fields before saving.
   */
  function validateCompanyRecord(record) {
    if (!record) {
      return { isValid: false, error: 'Company record cannot be null or empty.' };
    }
    if (!record.company_name || String(record.company_name).trim() === '') {
      return { isValid: false, error: 'Company name is required.' };
    }
    if (record.latitude !== undefined && record.longitude !== undefined && record.latitude !== '' && record.longitude !== '') {
      var coordCheck = validateCoordinates(record.latitude, record.longitude);
      if (!coordCheck.isValid) {
        return { isValid: false, error: 'Invalid company coordinates: ' + coordCheck.error };
      }
    }
    return { isValid: true };
  }

  /**
   * Calculates Haversine distance in meters between two geographical points.
   */
  function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    var R = 6371000; // Earth radius in meters
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Normalizes company names for fuzzy duplicate detection.
   * Strips corporate legal entity suffixes and special characters.
   */
  function normalizeCompanyName(name) {
    if (!name || typeof name !== 'string') return '';
    return name
      .toLowerCase()
      .replace(/\b(private|pvt|limited|ltd|llp|inc|incorporated|corp|corporation|co|enterprises|industries|works|unit|division|branch)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Evaluates company relevance against industrial criteria and consumer exclusions.
   * @param {Object} place Normalized place object
   * @returns {Object} { isIndustrial: boolean, relevanceScore: string, reason: string }
   */
  function evaluateRelevance(place) {
    var config = Config.getConfig();
    var excludedTypes = config.excludedConsumerTypes;
    var types = place.types || [];
    var nameLower = (place.name || '').toLowerCase();

    // Check for explicit consumer place types
    var matchedConsumerTypes = [];
    types.forEach(function(t) {
      if (excludedTypes.indexOf(t) !== -1) {
        matchedConsumerTypes.push(t);
      }
    });

    if (matchedConsumerTypes.length > 0) {
      return {
        isIndustrial: false,
        relevanceScore: 'Excluded (Consumer Business)',
        reason: 'Matches non-industrial consumer types: ' + matchedConsumerTypes.join(', ')
      };
    }

    // Explicitly reject entire industrial estates, parks, roads, and geographic localities
    var estatePatterns = [
      /\bindustrial\s+estate\b/i,
      /\bindustrial\s+area\b/i,
      /\bindustrial\s+park\b/i,
      /\bindustrial\s+corridor\b/i,
      /\bindustrial\s+zone\b/i,
      /\bmidc\s+area\b/i,
      /\bgidc\s+estate\b/i,
      /\bsipcot\s+park\b/i
    ];
    for (var ep = 0; ep < estatePatterns.length; ep++) {
      if (estatePatterns[ep].test(place.name || '')) {
        return {
          isIndustrial: false,
          relevanceScore: 'Excluded (Industrial Estate / Area Landmark)',
          reason: 'Represents a geographic industrial estate or area, not an individual manufacturing company.'
        };
      }
    }

    // Exclude geographic locality place types unless explicitly a manufacturer
    var excludedAreaTypes = ['industrial_park', 'sublocality', 'neighborhood', 'administrative_area_level_1', 'administrative_area_level_2', 'route', 'intersection', 'locality', 'political'];
    for (var eat = 0; eat < excludedAreaTypes.length; eat++) {
      if (types.indexOf(excludedAreaTypes[eat]) !== -1 && types.indexOf('manufacturer') === -1 && types.indexOf('factory') === -1) {
        return {
          isIndustrial: false,
          relevanceScore: 'Excluded (Geographic Landmark / Area)',
          reason: 'Categorized as a geographic landmark or area (' + excludedAreaTypes[eat] + '), not an individual company.'
        };
      }
    }

    // Industrial positive markers in name or place types
    var industrialTerms = [
      'industry', 'industrial', 'manufacturing', 'manufacture', 'factory', 'plant',
      'engineering', 'fabrication', 'machinery', 'automation', 'precision',
      'steel', 'metal', 'chemical', 'polymer', 'plastic', 'textile', 'foundry',
      'casting', 'dies', 'moulds', 'valves', 'pumps', 'motors', 'cables', 'electrical',
      'earthing', 'grounding', 'lightning', 'solutions', 'msme', 'laser', 'welding',
      'panels', 'transformers', 'switchgear', 'pipes', 'fasteners', 'hardware'
    ];

    var hasIndustrialTermInName = industrialTerms.some(function(term) {
      return nameLower.indexOf(term) !== -1;
    });

    if (hasIndustrialTermInName) {
      return {
        isIndustrial: true,
        relevanceScore: 'High Industrial Relevance',
        reason: 'Identified strong industrial keyword in company name and place category.'
      };
    }

    // If discovered by explicit industrial search keyword, mark as Medium or Needs Review
    if (place.discovery_keyword) {
      return {
        isIndustrial: true,
        relevanceScore: 'Medium Industrial Relevance',
        reason: 'Discovered via targeted industrial query: "' + place.discovery_keyword + '". Category requires manager verification.'
      };
    }

    return {
      isIndustrial: true,
      relevanceScore: 'Needs Review',
      reason: 'Standard business profile without explicit industrial keywords. Review required.'
    };
  }

  /**
   * Computes Gold, Silver, or Bronze tier according to transparent algorithmic rules.
   * @param {Object} place
   * @param {Object} relevance
   * @returns {Object} { category: string, reason: string }
   */
  function classifyCategory(place, relevance) {
    var config = Config.getConfig();
    var rating = place.rating;
    var reviews = place.user_ratings_total || 0;

    // Incomplete or unrated record
    if (rating === null || rating === undefined || reviews === 0) {
      return {
        category: 'Bronze',
        reason: 'Bronze: Unrated or emerging industrial facility (0 Google reviews). Requires team verification.'
      };
    }

    // Gold Threshold: Rating >= 4.5 and Reviews >= 100
    if (rating >= config.goldMinRating && reviews >= config.goldMinReviews) {
      return {
        category: 'Gold',
        reason: 'Gold: Verified rating of ' + rating + ' with ' + reviews + ' reviews (meets Gold threshold: >=' + config.goldMinRating + ' rating, >=' + config.goldMinReviews + ' reviews).'
      };
    }

    // Silver Threshold: Rating >= 4.0 and Reviews >= 25 (or high rating with moderate reviews)
    if (rating >= config.silverMinRating && reviews >= config.silverMinReviews) {
      return {
        category: 'Silver',
        reason: 'Silver: Rating of ' + rating + ' with ' + reviews + ' reviews (meets Silver threshold: >=' + config.silverMinRating + ' rating, >=' + config.silverMinReviews + ' reviews).'
      };
    }

    // Emerging / Moderate review profiles
    if (rating >= 4.0 && reviews < config.silverMinReviews) {
      return {
        category: 'Silver',
        reason: 'Silver: High rating of ' + rating + ' with developing review volume (' + reviews + ' reviews).'
      };
    }

    // Bronze: Lower rating or lower review count
    return {
      category: 'Bronze',
      reason: 'Bronze: Active industrial listing with ' + rating + ' rating and ' + reviews + ' reviews.'
    };
  }

  /**
   * Infers industrial sector from name, types, and discovery keyword.
   */
  function inferSector(name, keyword) {
    var combined = ((name || '') + ' ' + (keyword || '')).toLowerCase();

    if (combined.indexOf('metal') !== -1 || combined.indexOf('steel') !== -1 || combined.indexOf('fabricat') !== -1 || combined.indexOf('foundry') !== -1) {
      return 'Metal & Fabrication';
    }
    if (combined.indexOf('machine') !== -1 || combined.indexOf('machinery') !== -1 || combined.indexOf('cnc') !== -1 || combined.indexOf('tool') !== -1) {
      return 'Machinery & Tools';
    }
    if (combined.indexOf('chemical') !== -1 || combined.indexOf('polymer') !== -1 || combined.indexOf('plastic') !== -1 || combined.indexOf('resin') !== -1) {
      return 'Chemicals & Polymers';
    }
    if (combined.indexOf('electric') !== -1 || combined.indexOf('electronic') !== -1 || combined.indexOf('cable') !== -1 || combined.indexOf('motor') !== -1) {
      return 'Electrical & Electronics';
    }
    if (combined.indexOf('auto') !== -1 || combined.indexOf('oem') !== -1 || combined.indexOf('component') !== -1) {
      return 'Automotive & Components';
    }
    if (combined.indexOf('pharma') !== -1 || combined.indexOf('health') !== -1) {
      return 'Pharmaceuticals';
    }
    if (combined.indexOf('textile') !== -1 || combined.indexOf('garment') !== -1) {
      return 'Textiles';
    }
    if (combined.indexOf('packag') !== -1 || combined.indexOf('paper') !== -1 || combined.indexOf('box') !== -1) {
      return 'Packaging & Paper';
    }
    if (combined.indexOf('automation') !== -1 || combined.indexOf('robot') !== -1) {
      return 'Automation & Robotics';
    }
    return 'General Manufacturing';
  }

  /**
   * Tests whether an incoming place candidate matches any existing company record.
   * Multi-level duplicate prevention strategy with branch-awareness.
   * CRITICAL REQUIREMENT: Never merge distinct branches of the same company solely based on name.
   * @param {Object} candidate Normalized place candidate
   * @param {Array<Object>} existingCompanies List of active company records
   * @returns {Object} Match diagnosis
   */
  function checkForDuplicate(candidate, existingCompanies) {
    if (!existingCompanies || existingCompanies.length === 0) {
      return { isDuplicate: false };
    }

    var candPlaceId = candidate.place_id;
    var candNormPhone = candidate.normalized_phone ? PhoneService.clean(candidate.normalized_phone) : '';
    var candNormName = normalizeCompanyName(candidate.name);
    var candLat = Number(candidate.lat || candidate.latitude || 0);
    var candLng = Number(candidate.lng || candidate.longitude || 0);
    var distThreshold = Config.getConfig().duplicateDistanceThreshold || 100;

    for (var i = 0; i < existingCompanies.length; i++) {
      var existing = existingCompanies[i];
      var existLat = Number(existing.latitude || 0);
      var existLng = Number(existing.longitude || 0);

      // Level 1: Primary Key Match (Google Place ID)
      if (candPlaceId && existing.place_id && candPlaceId === existing.place_id) {
        return {
          isDuplicate: true,
          matchType: 'EXACT_PLACE_ID',
          existingRecord: existing,
          reason: 'Identical Google Place ID: ' + candPlaceId
        };
      }

      // Level 2: Phone Number Match (non-empty, non-tollfree national phone)
      if (candNormPhone && existing.normalized_phone) {
        var existNormPhone = PhoneService.clean(existing.normalized_phone);
        if (candNormPhone.length >= 8 && candNormPhone === existNormPhone && !candNormPhone.includes('1800') && !candNormPhone.includes('1860')) {
          return {
            isDuplicate: true,
            matchType: 'PHONE_MATCH',
            existingRecord: existing,
            reason: 'Identical telephone number (' + (candidate.phone_number || candidate.source_phone) + ') with existing record ID ' + existing.record_id
          };
        }
      }

      // Level 3: Name & Spatial Evaluation with Branch Awareness
      if (candLat && candLng && existLat && existLng) {
        var distance = calculateDistanceMeters(candLat, candLng, existLat, existLng);
        var existNormName = normalizeCompanyName(existing.company_name);

        if (candNormName && existNormName && (candNormName === existNormName || candNormName.indexOf(existNormName) !== -1 || existNormName.indexOf(candNormName) !== -1)) {
          // If distance is large (> 500 meters) and place IDs are different, treat as a DISTINCT BRANCH!
          if (distance > 500 && candPlaceId !== existing.place_id) {
            // Do NOT merge! This is a different factory / branch / plant location.
            continue;
          }

          // If within the duplicate proximity threshold (<= 100 meters), mark as suspected duplicate
          if (distance <= distThreshold) {
            return {
              isDuplicate: true,
              matchType: 'SPATIAL_NAME_MATCH',
              existingRecord: existing,
              distanceMeters: Math.round(distance),
              reason: 'Similar company name within ' + Math.round(distance) + ' meters proximity.'
            };
          }
        }
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Constructs a complete, production-ready Company record adhering to the database schema.
   */
  function buildCompanyRecord(place, sessionId, searchAreaName) {
    var relevance = evaluateRelevance(place);
    var classification = classifyCategory(place, relevance);
    var phoneAnalysis = PhoneService.parseAndClassify(place.phone_number || place.international_phone_number);
    var nowIso = new Date().toISOString();

    return {
      record_id: generateRecordId(),
      place_id: place.place_id || '',
      company_name: place.name || 'Unknown Company',
      source_name: place.name || 'Unknown Company',
      manager_corrected_name: '',
      
      category: classification.category,
      auto_category: classification.category,
      category_reason: classification.reason,
      manager_category_override: '',
      override_reason: '',
      
      industrial_sector: inferSector(place.name, place.discovery_keyword),
      primary_type: place.primary_type || '',
      all_types: (place.types || []).join(', '),
      
      formatted_address: place.formatted_address || '',
      source_address: place.formatted_address || '',
      manager_corrected_address: '',
      city: place.city || '',
      state: place.state || '',
      country: place.country || '',
      postal_code: place.postal_code || '',
      area_locality: place.area_locality || place.city || '',
      latitude: place.lat !== undefined ? place.lat : (place.latitude || 0),
      longitude: place.lng !== undefined ? place.lng : (place.longitude || 0),
      distance_meters: place.distance_meters !== undefined ? place.distance_meters : null,
      distance_km: place.distance_km !== undefined ? place.distance_km : null,
      distance_text: place.distance_text || (place.distance_meters !== undefined ? (place.distance_meters + ' m') : 'N/A'),
      
      phone_number: place.phone_number || place.international_phone_number || '',
      source_phone: place.phone_number || place.international_phone_number || '',
      manager_corrected_phone: '',
      normalized_phone: phoneAnalysis.normalized,
      phone_classification: phoneAnalysis.classification,
      phone_country_code: phoneAnalysis.countryCode,
      
      website: place.website || '',
      manager_corrected_website: '',
      rating: place.rating !== null && place.rating !== undefined ? place.rating : null,
      review_count: place.user_ratings_total || place.review_count || 0,
      business_status: place.business_status || 'OPERATIONAL',
      google_maps_url: place.google_maps_url || ('https://www.google.com/maps/place/?q=place_id:' + (place.place_id || '')),
      
      discovery_keywords: place.discovery_keyword || place.discovery_keywords || '',
      primary_keyword: place.discovery_keyword || '',
      search_session_id: sessionId || '',
      search_area_name: searchAreaName || '',
      relevance_score: relevance.relevanceScore,
      relevance_reason: relevance.reason,
      
      verification_status: 'Unverified',
      verified_by: '',
      verified_at: '',
      lead_priority: 'Medium',
      follow_up_status: 'New',
      next_follow_up_date: '',
      last_contacted_date: '',
      assigned_to: '',
      manager_notes: '',
      contact_person: '',
      
      first_discovered_at: nowIso,
      last_checked_at: nowIso,
      updated_at: nowIso
    };
  }

  return {
    generateRecordId: generateRecordId,
    validateCoordinates: validateCoordinates,
    validateDirectionalDistances: validateDirectionalDistances,
    validateCompanyRecord: validateCompanyRecord,
    calculateDistanceMeters: calculateDistanceMeters,
    normalizeCompanyName: normalizeCompanyName,
    evaluateRelevance: evaluateRelevance,
    classifyCategory: classifyCategory,
    inferSector: inferSector,
    checkForDuplicate: checkForDuplicate,
    buildCompanyRecord: buildCompanyRecord
  };
})();
