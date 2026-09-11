import { requireUser } from "@/lib/dal/user";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-zinc-400">
        Welcome{user.name ? `, ${user.name}` : ""}. This is your app home —
        domain features go here.
      </p>
    </main>
  );
}
