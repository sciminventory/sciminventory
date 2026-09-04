"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type MfaFactor = {
  id: string;
  friendly_name?: string;
  status: "verified" | "unverified";
  created_at: string;
};

type Enrollment = { factorId: string; qrCode: string; secret: string };

export function MfaSetupPanel({ required = false, verifiedFactors = [] }: { required?: boolean; verifiedFactors?: MfaFactor[] }) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [factors, setFactors] = useState(verifiedFactors);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copySetupKey() {
    if (!enrollment) return;

    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2500);
    } catch {
      setCopyStatus("failed");
    }
  }

  async function startEnrollment() {
    setBusy(true); setError("");
    const client = createClient();
    const listed = await client.auth.mfa.listFactors();
    for (const factor of listed.data?.all ?? []) {
      if (factor.status === "unverified") await client.auth.mfa.unenroll({ factorId: factor.id });
    }
    const { data, error: enrollError } = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Scim-Inventory",
      issuer: "Scim-Inventory",
    });
    setBusy(false);
    if (enrollError || !data.totp) { setError(enrollError?.message ?? "Authenticator setup could not start."); return; }
    setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verifyEnrollment() {
    if (!enrollment || !/^\d{6}$/.test(code)) { setError("Enter the 6-digit code from your authenticator app."); return; }
    setBusy(true); setError("");
    const client = createClient();
    const { error: verifyError } = await client.auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code });
    setBusy(false);
    if (verifyError) { setError(verifyError.message); return; }
    router.replace(required ? "/dashboard" : "/dashboard/security");
    router.refresh();
  }

  async function removeFactor(factorId: string) {
    if (!window.confirm("Remove this authenticator factor? Privileged accounts must enroll again before accessing the workspace.")) return;
    setBusy(true); setError("");
    const client = createClient();
    const { error: removeError } = await client.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (removeError) { setError(removeError.message); return; }
    setFactors((current) => current.filter((factor) => factor.id !== factorId));
    router.refresh();
  }

  if (factors.length && !enrollment) {
    return <div className="rounded-2xl border border-line bg-white p-6 shadow-sm"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck size={21} /></span><div><h2 className="text-base font-bold">Authenticator protection is enabled</h2><p className="mt-2 text-xs leading-6 text-muted">Your account requires a rotating verification code after password sign-in.</p></div></div><div className="mt-6 space-y-3">{factors.map((factor) => <div key={factor.id} className="flex items-center gap-3 rounded-xl border border-line p-4"><Smartphone className="text-blue-600" size={17} /><div className="min-w-0 flex-1"><p className="text-xs font-bold">{factor.friendly_name || "Authenticator app"}</p><p className="mt-1 font-mono text-[8px] uppercase text-emerald-700">Verified · added {new Date(factor.created_at).toLocaleDateString()}</p></div><button type="button" disabled={busy} onClick={() => removeFactor(factor.id)} className="grid size-9 place-items-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50" aria-label="Remove authenticator"><Trash2 size={14} /></button></div>)}</div>{error && <ErrorMessage>{error}</ErrorMessage>}</div>;
  }

  return <div className="rounded-2xl border border-line bg-white p-6 shadow-[0_20px_60px_rgba(25,72,133,.08)] sm:p-8"><span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><KeyRound size={22} /></span><h2 className="mt-5 text-xl font-bold">Set up an authenticator app</h2><p className="mt-3 text-sm leading-7 text-muted">Use an authenticator app on your phone to generate a new 6-digit security code every 30 seconds.</p>{!enrollment ? <div className="mt-7"><ol className="space-y-3 text-xs text-muted"><Step number="1">Install or open an authenticator application.</Step><Step number="2">Select Add account or Scan QR code.</Step><Step number="3">Verify one generated code to activate protection.</Step></ol><button type="button" onClick={startEnrollment} disabled={busy} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={16} /> : <Smartphone size={16} />} Begin secure setup</button></div> : <div className="mt-7"><div className="grid gap-6 sm:grid-cols-[220px_1fr]"><div className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm"><AuthenticatorQrCode src={enrollment.qrCode} /></div><div><p className="text-xs font-bold">Scan this QR code</p><p className="mt-2 text-[10px] leading-5 text-muted">If scanning is unavailable, enter this setup key manually:</p><button type="button" onClick={copySetupKey} aria-label="Copy manual setup key" className="mt-3 flex w-full items-center gap-2 rounded-xl border border-line bg-mist p-3 text-left font-mono text-[10px] font-bold break-all transition hover:border-blue-300 hover:bg-blue-50"><span className="shrink-0 text-blue-700">{copyStatus === "copied" ? <CheckCircle2 size={13} /> : <Copy size={13} />}</span><span className="min-w-0 flex-1">{enrollment.secret}</span>{copyStatus === "copied" && <span className="shrink-0 font-sans text-[9px] font-bold text-emerald-700">Copied!</span>}</button><p aria-live="polite" className={`mt-2 min-h-4 text-[10px] ${copyStatus === "failed" ? "text-red-700" : "text-emerald-700"}`}>{copyStatus === "copied" ? "Setup key copied to your clipboard." : copyStatus === "failed" ? "Copy failed. Select the key and copy it manually." : ""}</p><label className="mt-3 block"><span className="mb-2 block text-xs font-bold">6-digit verification code</span><input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="h-12 w-full rounded-xl border border-line px-4 text-center font-mono text-lg tracking-[.35em] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label><button type="button" onClick={verifyEnrollment} disabled={busy || code.length !== 6} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Enable MFA</button></div></div></div>}{error && <ErrorMessage>{error}</ErrorMessage>}</div>;
}

export function MfaChallengePanel({ factorId }: { factorId: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function verify() {
    if (!/^\d{6}$/.test(code)) { setError("Enter the 6-digit code from your authenticator app."); return; }
    setBusy(true); setError("");
    const client = createClient();
    const { error: verifyError } = await client.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (verifyError) { setError(verifyError.message); return; }
    router.replace("/dashboard");
    router.refresh();
  }
  return <div><span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><LockKeyhole size={21} /></span><p className="eyebrow mt-7 text-blue-700">Second verification step</p><h1 className="mt-3 text-3xl font-bold tracking-[-.055em]">Enter your security code.</h1><p className="mt-4 text-sm leading-7 text-muted">Open your authenticator app and enter the current 6-digit code to continue.</p><label className="mt-8 block"><span className="mb-2 block text-xs font-bold">Authenticator code</span><input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(event) => event.key === "Enter" && void verify()} inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="000000" className="h-14 w-full rounded-xl border border-line px-4 text-center font-mono text-xl tracking-[.4em] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label><button type="button" onClick={verify} disabled={busy || code.length !== 6} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,.22)] transition hover:bg-blue-700 disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={16} /> : <ShieldCheck size={16} />} Verify and continue</button>{error && <ErrorMessage>{error}</ErrorMessage>}</div>;
}

function Step({ number, children }: { number: string; children: React.ReactNode }) { return <li className="flex items-center gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-50 font-mono text-[9px] font-bold text-blue-700">{number}</span>{children}</li>; }
function AuthenticatorQrCode({ src }: { src: string }) {
  // The authentication API returns a short-lived inline SVG data URL. It must
  // render directly because the framework image optimizer intentionally blocks SVG data URLs.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Authenticator setup QR code" width={220} height={220} className="aspect-square w-full" />;
}
function ErrorMessage({ children }: { children: React.ReactNode }) { return <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">{children}</p>; }
