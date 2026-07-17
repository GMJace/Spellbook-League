import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-access";

export async function requireAdminUser() {
  const user = await requireUser();

  if (!isAdminEmail(user.email)) {
    redirect("/");
  }

  return user;
}
