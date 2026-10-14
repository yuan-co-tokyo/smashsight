import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export default async function Home() {
  redirect(await getCurrentUser() ? "/videos" : "/login");
}
