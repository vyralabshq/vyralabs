//! Vote-account parser (issue #11, Source E).
//!
//! Parses `solana vote-account <vote-pubkey> --output json` into the credit / commission /
//! per-epoch fields the dashboard shows. Pure over the JSON text; `stale`/`fetched_at` are
//! set by the caller (build_snapshot) since they depend on `now` and the fetch outcome.
//!
//! Note: this CLI output does NOT carry activated stake — `getVoteAccounts` does. Until
//! that source is wired, `activated_stake_sol` stays null. `max` per epoch is
//! `maxCreditsPerSlot * slotsInEpoch`.
//!
//! Shape history (all still accepted):
//! - **Current (post-downgrade, Agave / jito CLI on box):** flat `votes: [{slot, latency, ...}]`
//!   and flat `epochVotingHistory: [{epoch, creditsEarned, ...}]`.
//! - **Agave 4.2 nested:** `votesObserved.Tower` / `.Votor` and
//!   `epochVotingHistory[].tower` / `.votor`. Kept as fallback so a client bump that
//!   reintroduces wrappers does not blank the dashboard again.

use serde_json::Value;

use crate::schema::{EpochCredit, RecentVote};

/// Keep only the newest N epochs of credit history. A vote account can retain up to 64
/// epochs on-chain; the dashboard only charts the recent trend, so bound the snapshot
/// payload here. Matches the dashboard's own window.
const EPOCH_CREDITS_KEEP: usize = 8;

/// If `e` is wrapped under a consensus-type key (`tower` / `votor`, any case), return the
/// inner object. Otherwise return `e` (flat shape).
fn consensus_inner(e: &Value) -> &Value {
    for key in ["tower", "votor", "Tower", "Votor"] {
        if e.get(key).is_some() {
            return &e[key];
        }
    }
    e
}

/// Resolve the recent-votes array from either the current flat key or the 4.2 nested key.
///
/// Current CLI: `"votes": [ { "slot", "latency", "confirmationCount" }, ... ]`
/// Agave 4.2:   `"votesObserved": { "Tower": [ ... ] }` (or Votor later)
fn recent_votes_array(v: &Value) -> Option<&Vec<Value>> {
    // Prefer the live flat key (what the box emits after the client switch).
    if let Some(arr) = v.get("votes").and_then(Value::as_array) {
        return Some(arr);
    }
    // Fallback: 4.2 nested votesObserved.{Tower|Votor|...}
    if let Some(obs) = v.get("votesObserved") {
        if let Some(arr) = obs.as_array() {
            return Some(arr);
        }
        // Object wrapper: take the first array value among known consensus keys, else any array.
        for key in ["Tower", "Votor", "tower", "votor"] {
            if let Some(arr) = obs.get(key).and_then(Value::as_array) {
                return Some(arr);
            }
        }
        if let Some(obj) = obs.as_object() {
            for (_k, val) in obj {
                if let Some(arr) = val.as_array() {
                    return Some(arr);
                }
            }
        }
    }
    None
}

/// The data fields a vote-account fetch yields (no stale/fetched_at — caller owns those).
#[derive(Debug, Clone, PartialEq)]
pub struct VoteAccountData {
    pub credits_lifetime: Option<i64>,
    pub commission_pct: Option<f64>,
    pub activated_stake_sol: Option<f64>,
    pub epoch_credits: Option<Vec<EpochCredit>>,
    pub recent_votes: Option<Vec<RecentVote>>,
}

