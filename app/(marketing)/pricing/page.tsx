import Link from "next/link";
import { product } from "@/lib/config/product";

export default function PricingPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
      <p className="text-zinc-400">
        One monthly plan. Subscribe after you create a {product.name} account.
      </p>
      <article className="rounded-xl border border-zinc-800 p-6">
        <p className="text-sm uppercase tracking-widest text-zinc-500">Monthly</p>
        <h2 className="mt-2 text-2xl font-semibold">{product.name}</h2>
        <p className="mt-2 text-zinc-400">
          Auth, dashboard, and billing — ready so you can ship the idea.
        </p>
        <Link
          href="/sign-up"
          className="mt-6 inline-flex items-center rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white"
        >
          Sign up
        </Link>
      </article>
    </main>
  );
}
