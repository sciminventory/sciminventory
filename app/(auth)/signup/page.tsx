import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { signUp } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Create workspace" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return <AuthCard mode="signup" message={message} action={signUp} />;
}
