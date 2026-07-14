//! Vote-account parser (issue #11, Source E).
//!
//! Parses `solana vote-account <vote-pubkey> --output json` into the credit / commission /
//! per-epoch fields the dashboard shows. Pure over the JSON text; `stale`/`fetched_at` are
//! set by the caller (build_snapshot) since they depend on `now` and the fetch outcome.
//!
//! Note: this CLI output does NOT carry activated stake — `getVoteAccounts` does. Until
//! that source is wired, `activated_stake_sol` stays null. `max` per epoch is
//! `maxCreditsPerSlot * slotsInEpoch`. Verified against real box output.

use serde_json::Value;

use crate::schema::{EpochCredit, RecentVote};

/// Keep only the newest N epochs of credit history. A vote account can retain up to 64
/// epochs on-chain; the dashboard only charts the recent trend, so bound the snapshot
/// payload here. Matches the dashboard's own window.
const EPOCH_CREDITS_KEEP: usize = 8;

/// Agave 4.2 wraps per-epoch (and per-vote) objects under a consensus-type key
/// (`tower` today, `votor` after Alpenglow). Return the inner object if a known
/// wrapper is present, else the value itself (flat pre-4.2 shape).
fn consensus_inner(e: &Value) -> &Value {
    for key in ["tower", "votor", "Tower", "Votor"] {
        if e.get(key).is_some() {
            return &e[key];
        }
    }
    e
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
                // Agave 4.2 nests each entry under a consensus-type wrapper
                // ("tower" now, "votor" once Alpenglow lands). Older builds were flat.
                // Unwrap whichever wrapper exists, else read the entry directly.
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
        // Bound the payload to the newest EPOCH_CREDITS_KEEP epochs, regardless of the
        // order the CLI emits them (sort ascending by epoch, drop the oldest overflow).
        credits.sort_by_key(|c| c.epoch);
        if credits.len() > EPOCH_CREDITS_KEEP {
            credits.drain(0..credits.len() - EPOCH_CREDITS_KEEP);
        }
        credits
    });

    // Recent votes: 4.2 nests the array under `votesObserved.Tower` (a `Votor` sibling
    // will appear with Alpenglow); pre-4.2 it was a plain array. consensus_inner unwraps
    // whichever wrapper exists, or the array itself.
    let recent_votes = consensus_inner(&v["votesObserved"]).as_array().map(|arr| {
        arr.iter()
            .filter_map(|e| {
                Some(RecentVote {
                    slot: e["slot"].as_i64()?,
                    latency: e["latency"].as_i64(),
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

    // Trimmed real sample from the box.
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
        assert_eq!(d.activated_stake_sol, None); // not in this source

        let ec = d.epoch_credits.unwrap();
        assert_eq!(ec.len(), 2);
        assert_eq!(ec[0].epoch, Some(985));
        assert_eq!(ec[0].credits, Some(1_239_987));
        assert_eq!(ec[0].max, Some(16 * 432_000));
        assert_eq!(ec[1].epoch, Some(986));
    }

    // Agave 4.2: entries wrapped under "tower".
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
    }
}
