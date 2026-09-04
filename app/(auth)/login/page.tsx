import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { login } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return <AuthCard mode="login" message={message} action={login} />;
}
