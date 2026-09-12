import Link from "next/link";
import { product } from "@/lib/config/product";

export default function LandingPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-24">
      <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
        {product.name}
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        {product.tagline}
      </h1>
      <p className="max-w-xl text-lg text-zinc-400">{product.description}</p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/sign-up"
          className="inline-flex items-center rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white"
        >
          Sign up
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 hover:border-zinc-500"
        >
          See pricing
        </Link>
      </div>
    </main>
  );
}
