import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { AuthForm } from "../auth-form";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/videos");
  return <AuthForm mode="register" />;
}
