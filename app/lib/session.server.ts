import { User, UserRole } from "@prisma/client";
import type { Session } from "@remix-run/node";
import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { createThemeSessionResolver } from "remix-themes";

import { forbidden, unauthorized } from "~/lib/responses.server";
import { getUserById } from "~/models/user.server";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
  },
});
export const themeSessionResolver = createThemeSessionResolver(sessionStorage);

const USER_SESSION_KEY = "userId";

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export function commitSession(session: Session) {
  return sessionStorage.commitSession(session);
}

export async function getUserId(request: Request): Promise<User["id"] | undefined> {
  const session = await getSession(request);
  const userId = session.get(USER_SESSION_KEY) as User["id"] | undefined;
  return userId;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (userId === undefined) return null;

  const user = await getUserById(userId);
  if (user) return user;

  throw await logout(request);
}

export async function requireUserId(request: Request, redirectTo: string = new URL(request.url).pathname) {
  const userId = await getUserId(request);
  if (!userId) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams.toString()}`);
  }
  return userId;
}

export async function requireUser(request: Request, allowedRoles?: Array<UserRole>) {
  const defaultAllowedRoles: Array<UserRole> = ["USER", "ADMIN"];
  const userId = await requireUserId(request);

  const user = await getUserById(userId);

  if (user && user.role === UserRole.SUPERADMIN) {
    return user;
  }

  if (user && allowedRoles) {
    if (allowedRoles.includes(user.role)) {
      return user;
    }
    throw unauthorized({ user });
  }

  if (user && defaultAllowedRoles.includes(user.role)) {
    return user;
  }
  throw forbidden({ user });
}

export async function createUserSession({
  request,
  userId,
  remember,
  redirectTo,
}: {
  request: Request;
  userId: string;
  remember: boolean;
  redirectTo: string;
}) {
  const session = await getSession(request);
  session.set(USER_SESSION_KEY, userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session, {
        maxAge: remember
          ? 60 * 60 * 24 * 7 // 7 days
          : undefined,
      }),
    },
  });
}

export async function logout(request: Request) {
  const session = await getSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
