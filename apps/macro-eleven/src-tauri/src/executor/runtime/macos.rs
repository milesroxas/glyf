use std::process::Command;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use core_graphics::event::{CGEvent, CGEventFlags, CGEventTapLocation, CGKeyCode};
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

use super::{
    shortcuts::SpecialKey, KeyChord, ModifierKey, PlatformRuntime, PrimaryKey, ShortcutSequence,
};
use crate::executor::permissions::{accessibility_trusted, ACCESSIBILITY_REQUIRED};

/// Pause between chords of a sequence, so apps see them as separate presses.
const CHORD_GAP: Duration = Duration::from_millis(35);

/// US ANSI virtual keycodes: (character, shifted character, keycode).
const CHARACTER_KEYS: &[(char, char, CGKeyCode)] = &[
    ('a', 'A', 0),
    ('s', 'S', 1),
    ('d', 'D', 2),
    ('f', 'F', 3),
    ('h', 'H', 4),
    ('g', 'G', 5),
    ('z', 'Z', 6),
    ('x', 'X', 7),
    ('c', 'C', 8),
    ('v', 'V', 9),
    ('b', 'B', 11),
    ('q', 'Q', 12),
    ('w', 'W', 13),
    ('e', 'E', 14),
    ('r', 'R', 15),
    ('y', 'Y', 16),
    ('t', 'T', 17),
    ('1', '!', 18),
    ('2', '@', 19),
    ('3', '#', 20),
    ('4', '$', 21),
    ('6', '^', 22),
    ('5', '%', 23),
    ('=', '+', 24),
    ('9', '(', 25),
    ('7', '&', 26),
    ('-', '_', 27),
    ('8', '*', 28),
    ('0', ')', 29),
    (']', '}', 30),
    ('o', 'O', 31),
    ('u', 'U', 32),
    ('[', '{', 33),
    ('i', 'I', 34),
    ('p', 'P', 35),
    ('l', 'L', 37),
    ('j', 'J', 38),
    ('\'', '"', 39),
    ('k', 'K', 40),
    (';', ':', 41),
    ('\\', '|', 42),
    (',', '<', 43),
    ('/', '?', 44),
    ('n', 'N', 45),
    ('m', 'M', 46),
    ('.', '>', 47),
    ('`', '~', 50),
];

const FUNCTION_KEYS: [CGKeyCode; 12] = [122, 120, 99, 118, 96, 97, 98, 100, 101, 109, 103, 111];

#[derive(Clone, Copy)]
struct KeyMapping {
    keycode: CGKeyCode,
    requires_shift: bool,
}

pub struct MacRuntime {
    /// Modifiers held by a macro's `keydown` steps. Every posted event
    /// carries them, so `keydown cmd` + `keypress c` sends ⌘C.
    held: Mutex<CGEventFlags>,
}

impl MacRuntime {
    pub fn new() -> Self {
        Self {
            held: Mutex::new(CGEventFlags::empty()),
        }
    }

    fn held(&self) -> CGEventFlags {
        *self.held.lock().unwrap_or_else(|p| p.into_inner())
    }

    /// macOS drops synthetic key events from untrusted apps without an error,
    /// so check first and say what to do.
    fn require_accessibility() -> Result<(), String> {
        if accessibility_trusted() {
            Ok(())
        } else {
            Err(ACCESSIBILITY_REQUIRED.to_string())
        }
    }

    fn post(keycode: CGKeyCode, down: bool, flags: CGEventFlags) -> Result<(), String> {
        Self::post_with(keycode, down, flags, |_| {})
    }

