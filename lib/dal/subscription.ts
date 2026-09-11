import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireUser, type UserDTO } from "@/lib/dal/user";
import { isEntitlingStatus } from "@/lib/payments/sync";

export type SubscriptionEntitlementRow = {
  status: string;
  currentPeriodEnd: Date;
};

export type LoadSubscriptionRow = (
  userId: string,
) => Promise<SubscriptionEntitlementRow | null>;

export function createHasActiveSubscription(loadRow: LoadSubscriptionRow) {
  return async (userId: string, now: Date = new Date()): Promise<boolean> => {
    const row = await loadRow(userId);
    if (!row) {
      return false;
    }
    return isEntitlingStatus(row.status, row.currentPeriodEnd, now);
  };
}

async function loadSubscriptionRow(
  userId: string,
): Promise<SubscriptionEntitlementRow | null> {
  const { db } = await import("@/lib/db");
  const { subscription } = await import("@/lib/db/schema");
  const rows = await db
    .select({
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
    })
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .orderBy(desc(subscription.currentPeriodEnd))
    .limit(1);
  return rows[0] ?? null;
}

export const hasActiveSubscription =
  createHasActiveSubscription(loadSubscriptionRow);

export async function requireActiveSubscription(): Promise<UserDTO> {
  const user = await requireUser();
  const entitled = await hasActiveSubscription(user.id);
  if (!entitled) {
    redirect("/billing");
  }
  return user;
}