/// Parse the CLI JSON, or None if the text is not valid JSON.
pub fn parse_vote_account(json: &str) -> Option<VoteAccountData> {
    let v: Value = serde_json::from_str(json).ok()?;

    let epoch_credits = v["epochVotingHistory"].as_array().map(|arr| {
        let mut credits: Vec<EpochCredit> = arr
            .iter()
            .map(|e| {
                // Flat entries today; unwrap tower/votor wrapper if a future build re-nests.
                let inner = consensus_inner(e);
                let per_slot = inner["maxCreditsPerSlot"].as_i64();
                let slots = inner["slotsInEpoch"].as_i64();
                EpochCredit {
                    epoch: inner["epoch"].as_i64(),
                    credits: inner["creditsEarned"].as_i64(),
                    max: per_slot.zip(slots).map(|(p, s)| p * s),
                }
            })
            .collect();
        credits.sort_by_key(|c| c.epoch);
        if credits.len() > EPOCH_CREDITS_KEEP {
            credits.drain(0..credits.len() - EPOCH_CREDITS_KEEP);
        }
        credits
    });

    let recent_votes = recent_votes_array(&v).map(|arr| {
        arr.iter()
            .filter_map(|e| {
                let inner = consensus_inner(e);
                Some(RecentVote {
                    slot: inner["slot"].as_i64()?,
                    latency: inner["latency"].as_i64(),
                })
            })
            .collect()
    });

    Some(VoteAccountData {
        credits_lifetime: v["credits"].as_i64(),
        commission_pct: v["commission"].as_f64(),
        // Not present in `solana vote-account` output; comes from getVoteAccounts later.
        activated_stake_sol: None,
        epoch_credits,
        recent_votes,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_FLAT: &str = r#"{
      "accountBalance": 1895918076184,
      "validatorIdentity": "vyRa8J7ULHfUAdnkTHP3YGhcLWaLURXLmD7CiZkMzWg",
      "credits": 53689740,
      "commission": 100,
      "rootSlot": 424759454,
      "votes": [
        { "latency": 1, "slot": 424759455, "confirmationCount": 31 },
        { "latency": 1, "slot": 424759456, "confirmationCount": 30 },
        { "latency": 3, "slot": 424759467, "confirmationCount": 19 }
      ],
      "epochVotingHistory": [
        { "epoch": 995, "slotsInEpoch": 432000, "creditsEarned": 6578027, "credits": 53523402, "prevCredits": 46945375, "maxCreditsPerSlot": 16 },
        { "epoch": 996, "slotsInEpoch": 432000, "creditsEarned": 166338, "credits": 53689740, "prevCredits": 53523402, "maxCreditsPerSlot": 16 }
      ]
    }"#;

    #[test]
    fn parses_flat_votes_and_epoch_history() {
        let d = parse_vote_account(SAMPLE_FLAT).unwrap();
        assert_eq!(d.credits_lifetime, Some(53_689_740));
        assert_eq!(d.commission_pct, Some(100.0));

        let ec = d.epoch_credits.unwrap();
        assert_eq!(ec.len(), 2);
        assert_eq!(ec[0].epoch, Some(995));
        assert_eq!(ec[0].credits, Some(6_578_027));
        assert_eq!(ec[0].max, Some(16 * 432_000));
        assert_eq!(ec[1].epoch, Some(996));
        assert_eq!(ec[1].credits, Some(166_338));

        let rv = d.recent_votes.unwrap();
        assert_eq!(rv.len(), 3);
        assert_eq!(rv[0].slot, 424_759_455);
        assert_eq!(rv[0].latency, Some(1));
        assert_eq!(rv[2].slot, 424_759_467);
        assert_eq!(rv[2].latency, Some(3));
    }

    // Older trimmed flat sample (no votes key).
    const SAMPLE: &str = r#"{
      "accountBalance": 27074400,
      "validatorIdentity": "vyRa8J7ULHfUAdnkTHP3YGhcLWaLURXLmD7CiZkMzWg",
      "credits": 2218603,
      "commission": 100,
      "rootSlot": 420620227,
      "epochVotingHistory": [
        { "epoch": 985, "slotsInEpoch": 432000, "creditsEarned": 1239987, "credits": 1239987, "prevCredits": 0, "maxCreditsPerSlot": 16 },
        { "epoch": 986, "slotsInEpoch": 432000, "creditsEarned": 978616, "credits": 2218603, "prevCredits": 1239987, "maxCreditsPerSlot": 16 }
      ]
    }"#;

    #[test]
    fn parses_real_vote_account() {
        let d = parse_vote_account(SAMPLE).unwrap();
        assert_eq!(d.credits_lifetime, Some(2218603));
        assert_eq!(d.commission_pct, Some(100.0));
        assert_eq!(d.activated_stake_sol, None);

        let ec = d.epoch_credits.unwrap();
        assert_eq!(ec.len(), 2);
        assert_eq!(ec[0].epoch, Some(985));
        assert_eq!(ec[0].credits, Some(1_239_987));
        assert_eq!(ec[0].max, Some(16 * 432_000));
        assert_eq!(ec[1].epoch, Some(986));
        assert!(d.recent_votes.is_none());
    }

    // Agave 4.2 nested shape — kept as fallback.
    const SAMPLE_4_2: &str = r#"{
      "credits": 3832063,
      "commission": 100,
      "votesObserved": {
        "Tower": [
          { "latency": 16, "slot": 420972536, "confirmationCount": 31 },
          { "latency": 1, "slot": 420972537, "confirmationCount": 30 }
        ]
      },
      "epochVotingHistory": [
        { "tower": { "epoch": 985, "slotsInEpoch": 432000, "creditsEarned": 1239987, "credits": 1239987, "prevCredits": 0, "maxCreditsPerSlot": 16 } },
        { "tower": { "epoch": 987, "slotsInEpoch": 432000, "creditsEarned": 493896, "credits": 3832063, "prevCredits": 3338167, "maxCreditsPerSlot": 16 } }
      ]
    }"#;

    #[test]
    fn parses_nested_tower_shape() {
        let d = parse_vote_account(SAMPLE_4_2).unwrap();
        assert_eq!(d.credits_lifetime, Some(3_832_063));
        let ec = d.epoch_credits.unwrap();
        assert_eq!(ec.len(), 2);
        assert_eq!(ec[0].epoch, Some(985));
        assert_eq!(ec[0].credits, Some(1_239_987));
        assert_eq!(ec[0].max, Some(16 * 432_000));
        assert_eq!(ec[1].epoch, Some(987));
        assert_eq!(ec[1].credits, Some(493_896));
    }

    #[test]
    fn parses_recent_votes_from_tower() {
        let d = parse_vote_account(SAMPLE_4_2).unwrap();
        let rv = d.recent_votes.unwrap();
        assert_eq!(rv.len(), 2);
        assert_eq!(rv[0].slot, 420_972_536);
        assert_eq!(rv[0].latency, Some(16));
        assert_eq!(rv[1].slot, 420_972_537);
        assert_eq!(rv[1].latency, Some(1));
    }

    #[test]
    fn invalid_json_is_none() {
        assert!(parse_vote_account("not json").is_none());
    }

    #[test]
    fn missing_fields_stay_null() {
        let d = parse_vote_account("{}").unwrap();
        assert_eq!(d.credits_lifetime, None);
        assert_eq!(d.commission_pct, None);
        assert!(d.epoch_credits.is_none());
        assert!(d.recent_votes.is_none());
    }
}
