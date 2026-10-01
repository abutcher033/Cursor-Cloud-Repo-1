"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function AuthPanel({ next, initialTab }: { next: string; initialTab: "login" | "signup" }) {
  const [tab, setTab] = useState(initialTab);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(fd.get("email") || ""),
      password: String(fd.get("password") || ""),
      redirect: false,
    });
    setPending(false);
    if (res?.error) setError("Email or password doesn’t match.");
    else window.location.href = next;
  }

  async function onSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("confirm") || "");
    const displayName = String(fd.get("displayName") || "").trim();
    const email = String(fd.get("email") || "").trim();
    if (displayName.length < 2) return setError("Display name must be at least 2 characters.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don’t match.");
    setPending(true);
    const reg = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName, website: String(fd.get("website") || "") }),
    });
    const data = (await reg.json().catch(() => ({}))) as { error?: string };
    if (!reg.ok) {
      setPending(false);
      setError(data.error || "Could not create the account.");
      return;
    }
    const res = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (res?.error) setError("Account created, but sign-in failed. Try logging in.");
    else window.location.href = next;
  }

  return (
    <>
      <div className="auth-tabs">
        <a href={`/auth?next=${encodeURIComponent(next)}`} className={tab === "login" ? "on" : undefined} onClick={(e) => { e.preventDefault(); setTab("login"); }}>
          Log in
        </a>
        <a href={`/auth?tab=signup&next=${encodeURIComponent(next)}`} className={tab === "signup" ? "on" : undefined} onClick={(e) => { e.preventDefault(); setTab("signup"); }}>
          Sign up
        </a>
      </div>
      {error ? <div className="alert" role="alert">{error}</div> : null}
      {tab === "login" ? (
        <form className="card" onSubmit={onLogin}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required placeholder="casey@locallife.app" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
          </div>
          <button className="primary" type="submit" disabled={pending}>{pending ? "Signing in…" : "Log in"}</button>
          <p className="small" style={{ marginTop: 10 }}>
            Local demo: casey@locallife.app / localfun-demo. Jamie and Riley use the same password.
          </p>
        </form>
      ) : (
        <form className="card" onSubmit={onSignup}>
          <div className="field">
            <label htmlFor="displayName">Display name</label>
            <input id="displayName" name="displayName" type="text" required minLength={2} maxLength={40} autoComplete="nickname" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
          </div>
          <input name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px" }} aria-hidden="true" />
          <button className="primary" type="submit" disabled={pending}>{pending ? "Creating…" : "Create account"}</button>
        </form>
      )}
    </>
  );
}
