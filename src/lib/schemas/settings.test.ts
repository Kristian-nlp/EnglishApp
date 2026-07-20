import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  settingsPatchSchema,
  settingsSchema,
} from "./settings";

describe("settingsSchema (FR-1000)", () => {
  it("accepts the defaults", () => {
    expect(() => settingsSchema.parse(DEFAULT_SETTINGS)).not.toThrow();
  });

  it("rejects speaking speed out of range (FR-1001)", () => {
    expect(() =>
      settingsSchema.parse({ ...DEFAULT_SETTINGS, speakingSpeed: 0.4 }),
    ).toThrow();
    expect(() =>
      settingsSchema.parse({ ...DEFAULT_SETTINGS, speakingSpeed: 2.1 }),
    ).toThrow();
  });

  it("rejects silence threshold out of range (FR-404)", () => {
    expect(() =>
      settingsSchema.parse({ ...DEFAULT_SETTINGS, silenceThresholdMs: 1000 }),
    ).toThrow();
    expect(() =>
      settingsSchema.parse({ ...DEFAULT_SETTINGS, silenceThresholdMs: 9000 }),
    ).toThrow();
  });

  it("rejects unknown accents/voices", () => {
    expect(() =>
      settingsSchema.parse({ ...DEFAULT_SETTINGS, accent: "en-AU" }),
    ).toThrow();
  });

  it("allows reminderHour null (off) and 0..23", () => {
    expect(() =>
      settingsSchema.parse({ ...DEFAULT_SETTINGS, reminderHour: null }),
    ).not.toThrow();
    expect(() =>
      settingsSchema.parse({ ...DEFAULT_SETTINGS, reminderHour: 23 }),
    ).not.toThrow();
    expect(() =>
      settingsSchema.parse({ ...DEFAULT_SETTINGS, reminderHour: 24 }),
    ).toThrow();
  });
});

describe("settingsPatchSchema (FR-109)", () => {
  it("accepts a partial patch", () => {
    expect(() => settingsPatchSchema.parse({ voice: "male" })).not.toThrow();
    expect(() => settingsPatchSchema.parse({})).not.toThrow();
  });

  it("still range-validates provided fields", () => {
    expect(() => settingsPatchSchema.parse({ speakingSpeed: 3 })).toThrow();
  });

  it("rejects unknown keys (no silent passthrough)", () => {
    expect(() =>
      settingsPatchSchema.parse({ isAdmin: true }),
    ).toThrow();
  });
});
