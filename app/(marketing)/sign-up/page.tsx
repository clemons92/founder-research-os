import Link from "next/link";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
      <SignUpForm />
      <p className="text-sm text-zinc-400">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-zinc-100 underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
