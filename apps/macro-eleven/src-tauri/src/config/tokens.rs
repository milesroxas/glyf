//! The shared shortcut token vocabulary (`tokens.json`). Validation accepts
//! exactly these tokens so the designer and the host agree on what is valid.

use serde::Deserialize;
use std::collections::HashSet;
use std::sync::LazyLock;

const TOKENS_JSON: &str =
    include_str!("../../../../../shared/libs/keymap-schema/src/tokens.json");

#[derive(Debug, Deserialize)]
pub struct TokenEntry {
    pub token: String,
    pub aliases: Vec<String>,
    /// `KeyboardEvent.code` values, the first one canonical.
    #[serde(default)]
    pub codes: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct TokenTable {
    pub modifiers: Vec<TokenEntry>,
    pub keys: Vec<TokenEntry>,
}

impl TokenTable {
    fn names(entries: &[TokenEntry]) -> impl Iterator<Item = &str> {
        entries.iter().flat_map(|entry| {
            std::iter::once(entry.token.as_str()).chain(entry.aliases.iter().map(String::as_str))
        })
    }

    pub fn modifier_names(&self) -> impl Iterator<Item = &str> {
        Self::names(&self.modifiers)
    }

    pub fn key_names(&self) -> impl Iterator<Item = &str> {
        Self::names(&self.keys)
    }
}

static TABLE: LazyLock<TokenTable> = LazyLock::new(|| {
    serde_json::from_str(TOKENS_JSON).expect("bundled token table is valid JSON")
});

static KNOWN: LazyLock<HashSet<&'static str>> =
    LazyLock::new(|| TABLE.modifier_names().chain(TABLE.key_names()).collect());

#[cfg(test)]
pub fn table() -> &'static TokenTable {
    &TABLE
}

fn entry(token: &str) -> Option<&'static TokenEntry> {
    let token = token.trim();
    let multi = token.chars().count() > 1;
    TABLE.modifiers.iter().chain(&TABLE.keys).find(|entry| {
        std::iter::once(&entry.token)
            .chain(&entry.aliases)
            .any(|name| if multi { name.eq_ignore_ascii_case(token) } else { name == token })
    })
}

/// The canonical token for a token or alias (`command` → `cmd`).
pub fn canonical(token: &str) -> Option<String> {
    entry(token).map(|entry| entry.token.clone())
}

/// The key's `KeyboardEvent.code` (`o` → `KeyO`).
pub fn dom_code(token: &str) -> Option<&'static str> {
    entry(token)?.codes.first().map(String::as_str)
}

/// Multi-character names are case-insensitive; single characters are not.
pub fn is_known(token: &str) -> bool {
    let token = token.trim();
    if token.chars().count() > 1 {
        KNOWN.contains(token.to_lowercase().as_str())
    } else {
        KNOWN.contains(token)
    }
}
