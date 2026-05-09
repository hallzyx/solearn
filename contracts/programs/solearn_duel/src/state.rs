use anchor_lang::prelude::*;

/// Current status of a duel.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum DuelStatus {
    /// Created by challenger, waiting for opponent to accept.
    Created,
    /// Accepted by opponent, ready to start quiz.
    Accepted,
    /// Quiz in progress.
    InProgress,
    /// Completed with winner determined.
    Completed,
    /// Timed out due to player abandonment.
    TimedOut,
    /// Cancelled by challenger before acceptance.
    Cancelled,
}

/// On-chain state for a duel between two players.
#[account]
pub struct Duel {
    /// Player who created the duel.
    pub challenger: Pubkey,
    /// Player who accepted the duel (set on accept).
    pub opponent: Pubkey,
    /// Authorized resolver backend keypair.
    pub resolver: Pubkey,
    /// Unique identifier for this duel (8 random bytes).
    pub duel_id: [u8; 8],
    /// Stake amount each player deposits (in USDC base units / lamports).
    pub stake_amount: u64,
    /// Number of questions in the quiz (3, 5, or 10).
    pub question_count: u8,
    /// Time limit in seconds (180, 300, or 600).
    pub time_limit: i64,
    /// Current duel status.
    pub status: DuelStatus,
    /// Challenger's final score.
    pub score_a: u8,
    /// Opponent's final score.
    pub score_b: u8,
    /// Winner's public key (None if tie or not resolved).
    pub winner: Option<Pubkey>,
    /// Timestamp when the duel was created.
    pub created_at: i64,
    /// Timestamp when the duel was accepted.
    pub accepted_at: i64,
    /// Timestamp when the duel entered InProgress.
    pub started_at: i64,
    /// Timestamp when the duel was completed/timed out.
    pub completed_at: i64,
    /// PDA bump for signing.
    pub bump: u8,
}

impl Duel {
    /// Space required for the Duel account.
    pub const LEN: usize = 8 // discriminator
        + 32  // challenger
        + 32  // opponent
        + 32  // resolver
        + 8   // duel_id
        + 8   // stake_amount
        + 1   // question_count
        + 8   // time_limit (i64)
        + 1   // status (enum)
        + 1   // score_a
        + 1   // score_b
        + 33  // winner (Option<Pubkey>: 1 discriminator + 32)
        + 8   // created_at
        + 8   // accepted_at
        + 8   // started_at
        + 8   // completed_at
        + 1;  // bump
}
