use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ModifierKey {
    Command,
    Control,
    Alt,
    Option,
    Shift,
}

impl ModifierKey {
    pub fn from_token(token: &str) -> Option<Self> {
        match token.to_lowercase().as_str() {
            "cmd" | "command" | "meta" | "super" => Some(Self::Command),
            "ctrl" | "control" => Some(Self::Control),
            "alt" => Some(Self::Alt),
            "option" | "opt" => Some(Self::Option),
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
        if token.trim().is_empty() {
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
                if let Some(number) = lower.strip_prefix('f') {
                    let value: u8 = number
                        .parse()
                        .map_err(|_| format!("Unknown function key: {}", token))?;
                    SpecialKey::Function(value)
                } else {
                    return Err(format!("Unknown key token: {}", token));
                }
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
                modifiers: pending_modifiers.clone(),
                primary,
            });
            pending_modifiers.clear();
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

impl fmt::Display for ShortcutSequence {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let parts: Vec<String> = self
            .chords
            .iter()
            .map(|chord| {
                let mods: Vec<&'static str> = chord
                    .modifiers
                    .iter()
                    .map(|modifier| match modifier {
                        ModifierKey::Command => "cmd",
                        ModifierKey::Control => "ctrl",
                        ModifierKey::Alt => "alt",
                        ModifierKey::Option => "opt",
                        ModifierKey::Shift => "shift",
                    })
                    .collect();

                let primary = match &chord.primary {
                    PrimaryKey::Character(ch) => ch.clone(),
                    PrimaryKey::Special(SpecialKey::Function(n)) => format!("F{}", n),
                    PrimaryKey::Special(other) => format!("{:?}", other),
                };

                if mods.is_empty() {
                    primary
                } else {
                    format!("{}+{}", mods.join("+"), primary)
                }
            })
            .collect();

        write!(f, "{}", parts.join(" → "))
    }
}
