"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, LoaderCircle, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function VendorInviteCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();

  useEffect(() => {
    async function activate() {
      const supabase = createClient();
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const code = query.get("code");
      const tokenHash = query.get("token_hash");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      let message: string | undefined;
      if (accessToken && refreshToken) message = (await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })).error?.message;
      else if (code) message = (await supabase.auth.exchangeCodeForSession(code)).error?.message;
      else if (tokenHash) message = (await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" })).error?.message;
      else if (!(await supabase.auth.getSession()).data.session) message = "The invitation link is incomplete.";
      if (message) { setError(message); return; }
      const activation = await supabase.rpc("activate_my_vendor_access");
      if (activation.error) { setError(activation.error.message); return; }
      router.replace("/reset-password");
      router.refresh();
    }
    void activate();
  }, [router]);

  return <main className="grid min-h-screen place-items-center bg-mist p-6"><div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-xl">{error ? <><CircleAlert className="mx-auto text-red-600" size={30} /><h1 className="mt-5 text-2xl font-bold">Invitation could not be accepted</h1><p className="mt-3 text-sm text-muted">{error}</p><a href="/login" className="mt-7 flex h-11 items-center justify-center rounded-xl bg-ink text-sm font-bold text-white">Return to sign in</a></> : <><LoaderCircle className="mx-auto animate-spin text-blue-600" size={30} /><h1 className="mt-5 text-2xl font-bold">Activating vendor access</h1><p className="mt-3 text-sm text-muted">Your secure portal is being prepared.</p><p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted"><ShieldCheck size={14} /> Verifying vendor scope</p></>}</div></main>;
}
