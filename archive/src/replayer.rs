use serde_json::{Value, json};
use shared::merge::merge;

#[derive(Default)]
pub struct Replayer {
    pub state: Value,
}

impl Replayer {
    pub fn set(&mut self, state: Value) {
        self.state = state;
    }
    pub fn apply(&mut self, topic: &str, data: Value) {
        merge(&mut self.state, json!({topic: data}));
    }
}
