/**
 * Cross-tab synchronization hook using BroadcastChannel.
 *
 * When both players finish the quiz, both tabs are redirected to
 * the result page automatically — no polling needed.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface PlayerStatus {
  player: "challenger" | "opponent";
  status: "finished";
}

/**
 * Opens a BroadcastChannel for the duel, broadcasts "finished"
 * when the local player completes, and redirects when both
 * players have signaled completion.
 */
export function useDuelSync(duelId: string, playerRole: "challenger" | "opponent") {
  const router = useRouter();
  const finished = useRef(false);
  const otherFinished = useRef(false);
  const redirected = useRef(false);

  useEffect(() => {
    const channel = new BroadcastChannel(`solearn-duel-${duelId}`);

    channel.onmessage = (event: MessageEvent<PlayerStatus>) => {
      if (event.data?.status === "finished" && event.data?.player !== playerRole) {
        otherFinished.current = true;
        if (finished.current && !redirected.current) {
          redirected.current = true;
          router.push(`/duels/${duelId}/result`);
        }
      }
    };

    return () => channel.close();
  }, [duelId, playerRole, router]);

  /** Call this when the local player finishes all questions */
  function signalFinished() {
    finished.current = true;
    const channel = new BroadcastChannel(`solearn-duel-${duelId}`);
    channel.postMessage({ player: playerRole, status: "finished" } satisfies PlayerStatus);
    channel.close();

    if (otherFinished.current && !redirected.current) {
      redirected.current = true;
      router.push(`/duels/${duelId}/result`);
    }
  }

  return { signalFinished };
}
