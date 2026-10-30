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
/**
 * Normalizes and classifies an Indian phone number according to DoT rules.
 */
export declare function parseIndianPhone(rawPhone: string | null | undefined): ParsedPhoneResult;
//# sourceMappingURL=phoneParser.d.ts.map