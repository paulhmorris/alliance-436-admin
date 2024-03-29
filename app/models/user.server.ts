import type { Password, User } from "@prisma/client";
import bcrypt from "bcryptjs";

import { UserService } from "~/services/UserService.server";

export async function verifyLogin(username: NonNullable<User["username"]>, password: Password["hash"]) {
  const userWithPassword = await UserService.getUserByUsername(username, {
    include: { password: true },
  });

  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }

  const isValid = await bcrypt.compare(password, userWithPassword.password.hash);

  if (!isValid) {
    return null;
  }

  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}