    fn post_with(
        keycode: CGKeyCode,
        down: bool,
        flags: CGEventFlags,
        configure: impl FnOnce(&CGEvent),
    ) -> Result<(), String> {
        let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState)
            .map_err(|_| "Could not create a keyboard event source".to_string())?;
        let event = CGEvent::new_keyboard_event(source, keycode, down)
            .map_err(|_| "Could not create a keyboard event".to_string())?;
        event.set_flags(flags);
        configure(&event);
        event.post(CGEventTapLocation::HID);
        Ok(())
    }

    fn key_flags(&self, mapping: KeyMapping, chord: CGEventFlags) -> CGEventFlags {
        let mut flags = self.held() | chord;
        if mapping.requires_shift {
            flags.insert(CGEventFlags::CGEventFlagShift);
        }
        flags
    }

    fn send_chord(&self, chord: &KeyChord) -> Result<(), String> {
        let mapping = Self::mapping_for_primary(&chord.primary)?;
        let chord_flags = chord
            .modifiers
            .iter()
            .fold(CGEventFlags::empty(), |flags, m| flags | Self::flag_for_modifier(*m));
        let flags = self.key_flags(mapping, chord_flags);
        Self::post(mapping.keycode, true, flags)?;
        Self::post(mapping.keycode, false, flags)
    }

    fn post_key(&self, key: &PrimaryKey, down: bool) -> Result<(), String> {
        Self::require_accessibility()?;
        let mapping = Self::mapping_for_primary(key)?;
        Self::post(mapping.keycode, down, self.key_flags(mapping, CGEventFlags::empty()))
    }

    fn mapping_for_primary(primary: &PrimaryKey) -> Result<KeyMapping, String> {
        match primary {
            PrimaryKey::Character(value) => {
                let mut chars = value.chars();
                match (chars.next(), chars.next()) {
                    (Some(ch), None) => Self::mapping_for_char(ch),
                    _ => Err("Shortcut keys must be a single character".to_string()),
                }
            }
            PrimaryKey::Special(special) => Self::mapping_for_special(*special),
        }
    }

    fn mapping_for_char(ch: char) -> Result<KeyMapping, String> {
        CHARACTER_KEYS
            .iter()
            .find(|(plain, shifted, _)| *plain == ch || *shifted == ch)
            .map(|&(_, shifted, keycode)| KeyMapping {
                keycode,
                requires_shift: ch == shifted,
            })
            .ok_or_else(|| format!("Unsupported key '{ch}' in shortcut"))
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
            SpecialKey::Function(n) => *n
                .checked_sub(1)
                .and_then(|i| FUNCTION_KEYS.get(usize::from(i)))
                .ok_or_else(|| format!("Unsupported function key: F{n}"))?,
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
            ModifierKey::Option => CGEventFlags::CGEventFlagAlternate,
            ModifierKey::Shift => CGEventFlags::CGEventFlagShift,
        }
    }

    fn modifier_keycode(modifier: ModifierKey) -> CGKeyCode {
        match modifier {
            ModifierKey::Command => 55,
            ModifierKey::Control => 59,
            ModifierKey::Option => 58,
            ModifierKey::Shift => 56,
        }
    }

    /// Hold or release a modifier. Release always clears the flag, even if
    /// posting fails; hold records it only once the key-down was posted. So a
    /// failure can never leave a modifier applied to later keystrokes.
    fn set_modifier(&self, modifier: ModifierKey, down: bool) -> Result<(), String> {
        let flag = Self::flag_for_modifier(modifier);
        let mut held = self.held.lock().unwrap_or_else(|p| p.into_inner());
        let mut flags = *held;
        flags.set(flag, down);
        if !down {
            *held = flags;
        }
        Self::require_accessibility()?;
        Self::post(Self::modifier_keycode(modifier), down, flags)?;
        *held = flags;
        Ok(())
    }

    fn open(args: &[&str]) -> bool {
        Command::new("open")
            .args(args)
            .output()
            .is_ok_and(|output| output.status.success())
    }
}

impl PlatformRuntime for MacRuntime {
    fn launch_app(&self, name: &str, bundle_id: Option<&str>, focus: bool) -> Result<(), String> {
        // `open` needs no Automation permission, unlike AppleScript. `-g`
        // opens the app without bringing it to the front.
        let background: &[&str] = if focus { &[] } else { &["-g"] };
        let opened = bundle_id.is_some_and(|id| Self::open(&[background, &["-b", id]].concat()))
            || Self::open(&[background, &["-a", name]].concat());
        if opened {
            Ok(())
        } else {
            Err(format!("Could not open {name}. Check that it is installed."))
        }
    }

    fn send_shortcut(&self, sequence: &ShortcutSequence) -> Result<(), String> {
        Self::require_accessibility()?;
        for (i, chord) in sequence.chords.iter().enumerate() {
            if i > 0 {
                thread::sleep(CHORD_GAP);
            }
            self.send_chord(chord)?;
        }
        Ok(())
    }

    /// Types each character as a Unicode string event, so text does not
    /// depend on the keyboard layout and non-ASCII characters work.
    fn type_text(&self, text: &str) -> Result<(), String> {
        Self::require_accessibility()?;
        let flags = self.held();
        let mut buf = [0u8; 4];
        for ch in text.chars() {
            let s: &str = ch.encode_utf8(&mut buf);
            for down in [true, false] {
                Self::post_with(0, down, flags, |event| event.set_string(s))?;
            }
        }
        Ok(())
    }

    fn key_press(&self, key: &PrimaryKey) -> Result<(), String> {
        self.post_key(key, true)?;
        self.post_key(key, false)
    }

    fn key_down(&self, key: &PrimaryKey) -> Result<(), String> {
        self.post_key(key, true)
    }

    fn key_up(&self, key: &PrimaryKey) -> Result<(), String> {
        self.post_key(key, false)
    }

    fn modifier_down(&self, modifier: ModifierKey) -> Result<(), String> {
        self.set_modifier(modifier, true)
    }

    fn modifier_up(&self, modifier: ModifierKey) -> Result<(), String> {
        self.set_modifier(modifier, false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::tokens;

    #[test]
    fn maps_every_shared_key_token() {
        for name in tokens::table().key_names() {
            let key = PrimaryKey::from_token(name).unwrap();
            assert!(MacRuntime::mapping_for_primary(&key).is_ok(), "no keycode for {name}");
        }
    }

    #[test]
    fn shifted_characters_add_shift() {
        let plus = MacRuntime::mapping_for_char('+').unwrap();
        assert_eq!(plus.keycode, 24);
        assert!(plus.requires_shift);
        assert!(!MacRuntime::mapping_for_char('=').unwrap().requires_shift);
    }
}
