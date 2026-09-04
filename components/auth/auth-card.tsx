import type { InputHTMLAttributes } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Boxes,
  Building2,
  Check,
  CircleAlert,
  LockKeyhole,
  Mail,
  PackageCheck,
  ShieldCheck,
  Truck,
  UserRound,
  Warehouse,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { PasswordField } from "@/components/auth/password-field";
import { SubmitButton } from "@/components/auth/submit-button";

type AuthCardProps = {
  mode: "login" | "signup";
  message?: string;
  action: (formData: FormData) => Promise<void>;
};

export function AuthCard({ mode, message, action }: AuthCardProps) {
  const signup = mode === "signup";

  return (
    <main className="grid min-h-screen w-full grid-cols-1 overflow-x-hidden bg-white lg:grid-cols-[minmax(0,1.15fr)_minmax(460px,.85fr)]">
      <AuthVisual showLogo={false} />

      <section className="relative flex min-h-screen min-w-0 flex-col bg-white px-6 py-6 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-muted transition hover:bg-mist hover:text-ink"
          >
            <ArrowLeft size={14} /> Back to website
          </Link>
        </div>

        <div className="auth-enter mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-12">
          <div className="mb-8 flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-accent ring-1 ring-blue-100">
            {signup ? <Building2 size={21} /> : <LockKeyhole size={21} />}
          </div>

          <p className="eyebrow text-accent">
            {signup ? "Create an organization" : "Secure workspace access"}
          </p>
          <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.08] tracking-[-.06em]">
            {signup ? "Build your connected operation." : "Welcome back."}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted">
            {signup
              ? "Create your workspace, configure locations, and bring your team into one operational system."
              : "Enter your work credentials to continue to your supply chain control tower."}
          </p>

          {message && (
            <div
              className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900"
              role="status"
            >
              <CircleAlert className="mt-0.5 shrink-0" size={16} />
              {message}
            </div>
          )}

          <form action={action} className="mt-8 space-y-5">
            {signup && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Field
                  icon={UserRound}
                  label="Full name"
                  name="fullName"
                  placeholder="Maria Santos"
                  autoComplete="name"
                />
                <Field
                  icon={Building2}
                  label="Organization"
                  name="organizationName"
                  placeholder="Northstar Distribution"
                  autoComplete="organization"
                />
              </div>
            )}

            <Field
              icon={Mail}
              label="Work email"
              name="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
            />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold">Password</span>
                {!signup && (
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <PasswordField
                name="password"
                placeholder={
                  signup
                    ? "Create at least 8 characters"
                    : "Enter your password"
                }
                autoComplete={signup ? "new-password" : "current-password"}
              />
              {signup && (
                <p className="mt-2 text-[11px] text-muted">
                  Use at least 8 characters. A longer passphrase is recommended.
                </p>
              )}
            </div>

            <SubmitButton
              label={signup ? "Create workspace" : "Sign in securely"}
            />
          </form>

          {signup && (
            <>
              <div className="relative my-7 flex items-center">
                <div className="h-px flex-1 bg-line" />
                <span className="px-3 text-[10px] font-medium uppercase tracking-[.08em] text-muted">
                  Already set up?
                </span>
                <div className="h-px flex-1 bg-line" />
              </div>

              <Link
                className="flex h-12 w-full items-center justify-center rounded-xl border border-line bg-white text-sm font-bold text-ink transition hover:border-blue-200 hover:bg-blue-50/60"
                href="/login"
              >
                Sign in to your account
              </Link>
            </>
          )}

          <div className="mt-7 flex items-center justify-center gap-2 text-[11px] text-muted">
            <ShieldCheck size={13} /> Tenant-isolated access protected by
            database policies
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 text-[10px] text-muted">
          <a href="#" className="hover:text-ink">
            Privacy
          </a>
          <span className="size-1 rounded-full bg-line" />
          <a href="#" className="hover:text-ink">
            Security
          </a>
          <span className="size-1 rounded-full bg-line" />
          <span>Protected workspace</span>
        </div>
      </section>
    </main>
  );
}

