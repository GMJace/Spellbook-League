import { auth } from "@/auth";
import { createCuratedGameRedirectPath } from "@/app/admin/grimoire-gathering/curated-game-mutations";
import { isAdminEmail } from "@/lib/admin-access";
import { redirectWithinSite } from "@/lib/site-redirect";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();

  if (!isAdminEmail(session?.user?.email) && !session?.user?.roles?.includes("EVENT_ADMIN")) {
    const fallbackPath = session?.user?.email ? "/" : "/login";
    return redirectWithinSite(fallbackPath);
  }

  const formData = await request.formData();
  const redirectPath = await createCuratedGameRedirectPath(formData);

  return redirectWithinSite(redirectPath);
}
