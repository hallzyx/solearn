use anchor_lang::prelude::*;
use anchor_spl::token::{
    CloseAccount, close_account,
};

use crate::constants::*;
use crate::error::*;
use crate::state::*;
use crate::CloseDuel;

/// Closes duel-related accounts to reclaim rent.
///
/// Requirements:
/// - Duel status must be COMPLETED, TIMED_OUT, or CANCELLED.
/// - Escrow token account must have zero balance.
/// - Caller can be anyone (e.g., backend) because funds are already settled.
pub fn handler(ctx: Context<CloseDuel>) -> Result<()> {
    // Capture account infos before mutable borrow.
    let duel_info = ctx.accounts.duel.to_account_info();
    let token_program = ctx.accounts.token_program.key();

    let duel = &mut ctx.accounts.duel;

    // Ensure duel is in a terminal state.
    require!(
        matches!(
            duel.status,
            DuelStatus::Completed | DuelStatus::TimedOut | DuelStatus::Cancelled
        ),
        DuelError::CloseNotAllowed
    );

    // Escrow must be empty before closing.
    require!(ctx.accounts.escrow_token_account.amount == 0, DuelError::EscrowNotEmpty);

    // Close the escrow token account using PDA signer.
    let seeds = &[
        DUEL_SEED.as_bytes(),
        duel.duel_id.as_ref(),
        &[duel.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    close_account(
        CpiContext::new_with_signer(
            token_program,
            CloseAccount {
                account: ctx.accounts.escrow_token_account.to_account_info(),
                destination: ctx.accounts.destination.to_account_info(),
                authority: duel_info,
            },
            signer_seeds,
        )
    )?;

    // Close the duel account and refund rent to destination.
    ctx.accounts.duel.close(ctx.accounts.destination.to_account_info())?;

    Ok(())
}
