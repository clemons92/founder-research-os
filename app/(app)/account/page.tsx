import { requireUser } from "@/lib/dal/user";

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-zinc-500">Name</dt>
          <dd>{user.name || "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Email</dt>
          <dd>{user.email}</dd>
        </div>
      </dl>
    </main>
  );
}
