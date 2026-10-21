// =====================================================
// Health Data Normalization Layer
// =====================================================
// Converts raw @capgo/capacitor-health samples into
// our standard Signal format. Handles entity name mapping,
// unit conversion, and value aggregation.
// =====================================================

import type { Signal } from '$lib/types.d';

// =====================================================
// Types
// =====================================================

/** Raw sample from @capgo/capacitor-health (subset of its HealthSample) */
export interface PluginDataPoint {
	startDate: string;
	endDate: string;
	value: number;
	unit: string;
	systolic?: number;
	diastolic?: number;
	sourceName?: string;
}

/** Normalized signal entry ready for batch insert */
export interface NormalizedSignalEntry {
	signal: string;
	value: number;
	unit: string;
	date: string;
	source: string;
}

/** Mapping from plugin data type to our signal */
interface HealthEntityMapping {
	pluginType: string;
	signal: string;
	targetUnit: string;
	sourceUnit?: string;
	extract?: (raw: PluginDataPoint) => number | null;
}

// =====================================================
// Entity Mapping
// =====================================================

const ENTITY_MAP: HealthEntityMapping[] = [
	// Heart rate
	{ pluginType: 'heartRate', signal: 'heart_rate', targetUnit: 'beats/min' },
	{ pluginType: 'restingHeartRate', signal: 'resting_heart_rate', targetUnit: 'bpm' },
	{ pluginType: 'heartRateVariability', signal: 'heart_rate_variability', targetUnit: 'ms' },

	// Blood pressure → two separate signals
	{
		pluginType: 'bloodPressure',
		signal: 'systolic',
		targetUnit: 'mmHg',
		extract: (r) => r.systolic ?? null
	},
	{
		pluginType: 'bloodPressure',
		signal: 'diastolic',
		targetUnit: 'mmHg',
		extract: (r) => r.diastolic ?? null
	},

	// Blood glucose — plugin returns mg/dL on both platforms
	{ pluginType: 'bloodGlucose', signal: 'blood_sugar', targetUnit: 'mg/dL' },

	// Body measurements
	{ pluginType: 'weight', signal: 'weight', targetUnit: 'kg' },
	{ pluginType: 'height', signal: 'height', targetUnit: 'cm' },
	{ pluginType: 'bodyFat', signal: 'body_fat_percentage', targetUnit: '%' }
];

// =====================================================
// Unit Conversion
// =====================================================

type ConvertFn = (value: number) => number;

const UNIT_CONVERTERS: Record<string, Record<string, ConvertFn>> = {
	'mmol/L': { 'mg/dL': (v) => v * 18.01559 },
	'mg/dL': { 'mmol/L': (v) => v / 18.01559 },
	m: { cm: (v) => v * 100 },
	cm: { m: (v) => v / 100 },
	lbs: { kg: (v) => v * 0.453592 },
	kg: { lbs: (v) => v / 0.453592 },
	'°F': { '°C': (v) => ((v - 32) * 5) / 9 },
	'°C': { '°F': (v) => (v * 9) / 5 + 32 }
};

function convertUnit(value: number, from: string, to: string): number {
	if (from === to) return value;
	const converter = UNIT_CONVERTERS[from]?.[to];
	if (!converter) throw new Error(`No converter: ${from} → ${to}`);
	return converter(value);
}

// =====================================================
// High-frequency data types that need aggregation
// =====================================================

const HIGH_FREQUENCY_TYPES = new Set(['heartRate']);

// =====================================================
// Main Normalization Function
// =====================================================

/**
 * Convert raw plugin data points into normalized signal entries.
 * May produce multiple signals from one plugin type (e.g., bloodPressure → systolic + diastolic).
 */
export function normalizeHealthData(
	rawDataPoints: PluginDataPoint[],
	pluginType: string,
	platform: 'ios' | 'android'
): NormalizedSignalEntry[] {
	const mappings = ENTITY_MAP.filter((m) => m.pluginType === pluginType);

	if (mappings.length === 0) return [];

	const source = platform === 'ios' ? 'healthkit' : 'health_connect';
	const results: NormalizedSignalEntry[] = [];

	for (const point of rawDataPoints) {
		for (const mapping of mappings) {
			// Extract value
			let value: number | null;
			if (mapping.extract) {
				value = mapping.extract(point);
			} else {
				value = point.value;
			}

			if (value === null || isNaN(value)) continue;

			// Convert units if needed
			if (mapping.sourceUnit && mapping.sourceUnit !== mapping.targetUnit) {
				value = convertUnit(value, mapping.sourceUnit, mapping.targetUnit);
			}

			// Round to 2 decimal places
			value = Math.round(value * 100) / 100;

			results.push({
				signal: mapping.signal,
				value,
				unit: mapping.targetUnit,
				date: new Date(point.startDate).toISOString(),
				source
			});
		}
	}

	return results;
}

// =====================================================
// Aggregation
// =====================================================

/**
 * Aggregate entries by hour — averages values within the same hour.
 * Use for high-frequency data (heart rate from Apple Watch).
 */
export function aggregateByHour(entries: NormalizedSignalEntry[]): NormalizedSignalEntry[] {
	if (entries.length === 0) return [];

	const groups = new Map<string, NormalizedSignalEntry[]>();

	for (const entry of entries) {
		const date = new Date(entry.date);
		// Group key: signal + YYYY-MM-DDTHH
		const hourKey = `${entry.signal}|${date.toISOString().slice(0, 13)}`;
		const group = groups.get(hourKey);
		if (group) {
			group.push(entry);
		} else {
			groups.set(hourKey, [entry]);
		}
	}

	const aggregated: NormalizedSignalEntry[] = [];
	for (const group of groups.values()) {
		const avg = group.reduce((sum, e) => sum + e.value, 0) / group.length;
		// Use the middle entry's date as representative
		const middleIdx = Math.floor(group.length / 2);
		aggregated.push({
			...group[middleIdx],
			value: Math.round(avg * 100) / 100
		});
	}

	return aggregated;
}

/**
 * Check if a plugin data type should be aggregated (high-frequency).
 */
export function shouldAggregate(pluginType: string): boolean {
	return HIGH_FREQUENCY_TYPES.has(pluginType);
}

// =====================================================
// BMI Computation
// =====================================================

/**
 * Compute BMI from weight (kg) and height (cm).
 */
export function computeBMI(weightKg: number, heightCm: number): number {
	const heightM = heightCm / 100;
	return Math.round((weightKg / (heightM * heightM)) * 100) / 100;
}
