import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { account, session, subscription } from "@/lib/db/schema";

describe("schema foreign keys", () => {
  it("references user.id from session, account, and subscription", () => {
    const sessionConfig = getTableConfig(session);
    const accountConfig = getTableConfig(account);
    const subscriptionConfig = getTableConfig(subscription);
    expect(sessionConfig.foreignKeys).toHaveLength(1);
    expect(accountConfig.foreignKeys).toHaveLength(1);
    expect(subscriptionConfig.foreignKeys).toHaveLength(1);
    expect(sessionConfig.foreignKeys[0]?.onDelete).toBe("cascade");
  });
});
