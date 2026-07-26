use serde_json::Value;

pub fn topic(topic: &str) -> &str {
    match topic {
        "CarData.z" | "CarDataZ" => "CarDataZ",
        "Position.z" | "PositionZ" => "PositionZ",
        other => other,
    }
}

pub fn parse_time_ms(value: Option<&str>) -> Option<i64> {
    let value = value?.trim().trim_start_matches('+');
    let (minutes, seconds) = match value.split_once(':') {
        Some((m, s)) => (m.parse::<i64>().ok()?, s),
        None => (0, value),
    };
    let (seconds, fraction) = seconds.split_once('.').unwrap_or((seconds, "0"));
    let millis = format!("{fraction:0<3}")[..3].parse::<i64>().ok()?;
    Some(minutes * 60_000 + seconds.parse::<i64>().ok()? * 1000 + millis)
}

pub fn object_values(value: Option<&Value>) -> Vec<&Value> {
    match value {
        Some(Value::Array(items)) => items.iter().collect(),
        Some(Value::Object(items)) => {
            let mut entries: Vec<_> = items.iter().collect();
            entries.sort_by_key(|(key, _)| key.parse::<usize>().unwrap_or(usize::MAX));
            entries.into_iter().map(|(_, value)| value).collect()
        }
        _ => vec![],
    }
}

#[cfg(test)]
mod tests {
    use super::{parse_time_ms, topic};
    #[test]
    fn parses_lap_times() {
        assert_eq!(parse_time_ms(Some("1:23.456")), Some(83_456));
        assert_eq!(parse_time_ms(Some("+1.2")), Some(1_200));
        assert_eq!(parse_time_ms(Some("1L")), None);
    }
    #[test]
    fn normalizes_compressed_topics() {
        assert_eq!(topic("CarData.z"), "CarDataZ");
        assert_eq!(topic("PositionZ"), "PositionZ");
    }
}
