import type { Metadata } from "next";
import { RecoveryCard } from "@/components/auth/recovery-card";
import { requestPasswordReset } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return (
    <RecoveryCard
      mode="request"
      message={message}
      action={requestPasswordReset}
    />
  );
}
