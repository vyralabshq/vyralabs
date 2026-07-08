//! Vyra validator status collector.
//!
//! Pure assembly of a dashboard snapshot from already-fetched raw source outputs.
//! See `docs/dashboard.md` for the JSON contract this crate mirrors.

pub mod config;
pub mod datapoints;
pub mod derive;
pub mod event;
pub mod monitor;
pub mod osstats;
pub mod redact;
pub mod rpc;
pub mod schema;
pub mod snapshot;
pub mod state;
pub mod voteaccount;
pub mod window;

pub use redact::Redactor;
pub use snapshot::{build_snapshot, Inputs, SnapshotResult};
