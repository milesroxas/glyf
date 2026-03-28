use serde::{Deserialize, Serialize};

/// Mirrors display-schema `DisplayOrientation`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DisplayOrientation {
    Landscape,
    Portrait,
    LandscapeFlip,
    PortraitFlip,
}

impl Default for DisplayOrientation {
    fn default() -> Self {
        Self::Landscape
    }
}

/// Mirrors display-schema `DisplayConfig`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayConfig {
    pub brightness: u8,
    pub orientation: DisplayOrientation,
    pub color_depth: u8,
    pub sleep_after_ms: u64,
}

impl Default for DisplayConfig {
    fn default() -> Self {
        Self {
            brightness: 200,
            orientation: DisplayOrientation::default(),
            color_depth: 16,
            sleep_after_ms: 0,
        }
    }
}

/// Mirrors display-schema `TouchCalibration`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TouchCalibration {
    pub x_min: u16,
    pub x_max: u16,
    pub y_min: u16,
    pub y_max: u16,
    pub swap_axes: bool,
    pub invert_x: bool,
    pub invert_y: bool,
}

impl Default for TouchCalibration {
    fn default() -> Self {
        Self {
            x_min: 200,
            x_max: 3900,
            y_min: 200,
            y_max: 3900,
            swap_axes: false,
            invert_x: false,
            invert_y: false,
        }
    }
}

/// Top-level config persisted to disk.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlyfConfig {
    pub version: String,
    pub name: String,
    pub display: DisplayConfig,
    pub touch: TouchCalibration,
}

impl Default for GlyfConfig {
    fn default() -> Self {
        Self {
            version: "1.0.0".into(),
            name: "default".into(),
            display: DisplayConfig::default(),
            touch: TouchCalibration::default(),
        }
    }
}
