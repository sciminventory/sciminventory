import type { Metadata } from "next";
import { RecoveryCard } from "@/components/auth/recovery-card";
import { resetPassword } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return <RecoveryCard mode="reset" message={message} action={resetPassword} />;
}
