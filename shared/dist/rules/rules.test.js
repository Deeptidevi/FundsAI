// Unit tests for Phone Parser, Tier Classification, Branch Preservation, and Industrial Filter
import test from 'node:test';
import assert from 'node:assert';
import { parseIndianPhone } from './phoneParser.js';
import { classifyBusinessTier } from './tierClassification.js';
import { checkDuplicateWithBranchPreservation } from './deduplication.js';
import { classifyIndustrialBusiness } from './industrialFilter.js';
import { calculateBoundingBox, calculateHaversineDistance } from '../geo/geodetic.js';
test('DoT Phone Parser: Indian mobile numbers', () => {
    const res1 = parseIndianPhone('+91 98765 43210');
    assert.strictEqual(res1.isValid, true);
    assert.strictEqual(res1.type, 'Mobile');
    assert.strictEqual(res1.e164, '+919876543210');
    const res2 = parseIndianPhone('08123456789');
    assert.strictEqual(res2.isValid, true);
    assert.strictEqual(res2.type, 'Mobile');
    assert.strictEqual(res2.e164, '+918123456789');
});
test('DoT Phone Parser: Landlines with STD codes', () => {
    const res1 = parseIndianPhone('011-23456789'); // Delhi
    assert.strictEqual(res1.isValid, true);
    assert.strictEqual(res1.type, 'Landline');
    assert.strictEqual(res1.cityName, 'New Delhi');
    assert.strictEqual(res1.e164, '+911123456789');
    const res2 = parseIndianPhone('080-41234567'); // Bangalore
    assert.strictEqual(res2.isValid, true);
    assert.strictEqual(res2.type, 'Landline');
    assert.strictEqual(res2.cityName, 'Bengaluru');
});
test('DoT Phone Parser: Toll-Free 1800', () => {
    const res = parseIndianPhone('1800-11-2233');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.type, 'TollFree');
});
test('Tier Classification: Gold, Silver, Bronze', () => {
    assert.strictEqual(classifyBusinessTier(4.8, 120), 'Gold');
    assert.strictEqual(classifyBusinessTier(4.5, 100), 'Gold');
    assert.strictEqual(classifyBusinessTier(4.2, 50), 'Silver');
    assert.strictEqual(classifyBusinessTier(4.0, 25), 'Silver');
    assert.strictEqual(classifyBusinessTier(3.8, 200), 'Bronze');
    assert.strictEqual(classifyBusinessTier(4.9, 10), 'Bronze');
});
test('Branch Preservation Rule (>500m separation)', () => {
    // Unit 1 in Peenya, Bangalore
    const unit1 = {
        id: 'lead-1',
        companyName: 'Apex Precision Engineering Pvt Ltd',
        normalizedPhone: '+918028391111',
        coords: { lat: 13.0312, lng: 77.5185 },
    };
    // Unit 2 in Bommasandra, Bangalore (> 25 km away)
    const unit2 = {
        id: 'lead-2',
        companyName: 'Apex Precision Engineering Pvt Ltd',
        normalizedPhone: '+918028391111',
        coords: { lat: 12.8156, lng: 77.6892 },
    };
    const result = checkDuplicateWithBranchPreservation(unit2, [unit1]);
    assert.strictEqual(result.isDuplicate, false);
    assert.strictEqual(result.isPreservedBranch, true);
});
test('Industrial Filter: Excludes Consumer types and identifies Industrial', () => {
    const bakery = classifyIndustrialBusiness({
        name: 'Sweet Delights Bakery & Cafe',
        types: ['bakery', 'cafe', 'food'],
    });
    assert.strictEqual(bakery.isExcludedConsumer, true);
    assert.strictEqual(bakery.isIndustrial, false);
    const factory = classifyIndustrialBusiness({
        name: 'Precision Gear Tooling and Manufacturing',
        types: ['establishment'],
        description: 'Custom CNC machining, die casting, and industrial automation.',
    });
    assert.strictEqual(factory.isIndustrial, true);
    assert.strictEqual(factory.isExcludedConsumer, false);
});
test('Geodetic Math: Haversine distance and asymmetric bounding box', () => {
    const c1 = { lat: 28.6139, lng: 77.209 }; // Connaught Place, Delhi
    const c2 = { lat: 28.5355, lng: 77.391 }; // Noida
    const dist = calculateHaversineDistance(c1, c2);
    assert.ok(dist > 18000 && dist < 25000); // ~20 km
    const box = calculateBoundingBox(c1, 10, 'NORTH');
    assert.ok(box.high.lat > c1.lat);
});
//# sourceMappingURL=rules.test.js.map