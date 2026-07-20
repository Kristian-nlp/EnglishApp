import type { DefaultSession } from "next-auth";

// Ensure the session user carries the DB id used for row-level scoping (FR-109).
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
