import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Exercise the real HTTP handler and configured hook without PostgreSQL.
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("better-auth/adapters/drizzle", async () => {
  const { memoryAdapter } = await import("better-auth/adapters/memory");
  return { drizzleAdapter: () => memoryAdapter({ user: [], account: [], session: [], verification: [] }) };
});

let auth: typeof import("./auth").auth;
beforeAll(async () => {
  vi.stubEnv("BETTER_AUTH_SECRET", "test-only-secret-with-at-least-thirty-two-characters");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  auth = (await import("./auth")).auth;
});
afterAll(() => vi.unstubAllEnvs());

async function signUp(inviteCode?: unknown) {
  return auth.handler(new Request("http://localhost:3000/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
    body: JSON.stringify({ name: "Test Player", email: "player@example.com", password: "tennis-password-123", inviteCode }),
  }));
}

describe("registration invitation enforcement", () => {
  it("rejects missing, incorrect and malformed codes through the HTTP endpoint", async () => {
    vi.stubEnv("INVITE_CODE", "private-invite");
    for (const code of [undefined, "wrong", { code: "private-invite" }]) {
      expect((await signUp(code)).status).toBe(403);
    }
  });

  it("fails closed when the server has no invite code", async () => {
    vi.stubEnv("INVITE_CODE", "");
    expect((await signUp("private-invite")).status).toBe(403);
  });

  it("allows a correct request-only code and creates a session", async () => {
    vi.stubEnv("INVITE_CODE", "private-invite");
    const response = await signUp("private-invite");
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.user.name).toBe("Test Player");
    expect(result.user).not.toHaveProperty("inviteCode");
    expect(response.headers.get("set-cookie")).toContain("session_token");
  });
});
