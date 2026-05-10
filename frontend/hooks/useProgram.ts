/**
 * React hooks for interacting with the Solearn Solana program.
 * Uses framework-kit's useSendTransaction for wallet signing.
 */

"use client";

import { useSendTransaction } from "@solana/react-hooks";
import { useCallback } from "react";
import { address } from "@solana/kit";
import {
  createDuelData,
  acceptDuelData,
  SOLEARN_PROGRAM,
  USDC_MINT_ADDR,
  TOKEN_PROGRAM_ADDR,
} from "@/lib/solana-instructions";

/** Convert an action address string to the Address type */
function addr(s: string) {
  return address(s);
}

/**
 * Hook to send a create_duel transaction.
 */
export function useCreateDuel() {
  const { send, isSending, signature, error, status } = useSendTransaction();

  const execute = useCallback(
    async (params: {
      challenger: string;
      resolver: string;
      duelPda: string;
      escrowPda: string;
      challengerAta: string;
      duelId: number[];
      stakeAmount: number;
      questionCount: number;
      timeLimit: number;
    }) => {
      const data = createDuelData(params.stakeAmount, params.questionCount, params.timeLimit, params.duelId);

      try {
        await send({
          instructions: [
            {
              programAddress: addr(SOLEARN_PROGRAM),
              accounts: [
                { address: addr(params.challenger), role: 2 },
                { address: addr(params.resolver), role: 0 },
                { address: addr(params.duelPda), role: 1 },
                { address: addr(params.escrowPda), role: 1 },
                { address: addr(USDC_MINT_ADDR), role: 0 },
                { address: addr(params.challengerAta), role: 1 },
                { address: addr(TOKEN_PROGRAM_ADDR), role: 0 },
                { address: addr("11111111111111111111111111111111"), role: 0 },
              ],
              data,
            },
          ],
          feePayer: addr(params.challenger),
        });
      } catch (e: any) {
        console.error("❌ TX ERROR:", e);
        console.error("   transactionPlanResult:", e.transactionPlanResult ?? "N/A");
        console.error("   logs:", e.logs ?? "N/A");
        console.error("   cause:", e.cause ?? "N/A");
        throw e;
      }
    },
    [send],
  );

  return { execute, isSending, signature, error, status };
}

/**
 * Hook to send an accept_duel transaction.
 */
export function useAcceptDuel() {
  const { send, isSending, signature, error, status } = useSendTransaction();

  const execute = useCallback(
    async (params: {
      opponent: string;
      opponentAta: string;
      duelPda: string;
      escrowPda: string;
    }) => {
      const data = acceptDuelData();
      try {
        await send({
          instructions: [
            {
              programAddress: addr(SOLEARN_PROGRAM),
              accounts: [
                { address: addr(params.opponent), role: 2 },
                { address: addr(params.duelPda), role: 1 },
                { address: addr(params.escrowPda), role: 1 },
                { address: addr(USDC_MINT_ADDR), role: 0 },
                { address: addr(params.opponentAta), role: 1 },
                { address: addr(TOKEN_PROGRAM_ADDR), role: 0 },
              ],
              data,
            },
          ],
          feePayer: addr(params.opponent),
        });
      } catch (e: any) {
        console.error("❌ TX ERROR:", e);
        console.error("   transactionPlanResult:", e.transactionPlanResult ?? "N/A");
        console.error("   logs:", e.logs ?? "N/A");
        console.error("   cause:", e.cause ?? "N/A");
        throw e;
      }
    },
    [send],
  );

  return { execute, isSending, signature, error, status };
}
