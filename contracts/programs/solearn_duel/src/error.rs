use anchor_lang::prelude::*;

#[error_code]
pub enum DuelError {
    /// Only the challenger can cancel before acceptance.
    #[msg("Only the challenger can cancel this duel")]
    NotChallenger,

    /// Only the authorized resolver can resolve or claim timeout.
    #[msg("Only the authorized resolver can perform this action")]
    NotResolver,

    /// The duel is not in the expected state for this action.
    #[msg("Duel is not in the required state")]
    InvalidStatus,

    /// Only the opponent can accept the duel.
    #[msg("Only the opponent can accept this duel")]
    NotOpponent,

    /// The duel has already been accepted.
    #[msg("Duel has already been accepted")]
    AlreadyAccepted,

    /// Timestamp is before the allowed timeout.
    #[msg("Timeout has not been reached yet")]
    TimeoutNotReached,

    /// Cannot resolve — scores would lock funds.
    #[msg("Invalid score values")]
    InvalidScore,

    /// Cannot close the escrow — funds may be stuck.
    #[msg("Escrow still has funds")]
    EscrowNotEmpty,

    /// Invalid number of questions for the duel.
    #[msg("Invalid question count")]
    InvalidQuestionCount,

    /// Invalid time limit for the duel.
    #[msg("Invalid time limit")]
    InvalidTimeLimit,

    /// Invalid stake amount.
    #[msg("Invalid stake amount")]
    InvalidStakeAmount,

    /// Closing is not allowed in the current state.
    #[msg("Duel cannot be closed in the current state")]
    CloseNotAllowed,
}
