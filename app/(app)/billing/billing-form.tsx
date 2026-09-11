"use client";

import { useEffect, useState } from "react";
import { openPortal, startCheckout } from "@/app/(app)/actions/billing";
import { Button } from "@/components/ui/button";

export function BillingForm({ entitled }: { entitled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, [redirectUrl]);

  async function onClick() {
    setError(null);
    setPending(true);
    const result = entitled ? await openPortal() : await startCheckout();
    setPending(false);
    if ("url" in result) {
      setRedirectUrl(result.url);
      return;
    }
    setError(result.error);
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button type="button" disabled={pending} onClick={() => void onClick()}>
        {pending
          ? "Working…"
          : entitled
            ? "Manage billing"
            : "Subscribe"}
      </Button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
