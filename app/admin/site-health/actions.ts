"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { logSiteError, runSiteHealthCheck } from "@/lib/site-monitoring-server";

export async function runSiteHealthCheckAction() {
  const adminUser = await requireAdminUser();

  try {
    await runSiteHealthCheck(prisma, {
      triggeredByUserId: adminUser.id,
    });
  } catch (error) {
    await logSiteError(prisma, {
      source: "admin.site-health.run",
      error,
      details: [`triggeredByUserId=${adminUser.id}`],
      requestPath: "/admin/site-health",
    });
    redirect("/admin/site-health?health=failed");
  }

  revalidatePath("/admin/site-health");
  redirect("/admin/site-health?health=ran");
}
