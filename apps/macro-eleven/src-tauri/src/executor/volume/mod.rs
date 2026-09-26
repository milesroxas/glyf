//! The system output volume, which the knob sets under host control.

#[cfg(target_os = "macos")]
mod macos;

pub trait SystemVolume: Send {
    /// Volume of the default output device, 0-1.
    fn get(&self) -> Result<f32, String>;
    /// Set the volume of the default output device. 0 mutes it; anything
    /// higher unmutes it.
    fn set(&self, volume: f32) -> Result<(), String>;
    /// Play the sound the volume keys play, through the default output, when
    /// "Play feedback when volume is changed" is on.
    fn play_feedback(&self);
}

pub fn create_volume() -> Box<dyn SystemVolume> {
    #[cfg(target_os = "macos")]
    {
        Box::new(macos::CoreAudioVolume::default())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Box::new(NoopVolume)
    }
}

#[cfg(not(target_os = "macos"))]
struct NoopVolume;

#[cfg(not(target_os = "macos"))]
impl SystemVolume for NoopVolume {
    fn get(&self) -> Result<f32, String> {
        Err("Knob volume is not supported on this platform yet".into())
    }

    fn set(&self, _volume: f32) -> Result<(), String> {
        Err("Knob volume is not supported on this platform yet".into())
    }

    fn play_feedback(&self) {}
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::{Arc, Mutex};

    /// A volume held in memory, starting at `level`. Counts feedback sounds.
    #[derive(Clone)]
    pub struct FakeVolume {
        pub level: Arc<Mutex<f32>>,
        pub feedback: Arc<AtomicUsize>,
    }

    impl FakeVolume {
        pub fn new(level: f32) -> Self {
            Self {
                level: Arc::new(Mutex::new(level)),
                feedback: Arc::default(),
            }
        }

        pub fn level(&self) -> f32 {
            *self.level.lock().unwrap()
        }

        pub fn feedback(&self) -> usize {
            self.feedback.load(Ordering::SeqCst)
        }
    }

    impl SystemVolume for FakeVolume {
        fn get(&self) -> Result<f32, String> {
            Ok(self.level())
        }

        fn set(&self, volume: f32) -> Result<(), String> {
            *self.level.lock().unwrap() = volume;
            Ok(())
        }

        fn play_feedback(&self) {
            self.feedback.fetch_add(1, Ordering::SeqCst);
        }
    }
}
