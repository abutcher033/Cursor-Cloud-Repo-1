import { AuthPanel } from "@/components/AuthPanel";
import { one } from "@/lib/query";
import { safeNext } from "@/lib/text";

export default function AuthPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const next = safeNext(one(searchParams.next), "/settings");
  const tab = one(searchParams.tab) === "signup" ? "signup" : "login";
  return (
    <>
      <h1>Sign in</h1>
      <p className="sub">Email and password. No anonymous reviews. Guests can still browse.</p>
      <AuthPanel next={next} initialTab={tab} />
    </>
  );
}
