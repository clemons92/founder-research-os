import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { product } from "@/lib/config/product";
import { requireUser } from "@/lib/dal/user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          {product.name}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-zinc-300 hover:text-white">
            Dashboard
          </Link>
          <Link href="/account" className="text-zinc-300 hover:text-white">
            Account
          </Link>
          <Link href="/billing" className="text-zinc-300 hover:text-white">
            Billing
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-400 sm:inline">{user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
