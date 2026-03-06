use regex::Regex;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct LayerData {
    pub index: usize,
    pub name: String,
    pub keys: Vec<String>,
}

/// Parse a keymap.c file and extract layer data.
/// Looks for block comments like `/* Layer N (Name) */` followed by `[N] = LAYOUT(...)`.
pub fn parse_keymap(source: &str) -> Vec<LayerData> {
    let mut layers = Vec::new();

    // Match layer comment + LAYOUT block pairs
    let comment_re = Regex::new(r#"/\*\s*\n?\s*\*\s*Layer\s+(\d+)\s*\(([^)]+)\)"#).unwrap();
    let layout_re = Regex::new(r#"\[(\d+)\]\s*=\s*LAYOUT\(\s*\n?([\s\S]*?)\)"#).unwrap();

    // Collect layer names from comments
    let mut layer_names: std::collections::HashMap<usize, String> =
        std::collections::HashMap::new();
    for cap in comment_re.captures_iter(source) {
        let idx: usize = cap[1].parse().unwrap_or(0);
        let name = cap[2].trim().to_string();
        layer_names.insert(idx, name);
    }

    // Extract LAYOUT blocks
    for cap in layout_re.captures_iter(source) {
        let idx: usize = cap[1].parse().unwrap_or(0);
        let body = &cap[2];

        let keys: Vec<String> = body
            .split(',')
            .map(|s| s.trim().lines().next().unwrap_or("").trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let name = layer_names
            .get(&idx)
            .cloned()
            .unwrap_or_else(|| format!("Layer {}", idx));

        layers.push(LayerData {
            index: idx,
            name,
            keys,
        });
    }

    layers.sort_by_key(|l| l.index);
    layers
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_basic() {
        let src = r#"
    /*
     * Layer 0 (App Selection)
     */
    [0] = LAYOUT(
        KC_A, KC_B, KC_C,
        KC_D, KC_E, KC_F, KC_G,
        KC_H, KC_I, KC_J, KC_K
    ),
"#;
        let layers = parse_keymap(src);
        assert_eq!(layers.len(), 1);
        assert_eq!(layers[0].name, "App Selection");
        assert_eq!(layers[0].keys.len(), 11);
    }
}
