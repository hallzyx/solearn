pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("Cj6wPBbQoBZW9GbgAcUtfJEiJZiawiRKzk9JXLTzkfUR");

// ─────────────────────────────────────────────────────────────
//  Account structs (must live at crate root due to Anchor 1.0.2
//  macro bug that generates `crate::__client_accounts_*` paths
//  while the structs were nested inside `crate::instructions`).
// ─────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(stake_amount: u64, question_count: u8, time_limit: i64, duel_id: [u8; 8])]
pub struct CreateDuel<'info> {
    /// The challenger creating the duel.
    #[account(mut)]
    pub challenger: Signer<'info>,

    /// The resolver backend keypair authorized to resolve/claim timeout.
    /// CHECK: Just a pubkey we store, not an account we read.
    pub resolver: UncheckedAccount<'info>,

    /// The duel account PDA.
    #[account(
        init,
        payer = challenger,
        space = Duel::LEN,
        seeds = [DUEL_SEED.as_bytes(), duel_id.as_ref()],
        bump
    )]
    pub duel: Account<'info, Duel>,

    /// The escrow token account (ATA) where stakes are held.
    #[account(
        init,
        payer = challenger,
        token::mint = mint,
        token::authority = duel,
        seeds = [ESCROW_SEED.as_bytes(), duel.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// The USDC/SOL token mint (USDC on devnet = 6 decimals).
    pub mint: Account<'info, Mint>,

    /// Challenger's token account (ATA) to debit the stake from.
    #[account(mut)]
    pub challenger_token_account: Account<'info, TokenAccount>,

    /// Token program (SPL Token or Token-2022).
    pub token_program: Program<'info, Token>,

    /// System program for account creation.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptDuel<'info> {
    #[account(mut)]
    pub opponent: Signer<'info>,

    #[account(
        mut,
        seeds = [DUEL_SEED.as_bytes(), duel.duel_id.as_ref()],
        bump = duel.bump,
    )]
    pub duel: Account<'info, Duel>,

    #[account(
        mut,
        seeds = [ESCROW_SEED.as_bytes(), duel.key().as_ref(), mint.key().as_ref()],
        bump,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub opponent_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(score_a: u8, score_b: u8)]
pub struct ResolveDuel<'info> {
    pub resolver: Signer<'info>,

    #[account(
        mut,
        seeds = [DUEL_SEED.as_bytes(), duel.duel_id.as_ref()],
        bump = duel.bump,
    )]
    pub duel: Account<'info, Duel>,

    #[account(
        mut,
        seeds = [ESCROW_SEED.as_bytes(), duel.key().as_ref(), mint.key().as_ref()],
        bump,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub challenger_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub opponent_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimTimeout<'info> {
    pub resolver: Signer<'info>,

    #[account(
        mut,
        seeds = [DUEL_SEED.as_bytes(), duel.duel_id.as_ref()],
        bump = duel.bump,
    )]
    pub duel: Account<'info, Duel>,

    #[account(
        mut,
        seeds = [ESCROW_SEED.as_bytes(), duel.key().as_ref(), mint.key().as_ref()],
        bump,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub claimer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelDuel<'info> {
    pub challenger: Signer<'info>,

    #[account(
        mut,
        seeds = [DUEL_SEED.as_bytes(), duel.duel_id.as_ref()],
        bump = duel.bump,
    )]
    pub duel: Account<'info, Duel>,

    #[account(
        mut,
        seeds = [ESCROW_SEED.as_bytes(), duel.key().as_ref(), mint.key().as_ref()],
        bump,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub challenger_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseDuel<'info> {
    #[account(
        mut,
        seeds = [DUEL_SEED.as_bytes(), duel.duel_id.as_ref()],
        bump = duel.bump,
    )]
    pub duel: Account<'info, Duel>,

    #[account(
        mut,
        seeds = [ESCROW_SEED.as_bytes(), duel.key().as_ref(), mint.key().as_ref()],
        bump,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    /// Where rent refunds go (can be challenger, opponent, or resolver).
    #[account(mut)]
    pub destination: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
}

// ─────────────────────────────────────────────────────────────
//  Program entrypoints
// ─────────────────────────────────────────────────────────────

/// Solearn — On-chain duel escrow program.
///
/// Two students stake tokens on a quiz duel. A backend resolver triggers
/// score submission; the contract distributes the pot to the winner.
#[program]
pub mod solearn_duel {
    use super::*;

    /// Creates a new duel and locks the challenger's stake.
    /// The challenger specifies question count and time limit.
    pub fn create_duel(
        ctx: Context<CreateDuel>,
        stake_amount: u64,
        question_count: u8,
        time_limit: i64,
        duel_id: [u8; 8],
    ) -> Result<()> {
        instructions::create_duel::handler(ctx, stake_amount, question_count, time_limit, duel_id)
    }

    /// Accepts an open duel and locks the opponent's stake.
    pub fn accept_duel(ctx: Context<AcceptDuel>) -> Result<()> {
        instructions::accept_duel::handler(ctx)
    }

    /// Resolves a completed duel by submitting both players' scores.
    /// The resolver (backend) determines the winner and distributes funds.
    pub fn resolve_duel(
        ctx: Context<ResolveDuel>,
        score_a: u8,
        score_b: u8,
    ) -> Result<()> {
        instructions::resolve_duel::handler(ctx, score_a, score_b)
    }

    /// Claims the full pot after a timeout (opponent abandoned).
    pub fn claim_timeout(ctx: Context<ClaimTimeout>) -> Result<()> {
        instructions::claim_timeout::handler(ctx)
    }

    /// Cancels a duel before it is accepted (challenger only).
    pub fn cancel_duel(ctx: Context<CancelDuel>) -> Result<()> {
        instructions::cancel_duel::handler(ctx)
    }

    /// Closes duel accounts after completion to reclaim rent.
    pub fn close_duel(ctx: Context<CloseDuel>) -> Result<()> {
        instructions::close_duel::handler(ctx)
    }
}
