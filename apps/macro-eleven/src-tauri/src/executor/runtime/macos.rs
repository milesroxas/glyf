use std::process::Command;
use std::thread;
use std::time::Duration;

use core_graphics::event::{CGEvent, CGEventFlags, CGEventTapLocation, CGKeyCode};
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

use super::{
    shortcuts::SpecialKey, KeyChord, ModifierKey, PlatformRuntime, PrimaryKey, ShortcutSequence,
};

pub struct MacRuntime;

#[derive(Clone, Copy)]
struct KeyMapping {
    keycode: CGKeyCode,
    requires_shift: bool,
}

impl MacRuntime {
    pub fn new() -> Result<Self, String> {
        Ok(Self)
    }

    fn run_osascript(script: &str) -> Result<(), String> {
        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Failed to execute osascript: {}", e))?;

        if output.status.success() {
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let trimmed = stderr.trim();
            if trimmed.contains("Not authorized to send Apple events") {
                return Err(
                    "macOS blocked Macro Eleven from launching apps. Enable Macro Eleven under System Settings → Privacy & Security → Automation (System Events) and try again."
                        .to_string(),
                );
            }
            Err(format!("AppleScript error: {}", trimmed))
        }
    }

    fn new_source() -> Result<CGEventSource, String> {
        CGEventSource::new(CGEventSourceStateID::CombinedSessionState)
            .map_err(|e| format!("Failed to create CGEventSource: {:?}", e))
    }

    fn dispatch_sequence(&self, sequence: &ShortcutSequence) -> Result<(), String> {
        for chord in &sequence.chords {
            self.send_chord(chord)?;
            thread::sleep(Duration::from_millis(35));
        }
        Ok(())
    }

    fn send_chord(&self, chord: &KeyChord) -> Result<(), String> {
        let mapping = Self::mapping_for_primary(&chord.primary)?;
        let source = Self::new_source()?;
        let mut flags = CGEventFlags::empty();
        for modifier in &chord.modifiers {
            flags |= Self::flag_for_modifier(*modifier);
        }
        if mapping.requires_shift {
            flags.insert(CGEventFlags::CGEventFlagShift);
        }
        Self::post_key_event(&source, mapping.keycode, true, flags)?;
        Self::post_key_event(&source, mapping.keycode, false, flags)?;
        Ok(())
    }

    fn post_key_event(
        source: &CGEventSource,
        keycode: CGKeyCode,
        key_down: bool,
        flags: CGEventFlags,
    ) -> Result<(), String> {
        let event = CGEvent::new_keyboard_event(source.clone(), keycode, key_down)
            .map_err(|_| "Failed to create keyboard event".to_string())?;
        event.set_flags(flags);
        event.post(CGEventTapLocation::HID);
        Ok(())
    }

    fn mapping_for_primary(primary: &PrimaryKey) -> Result<KeyMapping, String> {
        match primary {
            PrimaryKey::Character(value) => {
                if value.chars().count() != 1 {
                    return Err("Shortcut keys must be a single character".to_string());
                }
                let ch = value.chars().next().unwrap();
                Self::mapping_for_char(ch)
            }
            PrimaryKey::Special(special) => Self::mapping_for_special(*special),
        }
    }

