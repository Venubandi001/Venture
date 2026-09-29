import { ResetForm } from "@/components/admin/PasswordForms";
import "../admin.css";

export const metadata = { title: "Reset password · VENTURE Control", robots: { index: false }, referrer: "no-referrer" as const };

export default async function ResetPage({ searchParams }: PageProps<"/admin/reset">) {
  const { token } = await searchParams;
  return <ResetForm token={typeof token === "string" ? token : ""} />;
}
