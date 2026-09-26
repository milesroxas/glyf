//! The shortcut that shows or hides the overlay from any app. It is stored
//! as shortcut tokens (`["option", "cmd", "o"]`), the same vocabulary the
//! designer records, and registered system-wide.

use tauri::AppHandle;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use crate::config::tokens;

/// Tokens as a system-wide shortcut. It needs a modifier, except for the
/// function keys, so it cannot swallow ordinary typing.
pub fn parse(keys: &[String]) -> Result<Shortcut, String> {
    let mut modifiers = Modifiers::empty();
    let mut key: Option<Code> = None;
    for token in keys {
        match tokens::canonical(token).as_deref() {
            Some("cmd") => modifiers |= Modifiers::SUPER,
            Some("option") => modifiers |= Modifiers::ALT,
            Some("ctrl") => modifiers |= Modifiers::CONTROL,
            Some("shift") => modifiers |= Modifiers::SHIFT,
            Some(_) if key.is_some() => return Err("Use one key with modifiers.".into()),
            Some(name) => {
                let code = tokens::dom_code(name)
                    .and_then(|code| code.parse::<Code>().ok())
                    .ok_or_else(|| format!("{name} cannot be a shortcut"))?;
                key = Some(code);
            }
            None => return Err(format!("{token} is not a key")),
        }
    }
    let key = key.ok_or("Add a key to the modifiers.")?;
    let function_key = matches!(
        key,
        Code::F1 | Code::F2 | Code::F3 | Code::F4 | Code::F5 | Code::F6 | Code::F7 | Code::F8
            | Code::F9 | Code::F10 | Code::F11 | Code::F12
    );
    let typing_modifiers = Modifiers::SUPER | Modifiers::ALT | Modifiers::CONTROL;
    if !function_key && !modifiers.intersects(typing_modifiers) {
        return Err("Include ⌘, ⌥, or ⌃, so the shortcut doesn’t take over typing.".into());
    }
    Ok(Shortcut::new(Some(modifiers), key))
}

/// Swap the registered shortcut from `old` to `new`. If `new` cannot be
/// registered (another app holds it), `old` stays in place.
pub fn replace(app: &AppHandle, old: &[String], new: &[String]) -> Result<(), String> {
    let shortcuts = app.global_shortcut();
    let next = if new.is_empty() { None } else { Some(parse(new)?) };
    if let Ok(previous) = parse(old) {
        let _ = shortcuts.unregister(previous);
    }
    let Some(next) = next else {
        return Ok(());
    };
    if let Err(e) = shortcuts.register(next) {
        if let Ok(previous) = parse(old) {
            let _ = shortcuts.register(previous);
        }
        eprintln!("Could not register the overlay shortcut: {e}");
        return Err("Another app uses that shortcut. Try a different one.".into());
    }
    Ok(())
}

/// While Settings records a new shortcut, the saved one must not fire (it
/// would toggle the overlay instead of reaching the recorder).
pub fn pause(app: &AppHandle, keys: &[String], paused: bool) {
    let Ok(shortcut) = parse(keys) else {
        return;
    };
    let shortcuts = app.global_shortcut();
    if paused {
        let _ = shortcuts.unregister(shortcut);
    } else if !shortcuts.is_registered(shortcut) {
        let _ = shortcuts.register(shortcut);
    }
}

/// Register the saved shortcut at launch.
pub fn register_saved(app: &AppHandle, keys: &[String]) {
    if keys.is_empty() {
        return;
    }
    if let Err(e) = replace(app, &[], keys) {
        eprintln!("{e}");
    }
}

/// The handler for every registered shortcut: there is one, the overlay's.
pub fn plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                super::overlay::toggle(app);
            }
        })
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn keys(tokens: &[&str]) -> Vec<String> {
        tokens.iter().map(|t| t.to_string()).collect()
    }

    #[test]
    fn modifiers_and_a_key_make_a_shortcut() {
        let shortcut = parse(&keys(&["option", "cmd", "o"])).unwrap();
        assert_eq!(shortcut, Shortcut::new(Some(Modifiers::ALT | Modifiers::SUPER), Code::KeyO));
    }

    #[test]
    fn aliases_and_case_are_accepted() {
        let shortcut = parse(&keys(&["Command", "alt", "F5"])).unwrap();
        assert_eq!(shortcut, Shortcut::new(Some(Modifiers::ALT | Modifiers::SUPER), Code::F5));
    }

    #[test]
    fn function_keys_work_alone() {
        assert_eq!(parse(&keys(&["f6"])).unwrap(), Shortcut::new(None, Code::F6));
    }

    #[test]
    fn ordinary_typing_is_refused() {
        assert!(parse(&keys(&["o"])).is_err());
        assert!(parse(&keys(&["shift", "o"])).is_err());
    }

    #[test]
    fn incomplete_or_unknown_input_is_refused() {
        assert!(parse(&keys(&["cmd", "shift"])).is_err());
        assert!(parse(&keys(&["cmd", "a", "b"])).is_err());
        assert!(parse(&keys(&["cmd", "nope"])).is_err());
    }
}
