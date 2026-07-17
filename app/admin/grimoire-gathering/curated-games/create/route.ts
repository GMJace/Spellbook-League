import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createCuratedGameRedirectPath } from "@/app/admin/grimoire-gathering/curated-game-mutations";
import { isAdminEmail } from "@/lib/admin-access";

export async function POST(request: Request) {
  const session = await auth();

  if (!isAdminEmail(session?.user?.email)) {
    const fallbackPath = session?.user?.email ? "/" : "/login";
    return NextResponse.redirect(new URL(fallbackPath, request.url), { status: 303 });
  }

  const formData = await request.formData();
  const redirectPath = await createCuratedGameRedirectPath(formData);

  return NextResponse.redirect(new URL(redirectPath, request.url), { status: 303 });
}
