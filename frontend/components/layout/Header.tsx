import { SolearnLogo } from "@/components/ui/logo";
import { WalletButton } from "@/components/wallet/WalletButton";

/**
 * Main navigation header.
 * Solearn logo on the left, wallet widget (single button + dropdown) on the right.
 */
export function Header() {
  return (
    <header className="border-b-2 border-brand-black bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <SolearnLogo />
        <WalletButton />
      </div>
    </header>
  );
}
