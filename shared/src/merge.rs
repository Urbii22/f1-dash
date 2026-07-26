use serde_json::Value;

pub fn merge(base: &mut Value, update: Value) {
    match (base, update) {
        (Value::Object(prev), Value::Object(update)) => {
            for (key, value) in update {
                merge(prev.entry(key).or_insert(Value::Null), value);
            }
        }
        (Value::Array(prev), Value::Object(update)) => {
            for (key, value) in update {
                if let Ok(index) = key.parse::<usize>() {
                    if index < prev.len() {
                        merge(&mut prev[index], value);
                    } else {
                        while prev.len() < index {
                            prev.push(Value::Null);
                        }
                        prev.push(value);
                    }
                }
            }
        }
        (base, update) => *base = update,
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::merge;

    #[test]
    fn deep_merges_nested_objects() {
        let mut base = json!({"timing": {"laps": 2, "position": 1}});
        merge(&mut base, json!({"timing": {"laps": 3}}));
        assert_eq!(base, json!({"timing": {"laps": 3, "position": 1}}));
    }

    #[test]
    fn applies_numeric_object_keys_to_arrays() {
        let mut base = json!([{"value": 1}, {"value": 2}]);
        merge(&mut base, json!({"1": {"extra": true}, "3": {"value": 4}}));
        assert_eq!(
            base,
            json!([{"value": 1}, {"value": 2, "extra": true}, null, {"value": 4}])
        );
    }

    #[test]
    fn overwrites_scalar_values() {
        let mut base = json!({"status": "Started"});
        merge(&mut base, json!({"status": "Finished"}));
        assert_eq!(base, json!({"status": "Finished"}));
    }
}
