/**
 * Display Schema - Single Source of Truth
 *
 * Defines all types for glyf TFT display devices in the monorepo.
 * Used by companion apps (TypeScript) and mirrored in firmware host (Rust).
 *
 * Hardware: ST7796S 480x320 SPI TFT + XPT2046 resistive touch
 */

// ============================================================================
// Hardware Constants
// ============================================================================

export const DISPLAY_WIDTH = 480;
export const DISPLAY_HEIGHT = 320;
export const TOUCH_MAX_X = 4095; // XPT2046 12-bit ADC
export const TOUCH_MAX_Y = 4095;

// ============================================================================
// Display Types
// ============================================================================

export type DisplayOrientation = 'landscape' | 'portrait' | 'landscape_flip' | 'portrait_flip';

export type ColorDepth = 16 | 18; // ST7796S supports 16-bit (RGB565) and 18-bit (RGB666)

/**
 * Display configuration stored on disk and sent to device
 */
export interface DisplayConfig {
  /** Backlight brightness 0–255 */
  brightness: number;
  /** Screen rotation */
  orientation: DisplayOrientation;
  /** Color depth mode */
  colorDepth: ColorDepth;
  /** Power saving: turn off display after idle ms (0 = never) */
  sleepAfterMs: number;
}

/**
 * Runtime display state emitted from the device
 */
export interface DisplayState {
  /** Whether the display is powered on */
  on: boolean;
  /** Current backlight brightness 0–255 */
  brightness: number;
  /** Current orientation applied on device */
  orientation: DisplayOrientation;
}

// ============================================================================
// Touch Types
// ============================================================================

/**
 * A single touch contact point in raw ADC coordinates (0–4095)
 */
export interface RawTouchPoint {
  x: number; // XPT2046 raw X ADC (0–4095)
  y: number; // XPT2046 raw Y ADC (0–4095)
  z: number; // XPT2046 pressure (0–4095)
}

/**
 * Touch point normalised to display pixels
 */
export interface TouchPoint {
  /** Pixel X within display width (0–479) */
  x: number;
  /** Pixel Y within display height (0–319) */
  y: number;
  /** Normalised pressure 0.0–1.0 */
  pressure: number;
  /** Whether contact is active */
  pressed: boolean;
  timestamp: number;
}

/**
 * Touch calibration mapping raw ADC → pixels
 */
export interface TouchCalibration {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  swapAxes: boolean;
  invertX: boolean;
  invertY: boolean;
}

export const DEFAULT_TOUCH_CALIBRATION: TouchCalibration = {
  xMin: 200,
  xMax: 3900,
  yMin: 200,
  yMax: 3900,
  swapAxes: false,
  invertX: false,
  invertY: false,
};

// ============================================================================
// Device Types
// ============================================================================

export const GLYF_VENDOR_ID = 0x4653;
export const GLYF_PRODUCT_ID = 0x0003;
export const GLYF_USAGE_PAGE = 0xff60; // QMK Raw HID

/**
 * Full device configuration persisted to disk
 */
export interface GlyfConfig {
  version: string;
  name: string;
  display: DisplayConfig;
  touch: TouchCalibration;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
  };
}

export const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  brightness: 200,
  orientation: 'landscape',
  colorDepth: 16,
  sleepAfterMs: 0,
};

export const DEFAULT_GLYF_CONFIG: GlyfConfig = {
  version: '1.0.0',
  name: 'default',
  display: DEFAULT_DISPLAY_CONFIG,
  touch: DEFAULT_TOUCH_CALIBRATION,
};

// ============================================================================
// HID Protocol Types (host ↔ device)
// ============================================================================

/**
 * Raw HID state report parsed from device
 */
export interface DeviceStateReport {
  brightness: number;
  displayOn: boolean;
  touchPressed: boolean;
  touchX: number; // raw ADC 0–4095
  touchY: number; // raw ADC 0–4095
  touchZ: number; // raw ADC pressure 0–4095
}

// ============================================================================
// Runtime Event Types (Tauri → Frontend)
// ============================================================================

export interface DisplayStateEvent {
  on: boolean;
  brightness: number;
}

export interface TouchEvent {
  pressed: boolean;
  x: number; // normalised pixel X
  y: number; // normalised pixel Y
  pressure: number;
  timestamp: number;
}

export interface DeviceStatusEvent {
  connected: boolean;
}
