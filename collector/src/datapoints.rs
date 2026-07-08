//! Parse Agave metrics 'datapoint' log lines.
//!
//! A line looks like:
//!     [2026-07-08T09:59:07.314Z INFO  solana_metrics::metrics] datapoint: tower-vote latest=420559488i root=420559457i
//!
//! The collector wants the most-recent occurrence of a handful of named datapoints.
//! Values follow InfluxDB line-protocol conventions: integers carry a trailing 'i',
//! floats do not, strings are quoted. Pure functions, no I/O.

use std::collections::HashMap;

/// A datapoint field value: int / float / str, mirroring the InfluxDB line-protocol types.
#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Int(i64),
    Float(f64),
    Str(String),
}

impl Value {
    /// The value as an int, but only when it is genuinely an integer (Python's `_int`).
    pub fn as_int(&self) -> Option<i64> {
        match self {
            Value::Int(i) => Some(*i),
            _ => None,
        }
    }

    /// The value as a float, coercing an int to float (Python's `_float`).
    pub fn as_float(&self) -> Option<f64> {
        match self {
            Value::Int(i) => Some(*i as f64),
            Value::Float(f) => Some(*f),
            Value::Str(_) => None,
        }
    }
}

/// A parsed datapoint: its metric name and the key/value fields that follow it.
#[derive(Debug, Clone, PartialEq)]
pub struct Datapoint {
    pub name: String,
    pub fields: HashMap<String, Value>,
}

/// Coerce a datapoint value token to int / float / str.
pub fn parse_value(raw: &str) -> Value {
    if raw.len() >= 2 && raw.starts_with('"') && raw.ends_with('"') {
        return Value::Str(raw[1..raw.len() - 1].to_string());
    }
    if let Some(body) = raw.strip_suffix('i') {
        if let Ok(i) = body.parse::<i64>() {
            return Value::Int(i);
        }
    }
    if raw.contains('.') || raw.contains('e') || raw.contains('E') {
        if let Ok(f) = raw.parse::<f64>() {
            return Value::Float(f);
        }
    } else if let Ok(i) = raw.parse::<i64>() {
        return Value::Int(i);
    }
    Value::Str(raw.to_string())
}

/// Return the name + fields for a datapoint line, else `None`.
pub fn parse_datapoint_line(line: &str) -> Option<Datapoint> {
    const MARKER: &str = "datapoint: ";
    let idx = line.find(MARKER)?;
    let body = line[idx + MARKER.len()..].trim();
    if body.is_empty() {
        return None;
    }
    let mut tokens = body.split_whitespace();
    // The name may carry an inline tag (e.g. "cost_tracker_stats,is_leader=false");
    // keep only the metric name before any comma.
    let name = tokens.next()?.split(',').next().unwrap_or("").to_string();
    let mut fields = HashMap::new();
    for tok in tokens {
        if let Some((key, val)) = tok.split_once('=') {
            fields.insert(key.to_string(), parse_value(val));
        }
    }
    Some(Datapoint { name, fields })
}

/// Fields of the most-recent datapoint with the given name, or `None` if absent.
pub fn latest_datapoint(lines: &[String], name: &str) -> Option<HashMap<String, Value>> {
    let mut found = None;
    for line in lines {
        if let Some(dp) = parse_datapoint_line(line) {
            if dp.name == name {
                found = Some(dp.fields);
            }
        }
    }
    found
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_influx_typed_values() {
        assert_eq!(parse_value("420559488i"), Value::Int(420559488));
        assert_eq!(parse_value("42"), Value::Int(42));
        assert_eq!(parse_value("0.75"), Value::Float(0.75));
        assert_eq!(parse_value("1e3"), Value::Float(1000.0));
        assert_eq!(parse_value("\"quoted\""), Value::Str("quoted".into()));
    }

    #[test]
    fn non_numeric_falls_back_to_string() {
        assert_eq!(parse_value("abci"), Value::Str("abci".into()));
        assert_eq!(parse_value("3.5i"), Value::Str("3.5i".into()));
        assert_eq!(parse_value("false"), Value::Str("false".into()));
    }

    #[test]
    fn parses_a_full_line() {
        let line = "[2026-07-08T09:59:07.314Z INFO  solana_metrics::metrics] datapoint: tower-vote latest=420559488i root=420559457i";
        let dp = parse_datapoint_line(line).unwrap();
        assert_eq!(dp.name, "tower-vote");
        assert_eq!(dp.fields["latest"], Value::Int(420559488));
        assert_eq!(dp.fields["root"], Value::Int(420559457));
    }

    #[test]
    fn strips_inline_tag_from_name() {
        let line = "x datapoint: cost_tracker_stats,is_leader=false units=10i";
        let dp = parse_datapoint_line(line).unwrap();
        assert_eq!(dp.name, "cost_tracker_stats");
        assert_eq!(dp.fields["units"], Value::Int(10));
    }

    #[test]
    fn non_datapoint_line_is_none() {
        assert!(parse_datapoint_line("just a log line").is_none());
        assert!(parse_datapoint_line("datapoint: ").is_none());
    }

    #[test]
    fn latest_wins_over_earlier() {
        let lines = vec![
            "datapoint: tower-vote latest=1i root=0i".to_string(),
            "datapoint: tower-vote latest=9i root=8i".to_string(),
        ];
        let f = latest_datapoint(&lines, "tower-vote").unwrap();
        assert_eq!(f["latest"], Value::Int(9));
        assert!(latest_datapoint(&lines, "missing").is_none());
    }
}
