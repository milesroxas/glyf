//! One long-lived thread runs every action that talks to the OS, in the order
//! it was asked for. Key presses and the designer's "Try" button share it, so
//! a try never interleaves keystrokes with a real press, and slow actions
//! (app launches, macro waits) never block the HID poll thread.

use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::Arc;
use std::thread;

use super::actions::ActionExecutor;
use crate::config::keymap::{Action, MatrixPosition};
use crate::engine::events::EngineEvents;

/// Who asked for an action, and so who hears the result.
enum Origin {
    /// A physical key press: the result goes out as an event.
    Key { position: MatrixPosition, layer: u8 },
    /// The designer: the result goes back to the caller.
    Try(Sender<Result<(), String>>),
}

struct Job {
    action: Action,
    origin: Origin,
}

pub struct ActionWorker {
    jobs: Sender<Job>,
}

impl ActionWorker {
    pub fn spawn(executor: ActionExecutor, events: Arc<dyn EngineEvents>) -> Self {
        let (jobs, queue) = mpsc::channel();
        thread::Builder::new()
            .name("macro11-actions".into())
            .spawn(move || run(queue, executor, events))
            .expect("spawn the action thread");
        Self { jobs }
    }

    /// Queue the action for a key press and return at once.
    pub fn submit_key(&self, action: Action, position: MatrixPosition, layer: u8) {
        let _ = self.jobs.send(Job {
            action,
            origin: Origin::Key { position, layer },
        });
    }

    /// Queue the action and wait for its result.
    pub fn run(&self, action: Action) -> Result<(), String> {
        let (reply, result) = mpsc::channel();
        self.jobs
            .send(Job {
                action,
                origin: Origin::Try(reply),
            })
            .map_err(|_| "The action thread stopped".to_string())?;
        result
            .recv()
            .map_err(|_| "The action thread stopped".to_string())?
    }
}

fn run(queue: Receiver<Job>, executor: ActionExecutor, events: Arc<dyn EngineEvents>) {
    for Job { action, origin } in queue {
        let result = catch_unwind(AssertUnwindSafe(|| executor.execute(&action)))
            .unwrap_or_else(|_| Err("The action stopped unexpectedly".to_string()));
        match origin {
            Origin::Key { position, layer } => match result {
                Ok(()) => events.action_executed(position, layer, &action),
                Err(error) => events.action_error(position, layer, &error),
            },
            Origin::Try(reply) => {
                let _ = reply.send(result);
            }
        }
    }
}
