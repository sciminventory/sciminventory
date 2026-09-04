"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, LoaderCircle, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function InviteCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();

  useEffect(() => {
    async function acceptInvitation() {
      const supabase = createClient();
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const code = query.get("code");
      const tokenHash = query.get("token_hash");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      let sessionError: Error | null = null;
      if (accessToken && refreshToken) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        sessionError = setSessionError;
      } else if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        sessionError = exchangeError;
      } else if (tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });
        sessionError = verifyError;
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session)
          sessionError = new Error("The invitation link is incomplete.");
      }

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      const { error: activationError } = await supabase.rpc(
        "activate_my_invited_memberships",
      );
      if (activationError) {
        setError(activationError.message);
        return;
      }

      router.replace("/reset-password");
      router.refresh();
    }

    void acceptInvitation();
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-mist p-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-[0_24px_70px_rgba(11,31,58,.10)]">
        {error ? (
          <>
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-50 text-red-600">
              <CircleAlert size={21} />
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-[-.04em]">
              Invitation could not be accepted
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">{error}</p>
            <a
              href="/login"
              className="mt-7 flex h-11 items-center justify-center rounded-xl bg-ink text-sm font-bold text-white"
            >
              Return to sign in
            </a>
          </>
        ) : (
          <>
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-accent">
              <LoaderCircle className="animate-spin" size={21} />
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-[-.04em]">
              Securing your workspace
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              We’re accepting your invitation and preparing password setup.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted">
              <ShieldCheck size={13} /> Verifying organization access
            </div>
          </>
        )}
      </div>
    </main>
  );
}
