import { product } from "@/lib/config/product";
import { requireUser } from "@/lib/dal/user";

export default async function BillingPage() {
  await requireUser();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
      <p className="text-zinc-400">
        Subscribe coming soon. {product.name} uses one monthly plan — checkout
        lands in the next slice.
      </p>
    </main>
  );
}
