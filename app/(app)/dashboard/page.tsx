import { hasActiveSubscription } from "@/lib/dal/subscription";
import { requireUser } from "@/lib/dal/user";

export default async function DashboardPage() {
  const user = await requireUser();
  const entitled = await hasActiveSubscription(user.id);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-zinc-400">
        Welcome{user.name ? `, ${user.name}` : ""}. This is your app home —
        domain features go here.
      </p>
      {entitled ? (
        <section className="rounded-md border border-zinc-800 p-4">
          <h2 className="text-sm font-medium">Paid feature</h2>
          <p className="text-sm text-zinc-400">Included with an active subscription.</p>
        </section>
      ) : null}
    </main>
  );
}