    fn mapping_for_char(ch: char) -> Result<KeyMapping, String> {
        fn entry(code: CGKeyCode) -> KeyMapping {
            KeyMapping {
                keycode: code,
                requires_shift: false,
            }
        }

        fn shifted(code: CGKeyCode) -> KeyMapping {
            KeyMapping {
                keycode: code,
                requires_shift: true,
            }
        }

        let mapping = match ch {
            'a' | 'A' => KeyMapping {
                keycode: 0,
                requires_shift: ch.is_uppercase(),
            },
            'b' | 'B' => KeyMapping {
                keycode: 11,
                requires_shift: ch.is_uppercase(),
            },
            'c' | 'C' => KeyMapping {
                keycode: 8,
                requires_shift: ch.is_uppercase(),
            },
            'd' | 'D' => KeyMapping {
                keycode: 2,
                requires_shift: ch.is_uppercase(),
            },
            'e' | 'E' => KeyMapping {
                keycode: 14,
                requires_shift: ch.is_uppercase(),
            },
            'f' | 'F' => KeyMapping {
                keycode: 3,
                requires_shift: ch.is_uppercase(),
            },
            'g' | 'G' => KeyMapping {
                keycode: 5,
                requires_shift: ch.is_uppercase(),
            },
            'h' | 'H' => KeyMapping {
                keycode: 4,
                requires_shift: ch.is_uppercase(),
            },
            'i' | 'I' => KeyMapping {
                keycode: 34,
                requires_shift: ch.is_uppercase(),
            },
            'j' | 'J' => KeyMapping {
                keycode: 38,
                requires_shift: ch.is_uppercase(),
            },
            'k' | 'K' => KeyMapping {
                keycode: 40,
                requires_shift: ch.is_uppercase(),
            },
            'l' | 'L' => KeyMapping {
                keycode: 37,
                requires_shift: ch.is_uppercase(),
            },
            'm' | 'M' => KeyMapping {
                keycode: 46,
                requires_shift: ch.is_uppercase(),
            },
            'n' | 'N' => KeyMapping {
                keycode: 45,
                requires_shift: ch.is_uppercase(),
            },
            'o' | 'O' => KeyMapping {
                keycode: 31,
                requires_shift: ch.is_uppercase(),
            },
            'p' | 'P' => KeyMapping {
                keycode: 35,
                requires_shift: ch.is_uppercase(),
            },
            'q' | 'Q' => KeyMapping {
                keycode: 12,
                requires_shift: ch.is_uppercase(),
            },
            'r' | 'R' => KeyMapping {
                keycode: 15,
                requires_shift: ch.is_uppercase(),
            },
            's' | 'S' => KeyMapping {
                keycode: 1,
                requires_shift: ch.is_uppercase(),
            },
            't' | 'T' => KeyMapping {
                keycode: 17,
                requires_shift: ch.is_uppercase(),
            },
            'u' | 'U' => KeyMapping {
                keycode: 32,
                requires_shift: ch.is_uppercase(),
            },
            'v' | 'V' => KeyMapping {
                keycode: 9,
                requires_shift: ch.is_uppercase(),
            },
            'w' | 'W' => KeyMapping {
                keycode: 13,
                requires_shift: ch.is_uppercase(),
            },
            'x' | 'X' => KeyMapping {
                keycode: 7,
                requires_shift: ch.is_uppercase(),
            },
            'y' | 'Y' => KeyMapping {
                keycode: 16,
                requires_shift: ch.is_uppercase(),
            },
            'z' | 'Z' => KeyMapping {
                keycode: 6,
                requires_shift: ch.is_uppercase(),
            },
            '1' => entry(18),
            '2' => entry(19),
            '3' => entry(20),
            '4' => entry(21),
            '5' => entry(23),
            '6' => entry(22),
            '7' => entry(26),
            '8' => entry(28),
            '9' => entry(25),
            '0' => entry(29),
            '!' => shifted(18),
            '@' => shifted(19),
            '#' => shifted(20),
            '$' => shifted(21),
            '%' => shifted(23),
            '^' => shifted(22),
            '&' => shifted(26),
            '*' => shifted(28),
            '(' => shifted(25),
            ')' => shifted(29),
            '-' => entry(27),
            '_' => shifted(27),
            '=' => entry(24),
            '+' => shifted(24),
            '[' => entry(33),
            '{' => shifted(33),
            ']' => entry(30),
            '}' => shifted(30),
            '\\' => entry(42),
            '|' => shifted(42),
            ';' => entry(41),
            ':' => shifted(41),
            '\'' => entry(39),
            '"' => shifted(39),
            ',' => entry(43),
            '<' => shifted(43),
            '.' => entry(47),
            '>' => shifted(47),
            '/' => entry(44),
            '?' => shifted(44),
            '`' => entry(50),
            '~' => shifted(50),
            ' ' => entry(49),
            '\n' => entry(36),
            '\t' => entry(48),
            _ => {
                return Err(format!(
                    "Unsupported character '{}' in shortcut or text",
                    ch
                ))
            }
        };
        Ok(mapping)
    }

