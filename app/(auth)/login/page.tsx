import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { AuthForm } from "../auth-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/videos");
  return <AuthForm mode="login" />;
}
