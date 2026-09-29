//! What an `app_command` key asks of the app. A trait, so the engine never
//! reaches into the shell and tests can record the calls.

use crate::config::keymap::AppCommand;

pub trait AppControl: Send + Sync {
    fn run(&self, command: AppCommand) -> Result<(), String>;
}
