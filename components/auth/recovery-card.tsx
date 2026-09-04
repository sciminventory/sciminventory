import {
  ArrowLeft,
  CircleAlert,
  KeyRound,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { AuthVisual } from "@/components/auth/auth-card";
import { BrandMark } from "@/components/brand-mark";
import { PasswordField } from "@/components/auth/password-field";
import { SubmitButton } from "@/components/auth/submit-button";

type RecoveryCardProps = {
  mode: "request" | "reset";
  message?: string;
  action: (formData: FormData) => Promise<void>;
};

export function RecoveryCard({ mode, message, action }: RecoveryCardProps) {
  const resetting = mode === "reset";

  return (
    <main className="grid min-h-screen w-full grid-cols-1 overflow-x-hidden bg-white lg:grid-cols-[minmax(0,1.15fr)_minmax(460px,.85fr)]">
      <AuthVisual showLogo={!resetting} />
      <section className="relative flex min-h-screen min-w-0 flex-col bg-white px-6 py-6 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center justify-between">
          {!resetting && <BrandMark className="lg:hidden" />}
          <Link
            href="/login"
            className="ml-auto inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-muted transition hover:bg-mist hover:text-ink"
          >
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>

        <div className="auth-enter mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-12">
          <div className="mb-8 flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-accent ring-1 ring-blue-100">
            {resetting ? <KeyRound size={21} /> : <Mail size={21} />}
          </div>
          <p className="eyebrow text-accent">Account recovery</p>
          <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.08] tracking-[-.06em]">
            {resetting ? "Choose a new password." : "Reset your password."}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted">
            {resetting
              ? "Use a strong, unique password for your operational workspace."
              : "Enter your work email and we’ll send a secure recovery link if your account exists."}
          </p>

          {message && (
            <div
              className="mt-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-5 text-blue-900"
              role="status"
            >
              <CircleAlert className="mt-0.5 shrink-0" size={16} />
              {message}
            </div>
          )}

          <form action={action} className="mt-8 space-y-5">
            {resetting ? (
              <>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold">
                    New password
                  </span>
                  <PasswordField
                    name="password"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold">
                    Confirm password
                  </span>
                  <PasswordField
                    name="confirmPassword"
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                  />
                </label>
              </>
            ) : (
              <label className="block">
                <span className="mb-2 block text-xs font-bold">Work email</span>
                <span className="relative block">
                  <Mail
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                    size={16}
                  />
                  <input
                    required
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    className="h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-accent focus:ring-4 focus:ring-blue-100"
                  />
                </span>
              </label>
            )}
            <SubmitButton
              label={resetting ? "Update password" : "Send recovery link"}
            />
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-muted">
            <ShieldCheck size={13} /> Secure, time-limited account recovery
          </div>
        </div>
      </section>
    </main>
  );
}
import Link from "next/link";
