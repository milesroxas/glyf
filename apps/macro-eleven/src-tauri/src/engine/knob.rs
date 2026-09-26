//! The knob sets the system volume under host control.
//!
//! The knob is absolute, but the volume can also change elsewhere (volume
//! keys, the menu bar), and the app can start with the two apart. Setting
//! the volume to the knob position would then jump. Instead, each turn
//! covers the distance left to the stop it turns toward: the knob and the
//! volume reach the stop together, and from there they track 1:1.

use std::sync::{Arc, Condvar, Mutex, MutexGuard};
use std::thread;

use crate::executor::volume::SystemVolume;

/// Highest knob reading (firmware `POT_MAX`).
const KNOB_MAX: f32 = 1023.0;
/// A readback this close to the volume last set is that volume. Devices
/// round the value; a volume key moves it 1/16.
const SAME_VOLUME: f32 = 0.02;

/// Turns knob positions into volume changes. Pure, so it is tested alone.
#[derive(Default)]
pub struct KnobFollower {
    /// Last knob position, 0-1. `None` until the first reading.
    position: Option<f32>,
    /// Last volume set, 0-1.
    volume: Option<f32>,
}

impl KnobFollower {
    /// Forget the knob. The next reading is a new starting point.
    pub fn reset(&mut self) {
        *self = Self::default();
    }

    /// Move the knob to `position` (0-1) with the system volume at `current`.
    /// Returns the volume to set, if any.
    pub fn turn(&mut self, position: f32, current: f32) -> Option<f32> {
        let from = self.position.replace(position)?;
        if position == from {
            return None;
        }
        let volume = match self.volume {
            Some(set) if (set - current).abs() < SAME_VOLUME => set,
            _ => current,
        };
        let next = if position > from {
            volume + (position - from) * (1.0 - volume) / (1.0 - from)
        } else {
            volume - (from - position) * volume / from
        }
        .clamp(0.0, 1.0);
        self.volume = Some(next);
        Some(next)
    }
}

#[derive(Default)]
struct Pending {
    /// Last reading passed to `report`, to skip repeats.
    last: Option<u16>,
    /// Newest reading not yet applied.
    reading: Option<u16>,
    reset: bool,
    closed: bool,
}

type Shared = Arc<(Mutex<Pending>, Condvar)>;

fn lock(shared: &Shared) -> MutexGuard<'_, Pending> {
    shared.0.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

/// Applies knob readings to the system volume on its own thread. The poll
/// thread never waits on CoreAudio, and a burst of readings collapses to
/// the newest one.
pub struct KnobVolume {
    shared: Shared,
}

impl KnobVolume {
    pub fn spawn(volume: Box<dyn SystemVolume>) -> Self {
        let shared = Shared::default();
        let worker = shared.clone();
        thread::Builder::new()
            .name("macro11-knob".into())
            .spawn(move || run(&worker, volume.as_ref()))
            .expect("spawn the knob thread");
        Self { shared }
    }

    /// The newest knob reading (0-1023), or `None` while the knob is not the
    /// host's: no device, host control off, or firmware that still taps
    /// volume keys.
    pub fn report(&self, reading: Option<u16>) {
        let mut pending = lock(&self.shared);
        if pending.last == reading {
            return;
        }
        pending.last = reading;
        match reading {
            Some(_) => pending.reading = reading,
            None => {
                pending.reading = None;
                pending.reset = true;
            }
        }
        self.shared.1.notify_one();
    }
}

impl Drop for KnobVolume {
    fn drop(&mut self) {
        lock(&self.shared).closed = true;
        self.shared.1.notify_one();
    }
}

