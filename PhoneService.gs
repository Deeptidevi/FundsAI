/**
 * @fileoverview PhoneService.gs
 * Standalone phone number normalization and classification module.
 * Provides country-aware distinction between Mobile, Landline, Toll-free, VoIP, Other, and Unknown.
 * Adheres to Indian National Numbering Plan (DoT) and international E.164 formats.
 */

var PhoneService = (function() {

  // Prominent Indian Telecom STD Codes (2-digit and 3-digit major industrial hubs)
  var INDIA_STD_2_DIGIT = ['11', '22', '33', '44', '80', '40', '20', '79']; // Delhi, Mumbai, Kolkata, Chennai, Bengaluru, Hyderabad, Pune, Ahmedabad
  var INDIA_STD_3_DIGIT = [
    '120', '124', '129', '141', '161', '172', '240', '250', '251', '253', 
    '257', '260', '261', '265', '281', '413', '422', '427', '431', '434', 
    '452', '471', '484', '512', '522', '532', '542', '612', '641', '651', 
    '657', '712', '731', '734', '744', '755', '761', '821', '824', '831', 
    '836', '863', '866', '870', '877', '891'
  ];

  /**
   * Normalizes a phone string into a digits-and-plus string.
   */
  function clean(raw) {
    if (!raw || typeof raw !== 'string') return '';
    var trimmed = raw.trim();
    var hasPlus = trimmed.charAt(0) === '+';
    var digits = trimmed.replace(/\D/g, '');
    return hasPlus ? '+' + digits : digits;
  }

  /**
   * Main parsing and classification method.
   * @param {string} rawPhone Original phone number as returned by API or entered by user
   * @param {string} [countryContext='IN'] ISO-2 country hint
   * @returns {Object} Structured phone analysis
   */
  function parseAndClassify(rawPhone, countryContext) {
    var country = (countryContext || 'IN').toUpperCase();
    
    if (!rawPhone || typeof rawPhone !== 'string' || rawPhone.trim() === '') {
      return {
        original: '',
        normalized: '',
        classification: 'Not Available',
        countryCode: '',
        nationalNumber: '',
        isValid: false,
        notes: 'No phone number provided'
      };
    }

    var original = rawPhone.trim();
    var normalized = clean(original);
    var digitsOnly = normalized.replace(/\D/g, '');

    // Default return template
    var result = {
      original: original,
      normalized: normalized,
      classification: 'Unknown — Verify',
      countryCode: '',
      nationalNumber: '',
      isValid: false,
      notes: ''
    };

    // 1. Detect International Country Code if prefixed with +
    if (normalized.startsWith('+')) {
      if (normalized.startsWith('+91')) {
        return parseIndianNumber(normalized.substring(3), original, '+91');
      } else if (normalized.startsWith('+1')) {
        return parseNorthAmericanNumber(normalized.substring(2), original);
      } else if (normalized.startsWith('+44')) {
        return parseUkNumber(normalized.substring(3), original);
      } else if (normalized.startsWith('+49')) {
        return parseGermanNumber(normalized.substring(3), original);
      } else if (normalized.startsWith('+86')) {
        return parseChineseNumber(normalized.substring(3), original);
      } else if (normalized.startsWith('+971')) {
        return parseUaeNumber(normalized.substring(4), original);
      } else {
        // Generic international number
        result.countryCode = normalized.slice(0, normalized.length > 4 ? 4 : normalized.length);
        result.nationalNumber = normalized.slice(result.countryCode.length);
        result.isValid = digitsOnly.length >= 7 && digitsOnly.length <= 15;
        result.classification = 'International (Verify)';
        result.notes = 'International number with non-standard national format';
        return result;
      }
    }

    // 2. Local context evaluation (Default IN)
    if (country === 'IN') {
      return parseIndianNumber(digitsOnly, original, '+91');
    } else if (country === 'US' || country === 'CA') {
      return parseNorthAmericanNumber(digitsOnly, original);
    }

    // Fallback for unrecognized local format
    result.isValid = digitsOnly.length >= 7 && digitsOnly.length <= 15;
    result.nationalNumber = digitsOnly;
    return result;
  }

  /**
   * Specific logic for Indian numbering plan.
   * National numbers are 10 digits.
   * Mobile: 10 digits starting with 6, 7, 8, 9.
   * Landline: STD code + subscriber number (total 10 digits).
   * Toll-Free: Starts with 1800 or 1860.
   */
  function parseIndianNumber(digits, original, countryCode) {
    var rawDigits = digits.replace(/^0+/, ''); // strip leading zeros (trunk prefix)
    var result = {
      original: original,
      normalized: countryCode ? countryCode + rawDigits : rawDigits,
      classification: 'Unknown — Verify',
      countryCode: countryCode || '+91',
      nationalNumber: rawDigits,
      isValid: false,
      notes: ''
    };

    // Check Toll-free (starts with 1800 or 1860)
    if (rawDigits.startsWith('1800') || digits.startsWith('1800') || original.indexOf('1800') !== -1) {
      result.classification = 'Toll-free';
      result.isValid = rawDigits.length >= 10 && rawDigits.length <= 11;
      result.notes = 'Indian Toll-Free (1800 series)';
      return result;
    }
    if (rawDigits.startsWith('1860')) {
      result.classification = 'Toll-free (Local Call Rate)';
      result.isValid = rawDigits.length >= 10 && rawDigits.length <= 11;
      result.notes = 'Indian 1860 series national access';
      return result;
    }

    // Check if passed string has 12 digits starting with 91
    if (digits.length === 12 && digits.startsWith('91')) {
      rawDigits = digits.substring(2);
      result.nationalNumber = rawDigits;
      result.normalized = '+91' + rawDigits;
    }

    // Standard 10-digit Indian National Number evaluation
    if (rawDigits.length === 10) {
      var firstDigit = rawDigits.charAt(0);

      // Check if original contained STD bracket or hyphen formatting e.g., "080-28394050" or "(080) 28394050"
      var hasStdIndicator = original.indexOf('080') === 0 || original.indexOf('022') === 0 || 
                             original.indexOf('011') === 0 || original.indexOf('044') === 0 ||
                             original.indexOf('033') === 0 || original.indexOf('040') === 0 ||
                             original.indexOf('020') === 0 || original.indexOf('079') === 0;

      // Check 2-digit STD codes
      var matchedStd2 = INDIA_STD_2_DIGIT.indexOf(rawDigits.substring(0, 2)) !== -1;
      var subscriberAfterStd2 = rawDigits.substring(2);
      var startsWithLandlineSubscriber = ['2', '3', '4', '5', '6'].indexOf(subscriberAfterStd2.charAt(0)) !== -1;

      // If matches 2-digit STD and subscriber starts with standard landline prefix (2, 3, 4, 5, 6)
      if (matchedStd2 && startsWithLandlineSubscriber && (hasStdIndicator || firstDigit !== '9' && firstDigit !== '7' && firstDigit !== '6')) {
        result.classification = 'Landline';
        result.isValid = true;
        result.notes = 'Indian Landline (STD ' + rawDigits.substring(0, 2) + ')';
        return result;
      }

      // Check 3-digit STD codes
      var matchedStd3 = INDIA_STD_3_DIGIT.indexOf(rawDigits.substring(0, 3)) !== -1;
      var subscriberAfterStd3 = rawDigits.substring(3);
      if (matchedStd3 && ['2', '3', '4', '5', '6'].indexOf(subscriberAfterStd3.charAt(0)) !== -1 && !rawDigits.startsWith('9')) {
        result.classification = 'Landline';
        result.isValid = true;
        result.notes = 'Indian Landline (STD ' + rawDigits.substring(0, 3) + ')';
        return result;
      }

      // Mobile in India: exactly 10 digits starting with 6, 7, 8, 9
      if (['6', '7', '8', '9'].indexOf(firstDigit) !== -1) {
        result.classification = 'Mobile';
        result.isValid = true;
        result.notes = 'Indian 10-digit Mobile (Series ' + firstDigit + 'XXXX)';
        return result;
      }

      // If 10 digits starts with 2, 3, 4, 5, likely Landline without leading STD zero
      if (['2', '3', '4', '5'].indexOf(firstDigit) !== -1) {
        result.classification = 'Landline';
        result.isValid = true;
        result.notes = 'Indian Fixed Line';
        return result;
      }
    }

    // Check for 11 digits (STD with leading 0 e.g. 08028394050 or 09845012345)
    if (digits.length === 11 && digits.startsWith('0')) {
      var nationalPart = digits.substring(1);
      if (['6', '7', '8', '9'].indexOf(nationalPart.charAt(0)) !== -1) {
        result.classification = 'Mobile';
        result.nationalNumber = nationalPart;
        result.normalized = '+91' + nationalPart;
        result.isValid = true;
        result.notes = 'Indian Mobile (Trunk dialed 0)';
        return result;
      } else {
        result.classification = 'Landline';
        result.nationalNumber = nationalPart;
        result.normalized = '+91' + nationalPart;
        result.isValid = true;
        result.notes = 'Indian Fixed Line (Trunk dialed STD)';
        return result;
      }
    }

    // 8-digit local landline without STD code
    if (rawDigits.length === 8 && ['2', '3', '4', '5', '6'].indexOf(rawDigits.charAt(0)) !== -1) {
      result.classification = 'Landline';
      result.isValid = true;
      result.notes = 'Local Landline (Missing STD code)';
      return result;
    }

    result.isValid = rawDigits.length >= 7 && rawDigits.length <= 12;
    result.notes = 'Unconventional length or numbering format';
    return result;
  }

  function parseNorthAmericanNumber(digits, original) {
    var raw = digits.replace(/^1/, ''); // strip +1 / 1
    var result = {
      original: original,
      normalized: '+1' + raw,
      classification: 'Fixed/Mobile (Verify)',
      countryCode: '+1',
      nationalNumber: raw,
      isValid: false,
      notes: ''
    };

    if (raw.length === 10) {
      result.isValid = true;
      var npa = raw.substring(0, 3);
      if (['800', '888', '877', '866', '855', '844', '833'].indexOf(npa) !== -1) {
        result.classification = 'Toll-free';
        result.notes = 'North American Toll-free (' + npa + ')';
      } else {
        result.classification = 'Landline/Mobile';
        result.notes = 'NANP 10-digit number';
      }
    }
    return result;
  }

  function parseUkNumber(digits, original) {
    var raw = digits.replace(/^0+/, '');
    var result = {
      original: original,
      normalized: '+44' + raw,
      classification: 'Unknown — Verify',
      countryCode: '+44',
      nationalNumber: raw,
      isValid: raw.length >= 9 && raw.length <= 11,
      notes: ''
    };
    if (raw.startsWith('7')) {
      result.classification = 'Mobile';
    } else if (raw.startsWith('1') || raw.startsWith('2')) {
      result.classification = 'Landline';
    } else if (raw.startsWith('800') || raw.startsWith('808')) {
      result.classification = 'Toll-free';
    }
    return result;
  }

  function parseGermanNumber(digits, original) {
    var raw = digits.replace(/^0+/, '');
    var result = {
      original: original,
      normalized: '+49' + raw,
      classification: 'Unknown — Verify',
      countryCode: '+49',
      nationalNumber: raw,
      isValid: raw.length >= 9 && raw.length <= 12,
      notes: ''
    };
    if (raw.startsWith('15') || raw.startsWith('16') || raw.startsWith('17')) {
      result.classification = 'Mobile';
    } else if (raw.startsWith('800')) {
      result.classification = 'Toll-free';
    } else {
      result.classification = 'Landline';
    }
    return result;
  }

  function parseChineseNumber(digits, original) {
    var raw = digits.replace(/^0+/, '');
    var result = {
      original: original,
      normalized: '+86' + raw,
      classification: 'Unknown — Verify',
      countryCode: '+86',
      nationalNumber: raw,
      isValid: raw.length >= 10 && raw.length <= 12,
      notes: ''
    };
    if (raw.startsWith('1') && raw.length === 11) {
      result.classification = 'Mobile';
    } else if (raw.startsWith('800') || raw.startsWith('400')) {
      result.classification = 'Toll-free';
    } else {
      result.classification = 'Landline';
    }
    return result;
  }

  function parseUaeNumber(digits, original) {
    var raw = digits.replace(/^0+/, '');
    var result = {
      original: original,
      normalized: '+971' + raw,
      classification: 'Unknown — Verify',
      countryCode: '+971',
      nationalNumber: raw,
      isValid: raw.length >= 8 && raw.length <= 10,
      notes: ''
    };
    if (raw.startsWith('5')) {
      result.classification = 'Mobile';
    } else if (raw.startsWith('800')) {
      result.classification = 'Toll-free';
    } else {
      result.classification = 'Landline';
    }
    return result;
  }

  return {
    clean: clean,
    parseAndClassify: parseAndClassify
  };
})();
