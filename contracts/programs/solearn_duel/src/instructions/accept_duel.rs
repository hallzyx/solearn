use anchor_lang::prelude::*;
use anchor_spl::token::{
    Transfer, transfer,
};

use crate::error::*;
use crate::state::*;
use crate::AcceptDuel;

/// Accepts an open duel and locks the opponent's stake.
pub fn handler(ctx: Context<AcceptDuel>) -> Result<()> {
    let clock = Clock::get()?;
    let duel = &mut ctx.accounts.duel;

    require!(duel.status == DuelStatus::Created, DuelError::InvalidStatus);
    require!(
        ctx.accounts.opponent.key() != duel.challenger,
        DuelError::NotOpponent
    );

    duel.opponent = ctx.accounts.opponent.key();
    duel.status = DuelStatus::Accepted;
    duel.accepted_at = clock.unix_timestamp;
    duel.started_at = clock.unix_timestamp;

    transfer(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.opponent_token_account.to_account_info(),
                to: ctx.accounts.escrow_token_account.to_account_info(),
                authority: ctx.accounts.opponent.to_account_info(),
            },
        ),
        duel.stake_amount,
    )?;

    Ok(())
}
