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

use crate::schema::EpochCredit;

/// The data fields a vote-account fetch yields (no stale/fetched_at — caller owns those).
#[derive(Debug, Clone, PartialEq)]
pub struct VoteAccountData {
    pub credits_lifetime: Option<i64>,
    pub commission_pct: Option<f64>,
    pub activated_stake_sol: Option<f64>,
    pub epoch_credits: Option<Vec<EpochCredit>>,
}

/// Parse the CLI JSON, or None if the text is not valid JSON.
pub fn parse_vote_account(json: &str) -> Option<VoteAccountData> {
    let v: Value = serde_json::from_str(json).ok()?;

    let epoch_credits = v["epochVotingHistory"].as_array().map(|arr| {
        arr.iter()
            .map(|e| {
                let per_slot = e["maxCreditsPerSlot"].as_i64();
                let slots = e["slotsInEpoch"].as_i64();
                EpochCredit {
                    epoch: e["epoch"].as_i64(),
                    credits: e["creditsEarned"].as_i64(),
                    max: per_slot.zip(slots).map(|(p, s)| p * s),
                }
            })
            .collect()
    });

    Some(VoteAccountData {
        credits_lifetime: v["credits"].as_i64(),
        commission_pct: v["commission"].as_f64(),
        // Not present in `solana vote-account` output; comes from getVoteAccounts later.
        activated_stake_sol: None,
        epoch_credits,
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