    fn mapping_for_special(key: SpecialKey) -> Result<KeyMapping, String> {
        let keycode = match key {
            SpecialKey::Enter => 36,
            SpecialKey::Tab => 48,
            SpecialKey::Escape => 53,
            SpecialKey::Space => 49,
            SpecialKey::Backspace => 51,
            SpecialKey::Delete => 117,
            SpecialKey::Left => 123,
            SpecialKey::Right => 124,
            SpecialKey::Down => 125,
            SpecialKey::Up => 126,
            SpecialKey::Home => 115,
            SpecialKey::End => 119,
            SpecialKey::PageUp => 116,
            SpecialKey::PageDown => 121,
            SpecialKey::Function(n) => match n {
                1 => 122,
                2 => 120,
                3 => 99,
                4 => 118,
                5 => 96,
                6 => 97,
                7 => 98,
                8 => 100,
                9 => 101,
                10 => 109,
                11 => 103,
                12 => 111,
                _ => {
                    return Err(format!("Unsupported function key: F{}", n));
                }
            },
        };
        Ok(KeyMapping {
            keycode,
            requires_shift: false,
        })
    }

    fn flag_for_modifier(modifier: ModifierKey) -> CGEventFlags {
        match modifier {
            ModifierKey::Command => CGEventFlags::CGEventFlagCommand,
            ModifierKey::Control => CGEventFlags::CGEventFlagControl,
            ModifierKey::Alt | ModifierKey::Option => CGEventFlags::CGEventFlagAlternate,
            ModifierKey::Shift => CGEventFlags::CGEventFlagShift,
        }
    }

    fn modifier_keycode(modifier: ModifierKey) -> CGKeyCode {
        match modifier {
            ModifierKey::Command => 55,
            ModifierKey::Control => 59,
            ModifierKey::Alt | ModifierKey::Option => 58,
            ModifierKey::Shift => 56,
        }
    }
}

impl PlatformRuntime for MacRuntime {
    fn launch_app(&self, app: &str, focus_if_running: bool) -> Result<(), String> {
        let script = if focus_if_running {
            format!(r#"tell application "{}" to activate"#, app.replace('"', "\\\""))
        } else {
            format!(r#"tell application "{}" to launch"#, app.replace('"', "\\\""))
        };
        Self::run_osascript(&script)
    }

    fn send_shortcut(&self, sequence: &ShortcutSequence) -> Result<(), String> {
        self.dispatch_sequence(sequence)
    }

    fn type_text(&self, text: &str) -> Result<(), String> {
        for ch in text.chars() {
            let mapping = Self::mapping_for_char(ch)?;
            let source = Self::new_source()?;
            let mut flags = CGEventFlags::empty();
            if mapping.requires_shift {
                flags.insert(CGEventFlags::CGEventFlagShift);
            }
            Self::post_key_event(&source, mapping.keycode, true, flags)?;
            Self::post_key_event(&source, mapping.keycode, false, flags)?;
        }
        Ok(())
    }

    fn key_press(&self, key: &PrimaryKey) -> Result<(), String> {
        let mapping = Self::mapping_for_primary(key)?;
        let source = Self::new_source()?;
        let mut flags = CGEventFlags::empty();
        if mapping.requires_shift {
            flags.insert(CGEventFlags::CGEventFlagShift);
        }
        Self::post_key_event(&source, mapping.keycode, true, flags)?;
        Self::post_key_event(&source, mapping.keycode, false, flags)?;
        Ok(())
    }

    fn modifier_down(&self, modifier: ModifierKey) -> Result<(), String> {
        let source = Self::new_source()?;
        let flags = Self::flag_for_modifier(modifier);
        let keycode = Self::modifier_keycode(modifier);
        Self::post_key_event(&source, keycode, true, flags)
    }

    fn modifier_up(&self, modifier: ModifierKey) -> Result<(), String> {
        let source = Self::new_source()?;
        let flags = Self::flag_for_modifier(modifier);
        let keycode = Self::modifier_keycode(modifier);
        Self::post_key_event(&source, keycode, false, flags)
    }
}