export function AuthVisual({ showLogo = true }: { showLogo?: boolean } = {}) {
  const workflow = ["Plan", "Source", "Purchase", "Receive", "Store"];

  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#071a35] p-8 text-white lg:flex lg:flex-col xl:p-12">
      <div className="noise absolute inset-0 opacity-[.18]" />
      <div className="grid-fade absolute inset-0 opacity-20" />
      <div className="absolute -left-32 top-1/3 size-[520px] rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="absolute -right-28 -top-28 size-[420px] rounded-full bg-blue-400/15 blur-[110px]" />

      <div className="relative flex items-center justify-between">
        {showLogo ? (
          <span className="inline-flex rounded-xl bg-white p-3 shadow-2xl shadow-blue-950/30">
            <BrandMark />
          </span>
        ) : (
          <span className="eyebrow text-blue-300">Operations platform</span>
        )}
        <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[.05] px-3 py-2 font-mono text-[9px] text-white/65 backdrop-blur">
          <span className="size-1.5 rounded-full bg-blue-400 shadow-[0_0_0_4px_rgba(96,165,250,.13)]" />
          SECURE WORKSPACE
        </span>
      </div>

      <div className="relative mx-auto my-auto w-full max-w-[720px] py-12">
        <p className="eyebrow text-blue-300">Supply chain command center</p>
        <h2 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.06] tracking-[-.055em] xl:text-5xl">
          One workspace from requirement to warehouse shelf.
        </h2>
        <p className="mt-5 max-w-xl text-sm leading-7 text-white/55">
          Keep purchasing decisions, inbound work, inventory, and warehouse
          execution connected to the same operational history.
        </p>

        <div className="auth-preview-enter mt-10 overflow-hidden rounded-[22px] border border-white/15 bg-white/[.07] shadow-[0_32px_90px_rgba(0,0,0,.30)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-lg bg-accent">
                <Activity size={15} />
              </span>
              <div>
                <p className="text-xs font-bold">Operational network</p>
                <p className="mt-0.5 text-[9px] text-white/40">
                  All warehouses · live overview
                </p>
              </div>
            </div>
            <span className="rounded-full bg-blue-400/15 px-2.5 py-1 font-mono text-[8px] text-blue-200">
              SYNCED
            </span>
          </div>

          <div className="grid grid-cols-3 border-b border-white/10">
            {[
              { icon: Boxes, label: "Available units", value: "48,290" },
              { icon: Truck, label: "Inbound", value: "1,840" },
              {
                icon: PackageCheck,
                label: "Pending receipts",
                value: "08",
              },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="border-r border-white/10 p-4 last:border-0 xl:p-5"
              >
                <div className="flex items-center justify-between text-white/40">
                  <span className="text-[9px]">{label}</span>
                  <Icon size={13} />
                </div>
                <p className="mt-3 text-xl font-bold tracking-[-.04em]">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-white/55">
                Connected workflow
              </p>
              <p className="font-mono text-[8px] text-blue-300">PO-2026-0941</p>
            </div>
            <div className="mt-5 flex items-center">
              {workflow.map((step, index) => (
                <div
                  key={step}
                  className="flex min-w-0 flex-1 items-center last:flex-none"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className={`grid size-6 place-items-center rounded-full border text-[9px] ${index < 4 ? "border-blue-400 bg-blue-500 text-white" : "border-white/20 bg-white/5 text-white/40"}`}
                    >
                      {index < 4 ? <Check size={11} /> : index + 1}
                    </span>
                    <span className="font-mono text-[8px] text-white/45">
                      {step.toUpperCase()}
                    </span>
                  </div>
                  {index < workflow.length - 1 && (
                    <span
                      className={`mb-5 h-px flex-1 ${index < 3 ? "bg-blue-400" : "bg-white/15"}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { icon: ShieldCheck, title: "Tenant isolated" },
            { icon: Warehouse, title: "Warehouse scoped" },
            { icon: LockKeyhole, title: "Audited access" },
          ].map(({ icon: Icon, title }) => (
            <div
              key={title}
              className="flex items-center gap-2 border-t border-white/10 pt-4 text-[10px] text-white/55"
            >
              <Icon size={13} className="text-blue-300" /> {title}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Field({
  label,
  icon: Icon,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  icon: typeof Mail;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold">{label}</span>
      <span className="relative block">
        <Icon
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          size={16}
        />
        <input
          required
          className="h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-accent focus:ring-4 focus:ring-blue-100"
          {...props}
        />
      </span>
    </label>
  );
}