fn run(shared: &Shared, volume: &dyn SystemVolume) {
    let mut follower = KnobFollower::default();
    let mut last_error = None;
    loop {
        let (reset, reading) = {
            let mut pending = lock(shared);
            while !pending.closed && !pending.reset && pending.reading.is_none() {
                pending = shared
                    .1
                    .wait(pending)
                    .unwrap_or_else(|poisoned| poisoned.into_inner());
            }
            if pending.closed {
                return;
            }
            (std::mem::take(&mut pending.reset), pending.reading.take())
        };
        if reset {
            follower.reset();
        }
        let Some(reading) = reading else {
            continue;
        };
        let position = f32::from(reading.min(KNOB_MAX as u16)) / KNOB_MAX;
        let result = volume.get().and_then(|current| match follower.turn(position, current) {
            Some(next) => volume.set(next),
            None => Ok(()),
        });
        // Report a failure once, not on every reading
        let error = result.err();
        if error.is_some() && error != last_error {
            eprintln!("Knob volume: {}", error.as_deref().unwrap_or_default());
        }
        last_error = error;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::executor::volume::tests::FakeVolume;
    use std::time::{Duration, Instant};

    fn close(a: f32, b: f32) -> bool {
        (a - b).abs() < 1e-4
    }

    #[test]
    fn first_reading_only_sets_the_start() {
        let mut follower = KnobFollower::default();
        assert_eq!(follower.turn(0.9, 0.2), None);
        assert_eq!(follower.turn(0.9, 0.2), None);
    }

    #[test]
    fn tracks_one_to_one_when_matched() {
        let mut follower = KnobFollower::default();
        follower.turn(0.5, 0.5);
        assert!(close(follower.turn(0.6, 0.5).unwrap(), 0.6));
        assert!(close(follower.turn(0.3, 0.6).unwrap(), 0.3));
    }

    #[test]
    fn meets_the_volume_at_either_stop_without_a_jump() {
        let mut follower = KnobFollower::default();
        follower.turn(0.5, 0.2);
        // Up: 0.2 covers the 0.8 left while the knob covers its 0.5
        let up = follower.turn(0.75, 0.2).unwrap();
        assert!(close(up, 0.6));
        assert!(close(follower.turn(1.0, up).unwrap(), 1.0));

        let mut follower = KnobFollower::default();
        follower.turn(0.5, 0.2);
        let down = follower.turn(0.25, 0.2).unwrap();
        assert!(close(down, 0.1));
        assert!(close(follower.turn(0.0, down).unwrap(), 0.0));
    }

    #[test]
    fn small_turns_make_small_changes() {
        let mut follower = KnobFollower::default();
        follower.turn(0.5, 0.5);
        let step = 2.0 / KNOB_MAX;
        let next = follower.turn(0.5 + step, 0.5).unwrap();
        assert!(next - 0.5 < 0.005);
    }

    #[test]
    fn a_volume_change_elsewhere_is_the_new_start() {
        let mut follower = KnobFollower::default();
        follower.turn(0.5, 0.5);
        follower.turn(0.6, 0.5);
        // A volume key moved it to 0.9; the next turn continues from there
        let next = follower.turn(0.7, 0.9).unwrap();
        assert!(next > 0.9 && next < 1.0);
    }

    #[test]
    fn readback_rounding_does_not_drift() {
        let mut follower = KnobFollower::default();
        follower.turn(0.5, 0.5);
        let set = follower.turn(0.6, 0.5).unwrap();
        let next = follower.turn(0.7, set - 0.01).unwrap();
        assert!(close(next, 0.7));
    }

    #[test]
    fn reset_forgets_the_knob() {
        let mut follower = KnobFollower::default();
        follower.turn(0.5, 0.5);
        follower.reset();
        assert_eq!(follower.turn(0.9, 0.5), None);
    }

    fn wait_for(volume: &FakeVolume, level: f32) {
        let deadline = Instant::now() + Duration::from_secs(5);
        while !close(volume.level(), level) && Instant::now() < deadline {
            thread::sleep(Duration::from_millis(5));
        }
        assert!(close(volume.level(), level), "volume {} != {level}", volume.level());
    }

    /// Wait until the knob thread has taken every reading. It applies what
    /// it takes before it takes more.
    fn taken(knob: &KnobVolume) {
        let deadline = Instant::now() + Duration::from_secs(5);
        while Instant::now() < deadline {
            let pending = lock(&knob.shared);
            if pending.reading.is_none() && !pending.reset {
                return;
            }
            drop(pending);
            thread::sleep(Duration::from_millis(1));
        }
        panic!("the knob thread did not take the reading");
    }

    #[test]
    fn sets_the_system_volume_from_readings() {
        let volume = FakeVolume::new(0.5);
        let knob = KnobVolume::spawn(Box::new(volume.clone()));
        knob.report(Some(0));
        taken(&knob);
        // From 0 the knob can only turn up: 0.5 covers its 0.5 left over the full turn
        knob.report(Some(1023));
        wait_for(&volume, 1.0);
    }

    #[test]
    fn a_released_knob_starts_over() {
        let volume = FakeVolume::new(0.5);
        let knob = KnobVolume::spawn(Box::new(volume.clone()));
        knob.report(Some(512));
        knob.report(None);
        knob.report(Some(1023));
        thread::sleep(Duration::from_millis(50));
        assert!(close(volume.level(), 0.5));
    }
}
