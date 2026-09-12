import Link from "next/link";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <SignInForm />
      <p className="text-sm text-zinc-400">
        No account?{" "}
        <Link href="/sign-up" className="text-zinc-100 underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
