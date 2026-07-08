//! Pure, null-safe derivations shared by the snapshot assembler and history points.
//!
//! These mirror the derivations the frontend does for latest.json (docs/dashboard.md).
//! The collector uses them for the history-window points, which store derived values.
//! Any missing input yields `None`, never a panic.

pub fn vote_lag(latest: Option<i64>, root: Option<i64>) -> Option<i64> {
    Some(latest? - root?)
}

pub fn finality_lag(processed: Option<i64>, finalized: Option<i64>) -> Option<i64> {
    Some(processed? - finalized?)
}

pub fn drop_rate_pct(produced: Option<i64>, dropped: Option<i64>) -> Option<f64> {
    let (produced, dropped) = (produced?, dropped?);
    let total = produced + dropped;
    if total <= 0 {
        return None;
    }
    Some(dropped as f64 / total as f64 * 100.0)
}

pub fn fork_weight_pct(fork_weight: Option<f64>) -> Option<f64> {
    Some(fork_weight? * 100.0)
}

pub fn epoch_progress_pct(slot_index: Option<i64>, slots_in_epoch: Option<i64>) -> Option<f64> {
    let slots_in_epoch = slots_in_epoch?;
    if slots_in_epoch == 0 {
        return None;
    }
    Some(slot_index? as f64 / slots_in_epoch as f64 * 100.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_input_is_none() {
        assert_eq!(vote_lag(None, Some(1)), None);
        assert_eq!(finality_lag(Some(1), None), None);
        assert_eq!(drop_rate_pct(None, None), None);
        assert_eq!(fork_weight_pct(None), None);
        assert_eq!(epoch_progress_pct(Some(1), None), None);
    }

    #[test]
    fn computes_expected() {
        assert_eq!(vote_lag(Some(10), Some(3)), Some(7));
        assert_eq!(finality_lag(Some(10), Some(4)), Some(6));
        assert_eq!(drop_rate_pct(Some(90), Some(10)), Some(10.0));
        assert_eq!(fork_weight_pct(Some(0.5)), Some(50.0));
        assert_eq!(epoch_progress_pct(Some(216_000), Some(432_000)), Some(50.0));
    }

    #[test]
    fn guards_zero_denominators() {
        assert_eq!(drop_rate_pct(Some(0), Some(0)), None);
        assert_eq!(epoch_progress_pct(Some(1), Some(0)), None);
    }
}
