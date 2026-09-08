"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const signUpSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80),
  organizationName: z
    .string()
    .trim()
    .min(2, "Enter your organization name.")
    .max(100),
});

const emailSchema = z.object({
  email: z.email("Enter a valid email address."),
});

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

function authRedirect(path: string, message: string): never {
  redirect(`${path}?message=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData) {
  if (!hasSupabaseEnv())
    authRedirect("/login", "Connect the workspace backend to enable authentication.");
  const result = loginSchema.safeParse(Object.fromEntries(formData));
  if (!result.success)
    authRedirect(
      "/login",
      result.error.issues[0]?.message ?? "Check your details.",
    );

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);
  if (error) authRedirect("/login", error.message);
  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2") redirect("/mfa/verify");
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: membership } = await supabase.from("organization_memberships").select("id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
    if (!membership) {
      const { data: vendorAccess } = await supabase.from("vendor_users").select("id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
      if (vendorAccess) redirect("/vendor");
    }
  }
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  if (!hasSupabaseEnv())
    authRedirect("/signup", "Connect the workspace backend to create a workspace.");
  const result = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!result.success)
    authRedirect(
      "/signup",
      result.error.issues[0]?.message ?? "Check your details.",
    );

  const supabase = await createClient();
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        full_name: result.data.fullName,
        pending_organization_name: result.data.organizationName,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) authRedirect("/signup", error.message);

  if (data.session) {
    const slug = `${result.data.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 6)}`;
    const { error: workspaceError } = await supabase.rpc(
      "create_organization",
      {
        organization_name: result.data.organizationName,
        organization_slug: slug,
      },
    );
    if (workspaceError) authRedirect("/signup", workspaceError.message);
    redirect("/dashboard");
  }

  authRedirect(
    "/login",
    "Check your email to confirm your account, then sign in.",
  );
}

export async function requestPasswordReset(formData: FormData) {
  if (!hasSupabaseEnv())
    authRedirect(
      "/forgot-password",
      "Connect the workspace backend to enable password recovery.",
    );
  const result = emailSchema.safeParse(Object.fromEntries(formData));
  if (!result.success)
    authRedirect(
      "/forgot-password",
      result.error.issues[0]?.message ?? "Check your email address.",
    );

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    result.data.email,
    { redirectTo: `${origin}/auth/callback?next=/reset-password` },
  );
  if (error) authRedirect("/forgot-password", error.message);

  authRedirect(
    "/forgot-password",
    "If an account exists for that email, a secure reset link is on its way.",
  );
}

export async function resetPassword(formData: FormData) {
  if (!hasSupabaseEnv())
    authRedirect("/reset-password", "Connect the workspace backend to reset your password.");
  const result = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!result.success)
    authRedirect(
      "/reset-password",
      result.error.issues[0]?.message ?? "Check your password.",
    );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    authRedirect(
      "/forgot-password",
      "Your reset link is invalid or has expired. Request a new one.",
    );

  const { error } = await supabase.auth.updateUser({
    password: result.data.password,
  });
  if (error) authRedirect("/reset-password", error.message);

  authRedirect("/login", "Password updated. You can now sign in securely.");
}

export async function logout() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
