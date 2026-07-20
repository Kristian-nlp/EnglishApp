import { auth } from "@/auth";

/**
 * Server-side session resolution (FR-109). Every API route resolves the user
 * from the session — no user id is ever accepted from the client body.
 */

export class UnauthorizedError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** The authenticated user's id, or throw. Use at the top of every route. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError();
  return userId;
}

/** The full session user, or null when signed out. */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
