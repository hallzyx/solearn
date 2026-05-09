use anchor_lang::prelude::*;
use anchor_spl::token::{
    Transfer, transfer,
};

use crate::constants::*;
use crate::error::*;
use crate::state::*;
use crate::ResolveDuel;

/// Resolves a completed duel by submitting scores and distributing the pot.
pub fn handler(ctx: Context<ResolveDuel>, score_a: u8, score_b: u8) -> Result<()> {
    let clock = Clock::get()?;

    // Capture AccountInfo and read-only fields BEFORE mutable borrow.
    let duel_info = ctx.accounts.duel.to_account_info();
    let resolver_key = ctx.accounts.resolver.key();
    let token_program = ctx.accounts.token_program.key();

    let duel = &mut ctx.accounts.duel;

    require!(resolver_key == duel.resolver, DuelError::NotResolver);
    require!(
        duel.status == DuelStatus::Accepted || duel.status == DuelStatus::InProgress,
        DuelError::InvalidStatus
    );
    require!(score_a <= duel.question_count, DuelError::InvalidScore);
    require!(score_b <= duel.question_count, DuelError::InvalidScore);

    duel.score_a = score_a;
    duel.score_b = score_b;
    duel.status = DuelStatus::Completed;
    duel.completed_at = clock.unix_timestamp;

    let total_pot = duel.stake_amount
        .checked_mul(2)
        .unwrap();
    let stake_amount = duel.stake_amount;
    let duel_id = duel.duel_id;
    let bump = duel.bump;
    let challenger = duel.challenger;
    let opponent_key = duel.opponent;

    let seeds = &[DUEL_SEED.as_bytes(), duel_id.as_ref(), &[bump]];
    let signer_seeds = &[&seeds[..]];

    if score_a > score_b {
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
            total_pot,
        )?;
        duel.winner = Some(challenger);
    } else if score_b > score_a {
        transfer(
            CpiContext::new_with_signer(
                token_program,
                Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.opponent_token_account.to_account_info(),
                    authority: duel_info,
                },
                signer_seeds,
            ),
            total_pot,
        )?;
        duel.winner = Some(opponent_key);
    } else {
        // Tie: return each player's stake.
        transfer(
            CpiContext::new_with_signer(
                token_program,
                Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.challenger_token_account.to_account_info(),
                    authority: duel_info.clone(),
                },
                signer_seeds,
            ),
            stake_amount,
        )?;
        transfer(
            CpiContext::new_with_signer(
                token_program,
                Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.opponent_token_account.to_account_info(),
                    authority: duel_info,
                },
                signer_seeds,
            ),
            stake_amount,
        )?;
        duel.winner = None;
    }

    Ok(())
}
