import { notFound } from "next/navigation";
import { AccountWelcome } from "@/components/account-welcome";

export default function WelcomePreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <AccountWelcome preview />;
}
