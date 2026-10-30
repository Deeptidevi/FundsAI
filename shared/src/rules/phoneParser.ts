// Indian National Numbering Plan (DoT) Phone Parser migrated from PhoneService.gs

import { PhoneType } from '../types/index.js';

export interface ParsedPhoneResult {
  raw: string;
  cleaned: string;
  e164: string;
  type: PhoneType;
  stdCode?: string;
  cityName?: string;
  isValid: boolean;
}

// Major Tier 1 & Tier 2 Indian STD codes
const STD_CODE_MAP: Record<string, string> = {
  '11': 'New Delhi',
  '22': 'Mumbai',
  '33': 'Kolkata',
  '44': 'Chennai',
  '80': 'Bengaluru',
  '40': 'Hyderabad',
  '20': 'Pune',
  '79': 'Ahmedabad',
  '120': 'Noida / Ghaziabad',
  '124': 'Gurgaon',
  '129': 'Faridabad',
  '141': 'Jaipur',
  '172': 'Chandigarh',
  '265': 'Vadodara',
  '261': 'Surat',
  '281': 'Rajkot',
  '731': 'Indore',
  '755': 'Bhopal',
  '522': 'Lucknow',
  '512': 'Kanpur',
  '422': 'Coimbatore',
  '484': 'Kochi',
  '612': 'Patna',
  '651': 'Ranchi',
  '674': 'Bhubaneswar',
  '891': 'Visakhapatnam',
};

/**
 * Normalizes and classifies an Indian phone number according to DoT rules.
 */
export function parseIndianPhone(rawPhone: string | null | undefined): ParsedPhoneResult {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      raw: '',
      cleaned: '',
      e164: '',
      type: 'Unknown',
      isValid: false,
    };
  }

  // Strip all non-digit characters
  let digits = rawPhone.replace(/\D/g, '');

  // Handle leading international +91 or 91
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.substring(2);
  } else if (digits.length === 13 && digits.startsWith('091')) {
    digits = digits.substring(3);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // Check Toll-Free (1800 or 1860)
  if (digits.startsWith('1800') || digits.startsWith('1860')) {
    return {
      raw: rawPhone,
      cleaned: digits,
      e164: `+91${digits}`,
      type: 'TollFree',
      isValid: true,
    };
  }

  // Must be 10 digits for standard Indian mobile / fixed-line
  if (digits.length !== 10) {
    return {
      raw: rawPhone,
      cleaned: digits,
      e164: digits.length > 0 ? `+91${digits}` : '',
      type: 'Unknown',
      isValid: false,
    };
  }

  // In India, check major 2-digit Metro STD codes first (e.g. 11, 22, 33, 44, 80, 40, 20, 79)
  // For instance, 80-41234567 is Bangalore landline, not mobile.
  for (const prefixLen of [2, 3, 4]) {
    const candidateStd = digits.substring(0, prefixLen);
    if (STD_CODE_MAP[candidateStd]) {
      const localNumber = digits.substring(prefixLen);
      // Indian fixed-lines typically start with 2, 3, 4, 5, 6
      if (['2', '3', '4', '5', '6'].includes(localNumber.charAt(0))) {
        return {
          raw: rawPhone,
          cleaned: digits,
          e164: `+91${digits}`,
          type: 'Landline',
          stdCode: candidateStd,
          cityName: STD_CODE_MAP[candidateStd],
          isValid: true,
        };
      }
    }
  }

  const firstDigit = digits.charAt(0);

  // Indian mobile numbers strictly start with 6, 7, 8, or 9
  if (['6', '7', '8', '9'].includes(firstDigit)) {
    return {
      raw: rawPhone,
      cleaned: digits,
      e164: `+91${digits}`,
      type: 'Mobile',
      isValid: true,
    };
  }

  // Landlines starting with 2, 3, 4, 5
  if (['2', '3', '4', '5'].includes(firstDigit)) {
    return {
      raw: rawPhone,
      cleaned: digits,
      e164: `+91${digits}`,
      type: 'Landline',
      isValid: true,
    };
  }

  return {
    raw: rawPhone,
    cleaned: digits,
    e164: `+91${digits}`,
    type: 'Unknown',
    isValid: false,
  };
}
