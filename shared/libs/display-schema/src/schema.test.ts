import { describe, expect, it } from "vitest";
import {
  DEFAULT_DISPLAY_CONFIG,
  DEFAULT_GLYF_CONFIG,
  DEFAULT_TOUCH_CALIBRATION,
  DISPLAY_HEIGHT,
  DISPLAY_WIDTH,
  GLYF_PRODUCT_ID,
  GLYF_USAGE_PAGE,
  GLYF_VENDOR_ID,
  TOUCH_MAX_X,
  TOUCH_MAX_Y,
} from "./types";

describe("display schema domain constants", () => {
  it("uses ST7796 panel geometry", () => {
    expect(DISPLAY_WIDTH).toBe(480);
    expect(DISPLAY_HEIGHT).toBe(320);
  });

  it("uses 12-bit touch ADC range", () => {
    expect(TOUCH_MAX_X).toBe(4095);
    expect(TOUCH_MAX_Y).toBe(4095);
  });

  it("exposes USB identity aligned with firmware", () => {
    expect(GLYF_VENDOR_ID).toBe(0x4653);
    expect(GLYF_PRODUCT_ID).toBe(0x0003);
    expect(GLYF_USAGE_PAGE).toBe(0xff60);
  });

  it("defaults match persisted config shape", () => {
    expect(DEFAULT_DISPLAY_CONFIG.brightness).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_DISPLAY_CONFIG.brightness).toBeLessThanOrEqual(255);
    expect(DEFAULT_TOUCH_CALIBRATION.xMin).toBeLessThan(
      DEFAULT_TOUCH_CALIBRATION.xMax
    );
    expect(DEFAULT_GLYF_CONFIG.display).toEqual(DEFAULT_DISPLAY_CONFIG);
    expect(DEFAULT_GLYF_CONFIG.touch).toEqual(DEFAULT_TOUCH_CALIBRATION);
  });
});
