//! Shortcut token parsing. The vocabulary is `tokens.json` in
//! `@glyf/keymap-schema`; the parity test below keeps this parser in step.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ModifierKey {
    Command,
    Control,
    Option,
    Shift,
}

impl ModifierKey {
    pub fn from_token(token: &str) -> Option<Self> {
        match token.trim().to_lowercase().as_str() {
            "cmd" | "command" | "meta" | "super" => Some(Self::Command),
            "ctrl" | "control" => Some(Self::Control),
            "option" | "opt" | "alt" => Some(Self::Option),
            "shift" => Some(Self::Shift),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpecialKey {
    Enter,
    Tab,
    Escape,
    Space,
    Backspace,
    Delete,
    Left,
    Right,
    Up,
    Down,
    Home,
    End,
    PageUp,
    PageDown,
    Function(u8),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PrimaryKey {
    Character(String),
    Special(SpecialKey),
}

impl PrimaryKey {
    pub fn from_token(token: &str) -> Result<Self, String> {
        let token = token.trim();
        if token.is_empty() {
            return Err("Shortcut key cannot be empty".to_string());
        }

        if token.chars().count() == 1 {
            return Ok(Self::Character(token.to_string()));
        }

        let lower = token.to_lowercase();
        let special = match lower.as_str() {
            "enter" | "return" => SpecialKey::Enter,
            "tab" => SpecialKey::Tab,
            "esc" | "escape" => SpecialKey::Escape,
            "space" | "spacebar" => SpecialKey::Space,
            "bksp" | "backspace" => SpecialKey::Backspace,
            "delete" | "del" => SpecialKey::Delete,
            "left" => SpecialKey::Left,
            "right" => SpecialKey::Right,
            "up" => SpecialKey::Up,
            "down" => SpecialKey::Down,
            "home" => SpecialKey::Home,
            "end" => SpecialKey::End,
            "pageup" | "pgup" => SpecialKey::PageUp,
            "pagedown" | "pgdn" => SpecialKey::PageDown,
            _ => {
                let number = lower
                    .strip_prefix('f')
                    .and_then(|n| n.parse::<u8>().ok())
                    .ok_or_else(|| format!("Unknown key token: {token}"))?;
                SpecialKey::Function(number)
            }
        };

        Ok(Self::Special(special))
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KeyChord {
    pub modifiers: Vec<ModifierKey>,
    pub primary: PrimaryKey,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ShortcutSequence {
    pub chords: Vec<KeyChord>,
}

impl ShortcutSequence {
    /// Modifiers followed by one key make a chord; several chords make a
    /// sequence (`cmd k cmd s` is ⌘K then ⌘S).
    pub fn from_keys(keys: &[String]) -> Result<Self, String> {
        let mut chords = Vec::new();
        let mut pending_modifiers: Vec<ModifierKey> = Vec::new();

        for raw in keys {
            let token = raw.trim();
            if token.is_empty() {
                continue;
            }

            if let Some(modifier) = ModifierKey::from_token(token) {
                pending_modifiers.push(modifier);
                continue;
            }

            let primary = PrimaryKey::from_token(token)?;
            chords.push(KeyChord {
                modifiers: std::mem::take(&mut pending_modifiers),
                primary,
            });
        }

        if chords.is_empty() {
            return Err("Shortcut must include at least one key".to_string());
        }

        if !pending_modifiers.is_empty() {
            return Err("Shortcut ended with modifiers but no key".to_string());
        }

        Ok(Self { chords })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::tokens;

    fn keys(tokens: &[&str]) -> Vec<String> {
        tokens.iter().map(|t| t.to_string()).collect()
    }

    #[test]
    fn accepts_every_shared_token() {
        let table = tokens::table();
        for name in table.modifier_names() {
            assert!(ModifierKey::from_token(name).is_some(), "modifier {name}");
        }
        for name in table.key_names() {
            assert!(ModifierKey::from_token(name).is_none(), "{name} is not a modifier");
            assert!(PrimaryKey::from_token(name).is_ok(), "key {name}");
        }
    }

    #[test]
    fn groups_modifiers_into_chords() {
        let sequence = ShortcutSequence::from_keys(&keys(&["cmd", "k", "shift", "cmd", "s"])).unwrap();
        assert_eq!(
            sequence.chords,
            vec![
                KeyChord {
                    modifiers: vec![ModifierKey::Command],
                    primary: PrimaryKey::Character("k".into()),
                },
                KeyChord {
                    modifiers: vec![ModifierKey::Shift, ModifierKey::Command],
                    primary: PrimaryKey::Character("s".into()),
                },
            ]
        );
    }

    #[test]
    fn parses_function_and_named_keys() {
        assert_eq!(
            PrimaryKey::from_token("F12"),
            Ok(PrimaryKey::Special(SpecialKey::Function(12)))
        );
        assert_eq!(
            PrimaryKey::from_token("Return"),
            Ok(PrimaryKey::Special(SpecialKey::Enter))
        );
        assert!(PrimaryKey::from_token("hyper").is_err());
        assert!(PrimaryKey::from_token("f").is_ok(), "a single letter is a character");
    }

    #[test]
    fn rejects_incomplete_shortcuts() {
        assert!(ShortcutSequence::from_keys(&[]).is_err());
        assert!(ShortcutSequence::from_keys(&keys(&["cmd"])).is_err());
        assert!(ShortcutSequence::from_keys(&keys(&["cmd", "k", "cmd"])).is_err());
    }
}
