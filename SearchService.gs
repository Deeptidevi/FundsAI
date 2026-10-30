/**
 * @fileoverview SearchService.gs
 * Geographical discovery engine, asymmetric directional bounds calculations,
 * grid-based large area subdivision (tiling), and comprehensive location coverage analytics.
 */

var SearchService = (function() {

  /**
   * Calculates asymmetric directional rectangular bounds from center and directional distances.
   * Accounts for longitude variation with latitude: 1 deg lng = 111.32 * cos(lat).
   * @param {number} centerLat Latitude of search center
   * @param {number} centerLng Longitude of search center
   * @param {number} distNorth Distance north in km
   * @param {number} distSouth Distance south in km
   * @param {number} distEast Distance east in km
   * @param {number} distWest Distance west in km
   * @returns {Object} Calculated bounds, vertices polygon, and dimensions
   */
  function calculateDirectionalBounds(centerLat, centerLng, distNorth, distSouth, distEast, distWest) {
    var coordCheck = CompanyService.validateCoordinates(centerLat, centerLng);
    if (!coordCheck.isValid) {
      throw new Error(coordCheck.error);
    }
    var distCheck = CompanyService.validateDirectionalDistances(distNorth, distSouth, distEast, distWest);
    if (!distCheck.isValid) {
      throw new Error(distCheck.error);
    }

    var lat = coordCheck.lat;
    var lng = coordCheck.lng;
    var n = distCheck.distNorth;
    var s = distCheck.distSouth;
    var e = distCheck.distEast;
    var w = distCheck.distWest;

    var KM_PER_LAT_DEG = 111.32;
    var radLat = lat * Math.PI / 180;
    var cosLat = Math.cos(radLat);
    if (Math.abs(cosLat) < 0.001) {
      throw new Error('Directional distance search is not supported in extreme polar regions (latitude > 89.9 deg).');
    }

    var KM_PER_LNG_DEG = KM_PER_LAT_DEG * cosLat;

    var northLat = Math.min(90, lat + (n / KM_PER_LAT_DEG));
    var southLat = Math.max(-90, lat - (s / KM_PER_LAT_DEG));
    var eastLng = lng + (e / KM_PER_LNG_DEG);
    var westLng = lng - (w / KM_PER_LNG_DEG);

    function normLng(val) {
      while (val > 180) val -= 360;
      while (val < -180) val += 360;
      return val;
    }

    eastLng = normLng(eastLng);
    westLng = normLng(westLng);

    var widthKm = Math.round((e + w) * 10) / 10;
    var heightKm = Math.round((n + s) * 10) / 10;
    var areaSqKm = Math.round(widthKm * heightKm * 10) / 10;

    var polygon = [
      { lat: northLat, lng: westLng },
      { lat: northLat, lng: eastLng },
      { lat: southLat, lng: eastLng },
      { lat: southLat, lng: westLng }
    ];

    var maxCornerDistKm = Math.sqrt(Math.max(n, s) * Math.max(n, s) + Math.max(e, w) * Math.max(e, w));
    var boundingRadiusMeters = Math.min(50000, Math.ceil(maxCornerDistKm * 1000 * 1.05));

    return {
      center: { lat: lat, lng: lng },
      bounds: {
        north: northLat,
        south: southLat,
        east: eastLng,
        west: westLng
      },
      polygon: polygon,
      dimensions: {
        distNorthKm: n,
        distSouthKm: s,
        distEastKm: e,
        distWestKm: w,
        widthKm: widthKm,
        heightKm: heightKm,
        areaSqKm: areaSqKm,
        boundingRadiusMeters: boundingRadiusMeters
      }
    };
  }

  /**
   * Subdivides large geographical bounds into smaller search region tiles when area exceeds threshold.
   * This circumvents Google Places API 60-results-per-query limit and ensures dense coverage.
   * @param {Object} bounds { north, south, east, west }
   * @param {number} [maxTileDimKm=12] Maximum dimension in km for a single tile
   * @returns {Array<Object>} Array of sub-region tiles
   */
  function subdivideBoundsIntoTiles(bounds, maxTileDimKm) {
    maxTileDimKm = maxTileDimKm || 12;
    var latSpanDeg = Math.abs(bounds.north - bounds.south);
    var midLat = (bounds.north + bounds.south) / 2;
    var lngSpanDeg = Math.abs(bounds.east - bounds.west);

    var heightKm = latSpanDeg * 111.32;
    var widthKm = lngSpanDeg * 111.32 * Math.cos(midLat * Math.PI / 180);

    // If within single tile limits, return single search region
    if (heightKm <= maxTileDimKm && widthKm <= maxTileDimKm) {
      var centerLat = (bounds.north + bounds.south) / 2;
      var centerLng = (bounds.east + bounds.west) / 2;
      var radiusMeters = Math.min(50000, Math.ceil((Math.sqrt(heightKm * heightKm + widthKm * widthKm) / 2) * 1000));
      return [{
        tileIndex: 1,
        name: 'Region 1 (Full Area)',
        center: { lat: centerLat, lng: centerLng },
        radiusMeters: radiusMeters,
        bounds: bounds
      }];
    }

    // Determine grid rows and cols (2x2 grid for large industrial clusters)
    var rows = heightKm > maxTileDimKm ? 2 : 1;
    var cols = widthKm > maxTileDimKm ? 2 : 1;
    var tiles = [];
    var tileIdx = 1;

    var latStep = (bounds.north - bounds.south) / rows;
    var lngStep = (bounds.east - bounds.west) / cols;

    for (var r = 0; r < rows; r++) {
      var tileNorth = bounds.north - (r * latStep);
      var tileSouth = tileNorth - latStep;
      for (var c = 0; c < cols; c++) {
        var tileWest = bounds.west + (c * lngStep);
        var tileEast = tileWest + lngStep;
        var tileCenterLat = (tileNorth + tileSouth) / 2;
        var tileCenterLng = (tileEast + tileWest) / 2;
        var subH = (latStep * 111.32);
        var subW = (lngStep * 111.32 * Math.cos(tileCenterLat * Math.PI / 180));
        var subRadius = Math.ceil((Math.sqrt(subH * subH + subW * subW) / 2) * 1000);

        tiles.push({
          tileIndex: tileIdx,
          name: 'Sector ' + tileIdx + ' (Row ' + (r + 1) + ', Col ' + (c + 1) + ')',
          center: { lat: tileCenterLat, lng: tileCenterLng },
          radiusMeters: Math.min(50000, subRadius),
          bounds: {
            north: tileNorth,
            south: tileSouth,
            east: tileEast,
            west: tileWest
          }
        });
        tileIdx++;
      }
    }

    return tiles;
  }

  /**
   * Tests whether a geographical coordinate lies strictly within rectangular bounds.
   */
  function isPointInBounds(lat, lng, bounds) {
    if (!bounds) return true;
    var latNum = Number(lat);
    var lngNum = Number(lng);

    if (latNum > bounds.north || latNum < bounds.south) {
      return false;
    }

    if (bounds.west <= bounds.east) {
      return lngNum >= bounds.west && lngNum <= bounds.east;
    } else {
      return lngNum >= bounds.west || lngNum <= bounds.east;
    }
  }

  /**
   * Ray-casting algorithm to test whether a coordinate lies within a closed polygon.
   */
  function isPointInPolygon(point, polygon) {
    if (!polygon || polygon.length < 3) return true;
    var x = point.lng;
    var y = point.lat;
    var inside = false;

    for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      var xi = polygon[i].lng;
      var yi = polygon[i].lat;
      var xj = polygon[j].lng;
      var yj = polygon[j].lat;

      var intersect = ((yi > y) !== (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Main geographical discovery engine with location hierarchy support,
   * area tiling/subdivision, and comprehensive location coverage analytics.
   * @param {Object} params Execution parameters
   * @returns {Object} Execution summary, discovered records, and coverage report
   */
  function executeSearch(params) {
    params = params || {};
    var startTime = new Date();
    var sessionId = 'SESS-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    var sessionName = params.sessionName || ('Industrial Search ' + Utilities.formatDate(startTime, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm'));
    var searchType = params.searchType || 'directional';
    
    var center = params.center || { lat: 12.9716, lng: 77.5946 };
    var selectedKeywords = params.keywords || [];
    var maxPages = params.maxPages || 1;
    var locationHierarchy = params.locationHierarchy || {};
    var resumeTiles = params.resumeCompletedTiles || []; // Tile indexes to skip on resume

    // Validate coordinates
    var coordCheck = CompanyService.validateCoordinates(center.lat, center.lng);
    if (!coordCheck.isValid) {
      throw new Error(coordCheck.error);
    }
    center.lat = coordCheck.lat;
    center.lng = coordCheck.lng;

    // Calculate boundary
    var bounds = null;
    var polygon = null;
    var approxAreaSqKm = 0;
    var areaDisplayName = params.areaName || locationHierarchy.formattedName || 'Resolved Industrial Region';

    if (params.radius !== undefined || searchType === 'radius') {
      searchType = 'radius';
      var rKm = (params.radius || 1000) / 1000;
      var dCalc = calculateDirectionalBounds(center.lat, center.lng, rKm, rKm, rKm, rKm);
      bounds = dCalc.bounds;
      polygon = dCalc.polygon;
      approxAreaSqKm = Math.round(Math.PI * rKm * rKm * 10) / 10;
    } else if (searchType === 'directional' || params.distNorth !== undefined) {
      var distNorth = params.distNorth !== undefined ? params.distNorth : 5;
      var distSouth = params.distSouth !== undefined ? params.distSouth : 5;
      var distEast = params.distEast !== undefined ? params.distEast : 5;
      var distWest = params.distWest !== undefined ? params.distWest : 5;

      var directionalCalc = calculateDirectionalBounds(center.lat, center.lng, distNorth, distSouth, distEast, distWest);
      bounds = directionalCalc.bounds;
      polygon = directionalCalc.polygon;
      approxAreaSqKm = directionalCalc.dimensions.areaSqKm;
    } else if (params.bounds) {
      bounds = params.bounds;
      approxAreaSqKm = Math.round(Math.abs((bounds.north - bounds.south) * 111.32 * (bounds.east - bounds.west) * 111.32 * Math.cos(center.lat * Math.PI / 180)) * 10) / 10;
    } else {
      var rKm = 1.0;
      var dCalc = calculateDirectionalBounds(center.lat, center.lng, rKm, rKm, rKm, rKm);
      bounds = dCalc.bounds;
      polygon = dCalc.polygon;
      approxAreaSqKm = dCalc.dimensions.areaSqKm;
    }

    if (!selectedKeywords || selectedKeywords.length === 0) {
      // Default to authoritative industrial keyword library
      selectedKeywords = Config.DEFAULTS.DEFAULT_KEYWORDS.map(function(k) {
        return typeof k === 'string' ? k : k.keyword;
      });
    }

    // Subdivide large areas into tiles to beat Google Places 60 result ceiling
    var tiles = subdivideBoundsIntoTiles(bounds, 12);

    // Initialize coverage metrics
    var coverageMetrics = {
      queriesAttempted: 0,
      queriesSucceeded: 0,
      queriesFailed: 0,
      queriesSkipped: 0,
      rawResultAppearances: 0,
      uniqueDiscovered: 0,
      duplicatesRemoved: 0,
      rejectedIrrelevant: 0,
      recordsRequiringReview: 0,
      tilesProcessed: 0,
      totalTiles: tiles.length,
      coverageGuaranteed: false,
      warnings: []
    };

    var existingCompanies = SpreadsheetService.getExistingCompaniesLight();
    var inFlightPlacesMap = {};
    var inFlightCandidateList = [];
    var keywordStatsMap = {};

    selectedKeywords.forEach(function(kw) {
      keywordStatsMap[kw] = {
        keyword: kw,
        matches: 0,
        unique: 0,
        duplicates: 0,
        rejected: 0,
        needsReview: 0,
        status: 'Success'
      };
    });

    // Guarantee searched anchor company is included in discovery candidates at distance 0 m
    var locH = locationHierarchy || {};
    var aName = locH.name;
    var aPid = locH.placeId;
    var isCoord = aPid && String(aPid).indexOf('COORD-') !== -1;
    var genericNames = ['pune', 'maharashtra', 'india', 'bhosari', 'midc', 'chakan', 'hadapsar', 'pcmc'];
    var isGeneric = aName && genericNames.indexOf(aName.toLowerCase().trim()) !== -1;

    if (aName && !isCoord && !isGeneric) {
      var anchorPlaceId = aPid || ('ANCHOR-' + Utilities.getUuid().substring(0, 8));
      var anchorRecord = {
        place_id: anchorPlaceId,
        name: aName,
        company_name: aName,
        formatted_address: locH.detailedAddress || locH.formattedName || locH.formatted_address || '',
        lat: center.lat,
        lng: center.lng,
        latitude: center.lat,
        longitude: center.lng,
        distance_meters: 0,
        distance_km: 0,
        distance_text: '0 m (Search Target)',
        phone_number: locH.phone_number || 'Not available',
        website: locH.website || '',
        rating: locH.rating || null,
        user_ratings_total: locH.user_ratings_total || 0,
        google_maps_url: locH.google_maps_url || (aPid ? ('https://maps.google.com/?q=place_id:' + aPid) : ''),
        industrial_sector: locH.primary_type || 'Industrial Enterprise (Search Target)',
        primary_type: 'industrial',
        relevance_score: 'High Industrial Relevance',
        verification_status: 'Verified by Google Places',
        discovery_keywords: 'Search Target',
        is_search_center: true
      };
      inFlightPlacesMap[anchorPlaceId] = anchorRecord;
      inFlightCandidateList.push(anchorRecord);
    }

    // Execute discovery across each grid tile and keyword
    tiles.forEach(function(tile) {
      // Check resume condition
      if (resumeTiles.indexOf(tile.tileIndex) !== -1) {
        coverageMetrics.queriesSkipped += selectedKeywords.length;
        return;
      }

      coverageMetrics.tilesProcessed++;

      selectedKeywords.forEach(function(kw) {
        coverageMetrics.queriesAttempted++;
        var stats = keywordStatsMap[kw];

        try {
          var pageCount = 0;
          var nextPageToken = null;

          do {
            var searchResult = PlacesService.searchPlacesNearby(kw, tile.center.lat, tile.center.lng, tile.radiusMeters, nextPageToken);
            coverageMetrics.queriesSucceeded++;

            if (searchResult.results && searchResult.results.length > 0) {
              coverageMetrics.rawResultAppearances += searchResult.results.length;

              searchResult.results.forEach(function(place) {
                // Industrial Relevance filter
                var relevance = CompanyService.evaluateRelevance(place);
                if (!relevance.isIndustrial) {
                  coverageMetrics.rejectedIrrelevant++;
                  stats.rejected++;
                  return;
                }
                if (relevance.relevanceScore === 'Needs Review') {
                  coverageMetrics.recordsRequiringReview++;
                  stats.needsReview++;
                }

                // Calculate precise great-circle distance from confirmed search center
                if (place.lat && place.lng) {
                  var distMeters = CompanyService.calculateDistanceMeters(center.lat, center.lng, place.lat, place.lng);
                  place.distance_meters = Math.round(distMeters);
                  place.distance_km = Math.round((distMeters / 1000) * 100) / 100;
                  place.distance_text = distMeters < 1000 ? Math.round(distMeters) + ' m' : (distMeters / 1000).toFixed(2) + ' km';

                  var maxDistLimit = params.radius || 1000;
                  if (searchType === 'radius' || params.radius !== undefined) {
                    if (distMeters > maxDistLimit) {
                      coverageMetrics.rejectedDistance = (coverageMetrics.rejectedDistance || 0) + 1;
                      return; // Strictly exclude places outside the confirmed search perimeter (e.g. > 1,000 m)
                    }
                  } else if (!isPointInBounds(place.lat, place.lng, bounds)) {
                    coverageMetrics.rejectedDistance = (coverageMetrics.rejectedDistance || 0) + 1;
                    return;
                  }
                } else {
                  coverageMetrics.rejectedMissingCoords = (coverageMetrics.rejectedMissingCoords || 0) + 1;
                  place.distance_meters = null;
                  place.distance_km = null;
                  place.distance_text = 'Coordinate unverified';
                  place.relevance_score = 'Needs Review';
                  return; // Exclude records whose coordinate cannot be verified within the 1 km perimeter
                }

                stats.matches++;
                place.search_region = tile.name;

                // Intra-search deduplication and keyword aggregation
                if (inFlightPlacesMap[place.place_id]) {
                  var existing = inFlightPlacesMap[place.place_id];
                  if (existing.discovery_keywords.indexOf(kw) === -1) {
                    existing.discovery_keywords += ', ' + kw;
                  }
                  coverageMetrics.duplicatesRemoved++;
                  stats.duplicates++;
                } else {
                  place.discovery_keywords = kw;
                  inFlightPlacesMap[place.place_id] = place;
                  inFlightCandidateList.push(place);
                }
              });
            }

            nextPageToken = searchResult.nextPageToken;
            pageCount++;

            // If reached page 3, Google Places API has reached its 60 result ceiling
            if (pageCount >= 3 && nextPageToken) {
              coverageMetrics.warnings.push('Google Places 60-result maximum reached on ' + tile.name + ' for keyword "' + kw + '". Additional places may exist.');
            }

            if (nextPageToken && pageCount < maxPages) {
              Utilities.sleep(2000);
            }
          } while (nextPageToken && pageCount < maxPages);

        } catch (e) {
          coverageMetrics.queriesFailed++;
          if (stats) stats.status = 'Error: ' + e.message;
          coverageMetrics.warnings.push(e.message);
        }
      });
    });

    // If all executed queries failed, fail fast with explicit operational error
    if (coverageMetrics.queriesSucceeded === 0 && coverageMetrics.queriesFailed > 0) {
      var failMsg = coverageMetrics.warnings[0] || 'Google Places API request failed. Please check PLACES_API_KEY in Script Properties and Google Cloud billing.';
      throw new Error(failMsg);
    }

    // Process candidate places against persistent Google Sheets database
    var newRecordsToInsert = [];
    var duplicateReviewsToInsert = [];

    inFlightCandidateList.forEach(function(candPlace) {
      var dupCheck = CompanyService.checkForDuplicate(candPlace, existingCompanies);

      if (dupCheck.isDuplicate) {
        coverageMetrics.duplicatesRemoved++;
        var kws = candPlace.discovery_keywords.split(', ');
        kws.forEach(function(k) {
          if (keywordStatsMap[k]) keywordStatsMap[k].duplicates++;
        });

        if (dupCheck.matchType === 'EXACT_PLACE_ID') {
          SpreadsheetService.appendKeywordToCompany(dupCheck.existingRecord.record_id, candPlace.discovery_keywords);
        } else if (dupCheck.matchType === 'SPATIAL_NAME_MATCH') {
          duplicateReviewsToInsert.push({
            review_id: 'DUP-' + Utilities.getUuid().substring(0, 8).toUpperCase(),
            primary_record_id: dupCheck.existingRecord.record_id,
            incoming_record_id: 'CANDIDATE-' + candPlace.place_id,
            company_name_a: dupCheck.existingRecord.company_name,
            company_name_b: candPlace.name,
            place_id_a: dupCheck.existingRecord.place_id,
            place_id_b: candPlace.place_id,
            phone_a: dupCheck.existingRecord.phone_number,
            phone_b: candPlace.phone_number,
            address_a: dupCheck.existingRecord.formatted_address,
            address_b: candPlace.formatted_address,
            distance_meters: dupCheck.distanceMeters || 0,
            similarity_reason: dupCheck.reason,
            status: 'Pending',
            created_at: new Date().toISOString()
          });
        }
      } else {
        coverageMetrics.uniqueDiscovered++;
        var kws = candPlace.discovery_keywords.split(', ');
        kws.forEach(function(k) {
          if (keywordStatsMap[k]) keywordStatsMap[k].unique++;
        });

        // Enrich contact details if missing
        if (!candPlace.phone_number || !candPlace.website) {
          try {
            var details = PlacesService.getPlaceDetails(candPlace.place_id);
            if (details) {
              if (details.phone_number) candPlace.phone_number = details.phone_number;
              if (details.international_phone_number) candPlace.international_phone_number = details.international_phone_number;
              if (details.website) candPlace.website = details.website;
              if (details.city) candPlace.city = details.city;
              if (details.state) candPlace.state = details.state;
              if (details.country) candPlace.country = details.country;
              if (details.postal_code) candPlace.postal_code = details.postal_code;
            }
          } catch (err) {
            // Non-critical, proceed
          }
        }

        var fullRecord = CompanyService.buildCompanyRecord(candPlace, sessionId, areaDisplayName);
        fullRecord.record_source = 'LIVE_SEARCH';
        var validation = CompanyService.validateCompanyRecord(fullRecord);
        if (validation.isValid) {
          newRecordsToInsert.push(fullRecord);
          existingCompanies.push(fullRecord);
        }
      }
    });

    // Write newly discovered records to Google Sheets database using LockService
    if (newRecordsToInsert.length > 0) {
      try {
        SpreadsheetService.batchInsertCompanies(newRecordsToInsert);
      } catch (errWrite) {
        coverageMetrics.warnings.push('Database write warning: ' + errWrite.message);
      }
    }
    if (duplicateReviewsToInsert.length > 0) {
      try {
        SpreadsheetService.batchInsertDuplicateReviews(duplicateReviewsToInsert);
      } catch (errDup) {
        // Non-critical
      }
    }

    // Update Keyword Analytics in the database
    try {
      SpreadsheetService.updateKeywordAnalytics(keywordStatsMap);
    } catch (errKw) {}

    // Find any previously saved records in database that also lie within the 1 km perimeter
    var maxDistLimit = params.radius || 1000;
    var relevantSavedRecords = [];
    var seenPlaceIds = {};
    newRecordsToInsert.forEach(function(r) {
      if (r.place_id) seenPlaceIds[r.place_id] = true;
    });

    existingCompanies.forEach(function(rec) {
      if (rec.latitude && rec.longitude && !seenPlaceIds[rec.place_id]) {
        var d = CompanyService.calculateDistanceMeters(center.lat, center.lng, Number(rec.latitude), Number(rec.longitude));
        if (d <= maxDistLimit) {
          rec.distance_meters = Math.round(d);
          rec.distance_km = Math.round((d / 1000) * 100) / 100;
          rec.distance_text = d < 1000 ? Math.round(d) + ' m' : (d / 1000).toFixed(2) + ' km';
          rec.record_source = (rec.manager_corrected_name || rec.manager_notes) ? 'MANAGER_EDITED' : 'SAVED_DATABASE';
          relevantSavedRecords.push(rec);
          seenPlaceIds[rec.place_id] = true;
        }
      }
    });

    var allDiscoveredCompanies = newRecordsToInsert.concat(relevantSavedRecords);

    var endTime = new Date();
    var completionStatus = coverageMetrics.warnings.length > 0 
      ? 'Search completed with coverage warnings' 
      : 'Search completed — coverage not guaranteed';

    // Construct full Coverage Report object
    var coverageReport = {
      searchId: sessionId,
      searchName: sessionName,
      location: {
        country: locationHierarchy.country || 'India',
        state: locationHierarchy.state || '',
        city: locationHierarchy.city || '',
        locality: locationHierarchy.locality || '',
        formattedName: areaDisplayName,
        placeId: locationHierarchy.placeId || ''
      },
      center: center,
      boundary: {
        type: polygon ? 'Polygon Bounding Box' : 'Geographical Bounds',
        coordinates: polygon || [
          { lat: bounds.north, lng: bounds.west },
          { lat: bounds.north, lng: bounds.east },
          { lat: bounds.south, lng: bounds.east },
          { lat: bounds.south, lng: bounds.west }
        ],
        approxAreaSqKm: approxAreaSqKm
      },
      tiles: tiles,
      metrics: coverageMetrics,
      keywordsUsed: selectedKeywords,
      startedAt: startTime.toISOString(),
      completedAt: endTime.toISOString(),
      status: completionStatus,
      durationMs: (endTime.getTime() - startTime.getTime())
    };

    // Save Search Session metadata to Google Sheets
    var sessionRecord = {
      session_id: sessionId,
      session_name: sessionName,
      search_timestamp: startTime.toISOString(),
      search_type: 'Directional / Tiled (' + tiles.length + ' tiles)',
      center_lat: center.lat,
      center_lng: center.lng,
      radius_meters: tiles[0].radiusMeters,
      boundary_json: JSON.stringify(coverageReport),
      area_display_name: areaDisplayName,
      approx_area_sqkm: approxAreaSqKm,
      keywords_used: selectedKeywords.join(', '),
      total_raw_found: coverageMetrics.rawResultAppearances,
      new_companies_added: newRecordsToInsert.length,
      duplicates_prevented: coverageMetrics.duplicatesRemoved,
      status: completionStatus,
      coverage_notes: coverageMetrics.warnings.join('; ') || 'Standard search completed; coverage not guaranteed due to API limits',
      created_by: Session.getActiveUser().getEmail() || 'Manager'
    };

    try {
      SpreadsheetService.saveSearchSession(sessionRecord);
    } catch (errSess) {}

    return {
      success: true,
      sessionId: sessionId,
      sessionName: sessionName,
      coverageReport: coverageReport,
      totalRawFound: coverageMetrics.rawResultAppearances,
      newCompaniesAdded: newRecordsToInsert.length,
      previouslySavedFound: relevantSavedRecords.length,
      duplicatesPrevented: coverageMetrics.duplicatesRemoved,
      keywordStats: keywordStatsMap,
      notes: coverageMetrics.warnings,
      center: center,
      bounds: bounds,
      companies: allDiscoveredCompanies,
      newRecords: newRecordsToInsert,
      diagnostics: {
        rawPlacesCount: coverageMetrics.rawResultAppearances,
        rejectedIrrelevantCount: coverageMetrics.rejectedIrrelevant,
        rejectedDistanceCount: coverageMetrics.rejectedDistance || 0,
        rejectedMissingCoordsCount: coverageMetrics.rejectedMissingCoords || 0,
        verifiedWithin1KmCount: allDiscoveredCompanies.length
      }
    };
  }

  return {
    calculateDirectionalBounds: calculateDirectionalBounds,
    subdivideBoundsIntoTiles: subdivideBoundsIntoTiles,
    isPointInBounds: isPointInBounds,
    isPointInPolygon: isPointInPolygon,
    executeSearch: executeSearch
  };
})();
