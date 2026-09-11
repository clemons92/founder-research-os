import Link from "next/link";
import { product } from "@/lib/config/product";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          {product.name}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/pricing" className="text-zinc-300 hover:text-white">
            Pricing
          </Link>
          <Link href="/sign-in" className="text-zinc-300 hover:text-white">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md bg-zinc-100 px-3 py-1.5 font-medium text-zinc-950 hover:bg-white"
          >
            Sign up
          </Link>
        </nav>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
