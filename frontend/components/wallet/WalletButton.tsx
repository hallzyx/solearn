"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  useWalletConnection,
  useWalletModalState,
  useBalance,
  useSplToken,
} from "@solana/react-hooks";
import { Wallet, Copy, Check, ChevronDown, ExternalLink } from "lucide-react";
import { USDC_MINT, LAMPORTS_PER_SOL } from "@/lib/solana";

/**
 * Single wallet button that expands into a dropdown with balances,
 * address (with copy), and disconnect.
 */
export function WalletButton() {
  const { isReady, wallet, status, disconnect } = useWalletConnection();
  const modal = useWalletModalState({ closeOnConnect: true });
  const address = wallet?.account?.address;

  const sol = useBalance(address);
  const usdc = useSplToken(USDC_MINT, { owner: address });

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isConnected = status === "connected";

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const copyAddress = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [address]);

  // SSR guard
  if (!isReady) {
    return <div className="h-9 w-36 animate-pulse border-2 border-brand-gray bg-brand-gray" />;
  }

  // Disconnected state
  if (!isConnected) {
    return (
      <>
        <button
          onClick={modal.open}
          disabled={status === "connecting"}
          className="btn-jade !px-4 !py-2 !text-[10px]"
        >
          <Wallet size={14} strokeWidth={3} />
          {status === "connecting" ? "CONECTANDO..." : "CONECTAR WALLET"}
        </button>

        {/* Wallet selection modal */}
        {modal.isOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={modal.close} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="heavy-card w-full max-w-sm">
                <p className="heading-lg mb-4">SELECCIONAR WALLET</p>
                <div className="space-y-2">
                  {modal.connectors.length === 0 && (
                    <p className="label-meta text-muted-foreground">
                      No se encontraron wallets. Instalá Phantom o Solflare.
                    </p>
                  )}
                  {modal.connectors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => modal.connect(c.id)}
                      disabled={status === "connecting"}
                      className="flex w-full items-center gap-3 border-2 border-brand-black bg-surface p-3 text-left text-sm font-bold uppercase tracking-wide transition-all hover:bg-brand-jade/20 disabled:opacity-40"
                    >
                      {c.icon && (
                        <img src={c.icon} alt={c.name} className="h-8 w-8" />
                      )}
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
                <button onClick={modal.close} className="btn-violet mt-4 w-full justify-center !py-2">
                  CANCELAR
                </button>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // Connected state — single button + dropdown
  const short = address ? `${address.slice(0, 4)}..${address.slice(-4)}` : "";

  const solBalance = sol.lamports !== null
    ? `${(Number(sol.lamports) / Number(LAMPORTS_PER_SOL)).toFixed(3)} SOL`
    : "...";

  const usdcBalance = usdc.balance?.uiAmount
    ? `${usdc.balance.uiAmount} USDC`
    : "...";

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="btn-jade !px-3 !py-2 !text-[10px]"
      >
        <Wallet size={14} strokeWidth={3} />
        {short}
        <ChevronDown
          size={12}
          strokeWidth={3}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 border-2 border-brand-black bg-white shadow-[6px_6px_0px_0px_#000] z-50">
          {/* Address with copy */}
          <div className="border-b-2 border-brand-gray p-3">
            <div className="flex items-center justify-between">
              <span className="label-meta text-muted-foreground">ADDRESS</span>
              <button
                onClick={copyAddress}
                className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide hover:text-brand-violet"
              >
                {copied ? (
                  <Check size={12} strokeWidth={3} className="text-brand-jade" />
                ) : (
                  <Copy size={12} strokeWidth={3} />
                )}
                {copied ? "COPIADO" : "COPIAR"}
              </button>
            </div>
            <p className="mt-1 font-mono text-xs font-bold tracking-tight break-all">
              {address}
            </p>
          </div>

          {/* Balances */}
          <div className="border-b-2 border-brand-gray p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="label-meta text-muted-foreground">SOL</span>
              <span className="text-sm font-bold uppercase tracking-tight">
                {sol.fetching ? "..." : solBalance}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="label-meta text-muted-foreground">USDC</span>
              <span className="text-sm font-bold uppercase tracking-tight text-brand-jade">
                {usdc.isFetching ? "..." : usdcBalance}
              </span>
            </div>
          </div>

          {/* Disconnect */}
          <button
            onClick={() => {
              setOpen(false);
              disconnect();
            }}
            className="flex w-full items-center justify-center gap-2 border-b-2 border-brand-black bg-brand-gray p-3 text-xs font-bold uppercase tracking-wide hover:bg-destructive hover:text-white transition-colors"
          >
            DESCONECTAR WALLET
          </button>
        </div>
      )}
    </div>
  );
}
