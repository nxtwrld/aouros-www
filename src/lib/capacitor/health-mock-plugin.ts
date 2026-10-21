// =====================================================
// Mock Health Plugin for Dev Mode
// =====================================================
// Emulates @capgo/capacitor-health API with realistic
// temporal health data so the full sync pipeline works
// identically on web during development.
// =====================================================
// DEV-ONLY: guarded by import.meta.env.DEV at call site.
// =====================================================

import type { PluginDataPoint } from './health-normalize';
import type { HealthPluginLike } from './health';
import type { HealthSample } from '@capgo/capacitor-health';
import { normalizeHealthData, aggregateByHour, shouldAggregate, computeBMI } from './health-normalize';
import type { Signal } from '$lib/types.d';

// =====================================================
// Seeded PRNG (deterministic across reloads)
// =====================================================

function createPRNG(seed: number) {
	let s = seed;
	return () => {
		s = (s * 1664525 + 1013904223) & 0xffffffff;
		return (s >>> 0) / 0xffffffff;
	};
}

// =====================================================
// Data Generators
// =====================================================

type DataGenerator = (
	start: Date,
	end: Date,
	rand: () => number
) => PluginDataPoint[];

function hoursAgo(d: Date, h: number): Date {
	return new Date(d.getTime() - h * 3600_000);
}

/** Generate a date range day-by-day */
function eachDay(start: Date, end: Date): Date[] {
	const days: Date[] = [];
	const d = new Date(start);
	d.setHours(0, 0, 0, 0);
	while (d <= end) {
		days.push(new Date(d));
		d.setDate(d.getDate() + 1);
	}
	return days;
}

function point(date: Date, value: number, unit: string): PluginDataPoint {
	return {
		startDate: date.toISOString(),
		endDate: new Date(date.getTime() + 60_000).toISOString(),
		value,
		unit,
		sourceName: 'MockHealth'
	};
}

// Heart rate: ~24 readings/day with circadian rhythm
const generateHeartRate: DataGenerator = (start, end, rand) => {
	const points: PluginDataPoint[] = [];
	for (const day of eachDay(start, end)) {
		for (let hour = 0; hour < 24; hour++) {
			// Circadian: lower at night (0-6), higher during day
			const isNight = hour < 6 || hour >= 23;
			const base = isNight ? 58 : 72;
			const range = isNight ? 10 : 23;
			const value = Math.round(base + rand() * range);
			const d = new Date(day);
			d.setHours(hour, Math.floor(rand() * 60), 0, 0);
			points.push(point(d, value, 'beats/min'));
		}
	}
	return points;
};

// Resting heart rate: 1/day, slow drift
const generateRestingHeartRate: DataGenerator = (start, end, rand) => {
	const points: PluginDataPoint[] = [];
	let base = 62 + rand() * 4; // 62-66 starting point
	for (const day of eachDay(start, end)) {
		base += (rand() - 0.5) * 0.6; // slow drift
		base = Math.max(55, Math.min(70, base));
		const value = Math.round(base + (rand() - 0.5) * 2);
		const d = new Date(day);
		d.setHours(7, 0, 0, 0);
		points.push(point(d, value, 'beats/min'));
	}
	return points;
};

// HRV: 1/day, inversely correlated with resting HR
const generateHRV: DataGenerator = (start, end, rand) => {
	const points: PluginDataPoint[] = [];
	let base = 45 + rand() * 10;
	for (const day of eachDay(start, end)) {
		base += (rand() - 0.5) * 2;
		base = Math.max(25, Math.min(65, base));
		const value = Math.round(base + (rand() - 0.5) * 4);
		const d = new Date(day);
		d.setHours(7, 0, 0, 0);
		points.push(point(d, value, 'ms'));
	}
	return points;
};

// Blood pressure: 1-2/day
const generateBloodPressure: DataGenerator = (start, end, rand) => {
	const points: PluginDataPoint[] = [];
	for (const day of eachDay(start, end)) {
		const readings = rand() > 0.4 ? 2 : 1;
		for (let i = 0; i < readings; i++) {
			const hour = i === 0 ? 8 : 20;
			const isMorning = hour < 12;
			const sys = Math.round((isMorning ? 125 : 118) + (rand() - 0.5) * 20);
			const dia = Math.round((isMorning ? 82 : 76) + (rand() - 0.5) * 14);
			const d = new Date(day);
			d.setHours(hour, Math.floor(rand() * 30), 0, 0);
			points.push(
				{ ...point(d, sys, 'mmHg'), systolic: sys, diastolic: dia }
			);
		}
	}
	return points;
};

// Blood glucose: 2-3/day with post-meal spikes
const generateBloodGlucose: DataGenerator = (start, end, rand) => {
	const points: PluginDataPoint[] = [];
	for (const day of eachDay(start, end)) {
		// Fasting morning
		const fasting = Math.round(82 + rand() * 15);
		const d1 = new Date(day);
		d1.setHours(7, Math.floor(rand() * 30), 0, 0);
		points.push(point(d1, fasting, 'mg/dL'));

		// Post-lunch spike
		const postLunch = Math.round(105 + rand() * 25);
		const d2 = new Date(day);
		d2.setHours(12, 30 + Math.floor(rand() * 30), 0, 0);
		points.push(point(d2, postLunch, 'mg/dL'));

		// Post-dinner (sometimes)
		if (rand() > 0.3) {
			const postDinner = Math.round(100 + rand() * 30);
			const d3 = new Date(day);
			d3.setHours(18, 30 + Math.floor(rand() * 30), 0, 0);
			points.push(point(d3, postDinner, 'mg/dL'));
		}
	}
	return points;
};

