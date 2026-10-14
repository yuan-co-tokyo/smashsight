import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema/auth";
import { isValidInviteCode } from "@/lib/invite-code";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email" && !isValidInviteCode(ctx.body?.inviteCode, process.env.INVITE_CODE)) {
        throw new APIError("FORBIDDEN", { message: "招待コードが無効です。" });
      }
    }),
  },
});
