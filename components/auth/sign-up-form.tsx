"use client";

import { useState } from "react";
import { z } from "zod";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const signUpSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).trim(),
  email: z.email({ message: "Enter a valid email." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";

export function SignUpForm() {
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    const parsed = signUpSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }

    setErrors({});
    setFormError(null);
    setPending(true);
    const result = await authClient.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      callbackURL: "/dashboard",
    });
    setPending(false);
    if (result.error) {
      setFormError(result.error.message ?? "Could not create account.");
      return;
    }
    window.location.assign("/dashboard");
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(new FormData(event.currentTarget));
      }}
    >
      <Input
        name="name"
        type="text"
        label="Name"
        autoComplete="name"
        required
        error={errors.name}
      />
      <Input
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        error={errors.email}
      />
      <Input
        name="password"
        type="password"
        label="Password"
        autoComplete="new-password"
        required
        error={errors.password}
      />
      {formError ? <p className="text-sm text-red-400">{formError}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
      {googleEnabled ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void authClient.signIn.social({
              provider: "google",
              callbackURL: "/dashboard",
            });
          }}
        >
          Continue with Google
        </Button>
      ) : null}
    </form>
  );
}