// Weight: ~1/day with gradual downward trend + noise
const generateWeight: DataGenerator = (start, end, rand) => {
	const points: PluginDataPoint[] = [];
	const days = eachDay(start, end);
	const totalDays = days.length;
	for (let i = 0; i < totalDays; i++) {
		// Occasional gaps
		if (rand() > 0.85) continue;

		// Trend: 76 → 72 over the period
		const trend = 76 - (i / totalDays) * 4;
		const value = Math.round((trend + (rand() - 0.5) * 1.2) * 10) / 10;
		const d = new Date(days[i]);
		d.setHours(7, Math.floor(rand() * 15), 0, 0);
		points.push(point(d, value, 'kg'));
	}
	return points;
};

// Height: single static reading
const generateHeight: DataGenerator = (start, _end, _rand) => {
	const d = new Date(start);
	d.setHours(12, 0, 0, 0);
	return [point(d, 178, 'cm')];
};

// Body fat percentage: ~1/week
const generateFatPercentage: DataGenerator = (start, end, rand) => {
	const points: PluginDataPoint[] = [];
	const days = eachDay(start, end);
	const totalDays = days.length;
	let lastDay = -7;
	for (let i = 0; i < totalDays; i++) {
		if (i - lastDay < 6 + Math.floor(rand() * 3)) continue;
		lastDay = i;

		// Slow drift matching weight trend: 22% → 18%
		const trend = 22 - (i / totalDays) * 4;
		const value = Math.round((trend + (rand() - 0.5) * 1.0) * 10) / 10;
		const d = new Date(days[i]);
		d.setHours(7, 15, 0, 0);
		points.push(point(d, value, '%'));
	}
	return points;
};

const GENERATORS: Record<string, DataGenerator> = {
	heartRate: generateHeartRate,
	restingHeartRate: generateRestingHeartRate,
	heartRateVariability: generateHRV,
	bloodPressure: generateBloodPressure,
	bloodGlucose: generateBloodGlucose,
	weight: generateWeight,
	height: generateHeight,
	bodyFat: generateFatPercentage
};

// =====================================================
// Mock Plugin
// =====================================================

let _instance: HealthPluginLike | null = null;

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMockHealthPlugin(): HealthPluginLike {
	const SEED = 42;

	return {
		async isAvailable() {
			await delay(50);
			return { available: true, platform: 'web' };
		},

		async requestAuthorization() {
			await delay(100);
			return {};
		},

		async readSamples(opts) {
			const generator = GENERATORS[opts.dataType];
			if (!generator) {
				await delay(10);
				throw new Error(`Unknown data type: ${opts.dataType}`);
			}

			// Deterministic seed per data type
			const typeSeed = SEED + hashString(opts.dataType);
			const rand = createPRNG(typeSeed);

			const end = opts.endDate ? new Date(opts.endDate) : new Date();
			const start = opts.startDate ? new Date(opts.startDate) : new Date(end.getTime() - 86_400_000);
			const data = generator(start, end, rand);

			// Apply limit
			const limited = opts.limit ? data.slice(0, opts.limit) : data;

			await delay(50 + Math.random() * 100);
			return { samples: limited.map((p) => ({ ...p, dataType: opts.dataType }) as HealthSample) };
		}
	};
}

function hashString(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) {
		h = ((h << 5) - h + s.charCodeAt(i)) | 0;
	}
	return h;
}

/**
 * Returns the singleton mock health plugin instance.
 * Only call in dev mode.
 */
export function getMockHealthPlugin(): HealthPluginLike {
	if (!_instance) {
		_instance = createMockHealthPlugin();
	}
	return _instance;
}

// =====================================================
// Mock Signal Generator (for auto-inject in DEV)
// =====================================================

type SignalBucket = { log: string; history: any[]; values: Signal[] };

/**
 * Generate ready-to-use signal data in the exact format consumed by
 * `profile.health.signals`. Covers all 8 data types over 90 days,
 * deterministic (seeded PRNG) so the same data appears every reload.
 */
export function generateMockSignals(): Record<string, SignalBucket> {
	const SEED = 42;
	const endDate = new Date();
	const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

	const signals: Record<string, SignalBucket> = {};

	for (const [pluginType, generator] of Object.entries(GENERATORS)) {
		const typeSeed = SEED + hashString(pluginType);
		const rand = createPRNG(typeSeed);
		const rawPoints = generator(startDate, endDate, rand);

		// Normalize through the same pipeline as real sync
		let normalized = normalizeHealthData(rawPoints, pluginType, 'ios');
		if (shouldAggregate(pluginType)) {
			normalized = aggregateByHour(normalized);
		}

		for (const entry of normalized) {
			if (!signals[entry.signal]) {
				signals[entry.signal] = { log: 'full', history: [], values: [] };
			}
			signals[entry.signal].values.push({
				signal: entry.signal,
				value: entry.value,
				unit: entry.unit,
				date: entry.date,
				source: entry.source,
				reference: ''
			} as Signal);
		}
	}

	// Compute BMI from weight + height
	const weightVals = signals['weight']?.values;
	const heightVals = signals['height']?.values;
	if (weightVals?.length && heightVals?.length) {
		const latestWeight = weightVals[weightVals.length - 1];
		const latestHeight = heightVals[heightVals.length - 1];
		const bmi = computeBMI(latestWeight.value as number, latestHeight.value as number);
		signals['bmi'] = {
			log: 'full',
			history: [],
			values: [{
				signal: 'bmi',
				value: bmi,
				unit: 'kg/m²',
				date: latestWeight.date,
				source: latestWeight.source,
				reference: ''
			} as Signal]
		};
	}

	// Sort all values newest-first
	for (const key of Object.keys(signals)) {
		signals[key].values.sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
		);
	}

	return signals;
}
