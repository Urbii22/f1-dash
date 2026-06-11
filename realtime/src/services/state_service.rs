use anyhow::Error;
use serde_json::Value;
use shared::merge::merge;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct StateService {
    state: Arc<RwLock<Value>>,
}

impl StateService {
    pub fn new() -> Self {
        Self {
            state: Arc::new(RwLock::new(Value::Object(serde_json::Map::new()))),
        }
    }

    pub async fn get_state(&self) -> Result<Value, Error> {
        let state = self.state.read().await;
        Ok(state.clone())
    }

    pub async fn get_state_string(&self) -> Result<String, Error> {
        let state = self.state.read().await;
        Ok(state.to_string())
    }

    pub async fn set_state(&self, new_state: Value) -> Result<(), Error> {
        let mut state = self.state.write().await;
        *state = new_state;
        Ok(())
    }

    pub async fn update_state(&self, update: Value) -> Result<(), Error> {
        let mut state = self.state.write().await;
        merge(&mut state, update);
        Ok(())
    }
}
