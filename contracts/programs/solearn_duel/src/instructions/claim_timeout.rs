use anchor_lang::prelude::*;
use anchor_spl::token::{
    Transfer, transfer,
};

use crate::constants::*;
use crate::error::*;
use crate::state::*;
use crate::ClaimTimeout;

/// Claims the full pot for the active player after the opponent abandons.
pub fn handler(ctx: Context<ClaimTimeout>) -> Result<()> {
    let clock = Clock::get()?;

    // Capture all AccountInfos and values before mutable borrow.
    let duel_info = ctx.accounts.duel.to_account_info();
    let resolver_key = ctx.accounts.resolver.key();
    let token_program = ctx.accounts.token_program.key();

    let duel = &mut ctx.accounts.duel;

    require!(resolver_key == duel.resolver, DuelError::NotResolver);
    require!(
        duel.status == DuelStatus::Accepted || duel.status == DuelStatus::InProgress,
        DuelError::InvalidStatus
    );

    let deadline = duel.started_at.checked_add(duel.time_limit).unwrap();
    require!(
        clock.unix_timestamp >= deadline,
        DuelError::TimeoutNotReached
    );

    duel.status = DuelStatus::TimedOut;
    duel.completed_at = clock.unix_timestamp;
    duel.winner = Some(ctx.accounts.claimer_token_account.owner);

    let total_pot = duel.stake_amount
        .checked_mul(2)
        .unwrap();
    let duel_id = duel.duel_id;
    let bump = duel.bump;

    let seeds = &[DUEL_SEED.as_bytes(), duel_id.as_ref(), &[bump]];
    let signer_seeds = &[&seeds[..]];

    transfer(
        CpiContext::new_with_signer(
            token_program,
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.claimer_token_account.to_account_info(),
                authority: duel_info,
            },
            signer_seeds,
        ),
        total_pot,
    )?;

    Ok(())
}
