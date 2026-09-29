import { ForgotForm } from "@/components/admin/PasswordForms";
import "../admin.css";

export const metadata = { title: "Forgot password · VENTURE Control", robots: { index: false } };

export default function ForgotPage() {
  return <ForgotForm />;
}
