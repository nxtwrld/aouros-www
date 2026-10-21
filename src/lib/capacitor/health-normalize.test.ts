import { describe, it, expect } from "vitest";
import {
  normalizeHealthData,
  aggregateByHour,
  shouldAggregate,
  computeBMI,
  type PluginDataPoint,
} from "./health-normalize";

function sample(
  startDate: string,
  value: number,
  unit: string,
  extra: Partial<PluginDataPoint> = {},
): PluginDataPoint {
  return { startDate, endDate: startDate, value, unit, ...extra };
}

describe("normalizeHealthData", () => {
  it("splits blood pressure into systolic and diastolic signals", () => {
    const result = normalizeHealthData(
      [
        sample("2026-01-01T08:00:00.000Z", 120, "mmHg", {
          systolic: 120,
          diastolic: 80,
        }),
      ],
      "bloodPressure",
      "ios",
    );

    expect(result).toEqual([
      {
        signal: "systolic",
        value: 120,
        unit: "mmHg",
        date: "2026-01-01T08:00:00.000Z",
        source: "healthkit",
      },
      {
        signal: "diastolic",
        value: 80,
        unit: "mmHg",
        date: "2026-01-01T08:00:00.000Z",
        source: "healthkit",
      },
    ]);
  });

  it("passes height through in centimetres", () => {
    const [entry] = normalizeHealthData(
      [sample("2026-01-01T12:00:00.000Z", 178, "centimeter")],
      "height",
      "android",
    );
    expect(entry).toMatchObject({
      signal: "height",
      value: 178,
      unit: "cm",
      source: "health_connect",
    });
  });

  it("keeps blood glucose in mg/dL on both platforms", () => {
    for (const platform of ["ios", "android"] as const) {
      const [entry] = normalizeHealthData(
        [sample("2026-01-01T07:00:00.000Z", 95, "mg/dL")],
        "bloodGlucose",
        platform,
      );
      expect(entry).toMatchObject({
        signal: "blood_sugar",
        value: 95,
        unit: "mg/dL",
      });
    }
  });

  it("maps body fat and HRV to our signal names", () => {
    expect(
      normalizeHealthData(
        [sample("2026-01-01T07:00:00.000Z", 21.5, "percent")],
        "bodyFat",
        "ios",
      )[0],
    ).toMatchObject({ signal: "body_fat_percentage", value: 21.5, unit: "%" });
    expect(
      normalizeHealthData(
        [sample("2026-01-01T07:00:00.000Z", 42, "millisecond")],
        "heartRateVariability",
        "ios",
      )[0],
    ).toMatchObject({ signal: "heart_rate_variability", value: 42, unit: "ms" });
  });

  it("returns nothing for unmapped data types", () => {
    expect(
      normalizeHealthData(
        [sample("2026-01-01T07:00:00.000Z", 1000, "count")],
        "steps",
        "ios",
      ),
    ).toEqual([]);
  });
});

describe("heart rate aggregation", () => {
  it("only aggregates heart rate", () => {
    expect(shouldAggregate("heartRate")).toBe(true);
    expect(shouldAggregate("weight")).toBe(false);
  });

  it("averages readings within the same hour", () => {
    const entries = normalizeHealthData(
      [
        sample("2026-01-01T10:05:00.000Z", 60, "bpm"),
        sample("2026-01-01T10:35:00.000Z", 80, "bpm"),
        sample("2026-01-01T11:10:00.000Z", 70, "bpm"),
      ],
      "heartRate",
      "ios",
    );
    const aggregated = aggregateByHour(entries);
    expect(aggregated.map((e) => e.value).sort()).toEqual([70, 70]);
    expect(aggregated).toHaveLength(2);
  });
});

describe("computeBMI", () => {
  it("computes BMI from kg and cm", () => {
    expect(computeBMI(78, 178)).toBe(24.62);
  });
});
