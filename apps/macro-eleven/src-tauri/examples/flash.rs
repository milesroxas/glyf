//! Flash a UF2 onto a connected Macro Eleven with no button presses, using
//! the same path as the app's "Update firmware" button. Used by build.sh.
//!
//!   cargo run --example flash -- path/to/firmware.uf2

use macro_eleven_lib::firmware::updater::{self, Stage};
use macro_eleven_lib::firmware::Firmware;
use std::process::exit;

fn describe(stage: Stage) -> &'static str {
    match stage {
        Stage::EnteringBootloader => "Rebooting into update mode",
        Stage::WaitingForBootloader => {
            "This firmware can't reboot itself. Hold the top-left key for 2 seconds"
        }
        Stage::Writing => "Writing firmware",
        Stage::Verifying => "Verifying",
        Stage::Restarting => "Restarting",
        Stage::Done => "Done",
    }
}

fn main() {
    let Some(path) = std::env::args().nth(1) else {
        eprintln!("Usage: cargo run --example flash -- <firmware.uf2>");
        exit(2);
    };

    let mut last_stage = None;
    let result = std::fs::read(&path)
        .map_err(|e| format!("Failed to read {path}: {e}"))
        .and_then(|uf2| Firmware::from_uf2(uf2, None))
        .and_then(|firmware| {
            updater::update_device(&firmware, &mut |stage, _| {
                if last_stage != Some(stage) {
                    println!("  {}...", describe(stage));
                    last_stage = Some(stage);
                }
            })
        });

    match result {
        Ok(info) => println!("✓ Macro Eleven is running firmware {}", info.version),
        Err(e) => {
            eprintln!("✗ {e}");
            exit(1);
        }
    }
}
