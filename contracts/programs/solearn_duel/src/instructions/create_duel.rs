use anchor_lang::prelude::*;
use anchor_spl::token::{
    Transfer, transfer,
};

use crate::error::*;
use crate::state::*;
use crate::CreateDuel;

/// Creates a new duel and locks the challenger's stake.
pub fn handler(
    ctx: Context<CreateDuel>,
    stake_amount: u64,
    question_count: u8,
    time_limit: i64,
    duel_id: [u8; 8],
) -> Result<()> {
    require!(stake_amount > 0, DuelError::InvalidStakeAmount);
    require!(matches!(question_count, 3 | 5 | 10), DuelError::InvalidQuestionCount);
    require!(matches!(time_limit, 180 | 300 | 600), DuelError::InvalidTimeLimit);
    let clock = Clock::get()?;
    let duel = &mut ctx.accounts.duel;

    duel.challenger = ctx.accounts.challenger.key();
    duel.opponent = Pubkey::default();
    duel.resolver = ctx.accounts.resolver.key();
    duel.duel_id = duel_id;
    duel.stake_amount = stake_amount;
    duel.question_count = question_count;
    duel.time_limit = time_limit;
    duel.status = DuelStatus::Created;
    duel.score_a = 0;
    duel.score_b = 0;
    duel.winner = None;
    duel.created_at = clock.unix_timestamp;
    duel.accepted_at = 0;
    duel.started_at = 0;
    duel.completed_at = 0;
    duel.bump = ctx.bumps.duel;

    // Transfer challenger's stake into the escrow token account.
    transfer(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.challenger_token_account.to_account_info(),
                to: ctx.accounts.escrow_token_account.to_account_info(),
                authority: ctx.accounts.challenger.to_account_info(),
            },
        ),
        stake_amount,
    )?;

    Ok(())
}
