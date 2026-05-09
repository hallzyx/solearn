use anchor_lang::prelude::*;
use anchor_spl::token::{
    Transfer, transfer,
};

use crate::constants::*;
use crate::error::*;
use crate::state::*;
use crate::CancelDuel;

/// Cancels a duel before it has been accepted (challenger only, Created state).
pub fn handler(ctx: Context<CancelDuel>) -> Result<()> {
    let clock = Clock::get()?;

    // Capture all needed values before the mutable borrow.
    let duel_info = ctx.accounts.duel.to_account_info();
    let challenger_key = ctx.accounts.challenger.key();
    let token_program = ctx.accounts.token_program.key();

    let duel = &mut ctx.accounts.duel;

    require!(challenger_key == duel.challenger, DuelError::NotChallenger);
    require!(duel.status == DuelStatus::Created, DuelError::InvalidStatus);

    let stake_amount = duel.stake_amount;
    let duel_id = duel.duel_id;
    let bump = duel.bump;

    duel.status = DuelStatus::Cancelled;
    duel.completed_at = clock.unix_timestamp;

    let seeds = &[DUEL_SEED.as_bytes(), duel_id.as_ref(), &[bump]];
    let signer_seeds = &[&seeds[..]];

    transfer(
        CpiContext::new_with_signer(
            token_program,
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.challenger_token_account.to_account_info(),
                authority: duel_info,
            },
            signer_seeds,
        ),
        stake_amount,
    )?;

    Ok(())
}
