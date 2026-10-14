"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

const credentials = z.object({ email: z.email(), password: z.string().min(8).max(128) });
const registration = credentials.extend({ name: z.string().trim().min(1), inviteCode: z.string().min(1) });

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const registering = mode === "register";
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = (registering ? registration : credentials).safeParse(values);
    if (!parsed.success) {
      setError("入力内容を確認してください。パスワードは8〜128文字です。");
      return;
    }
    setPending(true);
    try {
      if (registering) {
        // inviteCode is request-only; it is never stored as a user field.
        const body = registration.parse(values);
        const result = await authClient.signUp.email(body, { body: { inviteCode: body.inviteCode } });
        if (result.error) {
          setError("登録できませんでした。入力内容と招待コードを確認してください。");
          return;
        }
      } else {
        const result = await authClient.signIn.email(parsed.data);
        if (result.error) {
          setError("ログインできませんでした。メールとパスワードを確認してください。");
          return;
        }
      }
      router.replace("/videos");
      router.refresh();
    } catch {
      setError("通信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setPending(false);
    }
  }

  const inputClass = "mt-1 w-full rounded border border-slate-300 px-3 py-2";
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <div>
        <p className="mb-2 text-sm text-slate-600">smashsight</p>
        <h1 className="text-2xl font-bold">{registering ? "新規登録" : "ログイン"}</h1>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={pending} className="space-y-4 disabled:opacity-60">
          {registering && <label className="block">表示名<input className={inputClass} name="name" autoComplete="name" required /></label>}
          <label className="block">メールアドレス<input className={inputClass} name="email" type="email" autoComplete="email" required /></label>
          <label className="block">パスワード<input className={inputClass} name="password" type="password" autoComplete={registering ? "new-password" : "current-password"} minLength={8} maxLength={128} required /></label>
          {registering && <label className="block">招待コード<input className={inputClass} name="inviteCode" type="password" autoComplete="off" required /></label>}
          <button type="submit" className="w-full rounded bg-slate-900 px-4 py-2 text-white">{pending ? "送信中…" : registering ? "登録する" : "ログイン"}</button>
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </form>
      <Link className="text-sm underline" href={registering ? "/login" : "/register"}>{registering ? "ログインへ" : "招待コードをお持ちの方はこちら"}</Link>
    </main>
  );
}
