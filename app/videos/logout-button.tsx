"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setPending(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError("ログアウトできませんでした。再度お試しください。");
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setError("通信に失敗しました。再度お試しください。");
    } finally {
      setPending(false);
    }
  }

  return <div>
    <button type="button" onClick={logout} disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60">{pending ? "ログアウト中…" : "ログアウト"}</button>
    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
  </div>;
}
