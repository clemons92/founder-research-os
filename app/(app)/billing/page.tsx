import { BillingForm } from "@/app/(app)/billing/billing-form";
import { product } from "@/lib/config/product";
import { hasActiveSubscription } from "@/lib/dal/subscription";
import { requireUser } from "@/lib/dal/user";
import { isStripeConfigured } from "@/lib/payments/stripe";

export default async function BillingPage() {
  const user = await requireUser();
  const entitled = await hasActiveSubscription(user.id);
  const billingReady = isStripeConfigured();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
      {billingReady ? (
        <>
          <p className="text-zinc-400">
            {entitled
              ? `Your ${product.name} subscription is active. Manage it in the Stripe portal.`
              : `${product.name} is one monthly plan. Subscribe to unlock paid features.`}
          </p>
          <BillingForm entitled={entitled} />
        </>
      ) : (
        <p className="text-zinc-400">Billing isn&apos;t set up yet</p>
      )}
    </main>
  );
}
