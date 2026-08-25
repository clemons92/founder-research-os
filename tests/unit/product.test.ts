import { describe, expect, it } from "vitest";
import { product } from "@/lib/config/product";

describe("product", () => {
  it("exposes a rebrandable name and tagline", () => {
    expect(product.name.length).toBeGreaterThan(0);
    expect(product.tagline.length).toBeGreaterThan(0);
    expect(product.name).not.toMatch(/Indie Research/i);
  });
});
