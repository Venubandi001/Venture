import { redirect } from "next/navigation";
import AdminApp from "@/components/admin/AdminApp";
import { ChangePasswordForm } from "@/components/admin/PasswordForms";
import { currentUser } from "@/server/auth";
import "./admin.css";

export const metadata = { title: "VENTURE Control", robots: { index: false } };

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  if (user.mustChangePassword) return <ChangePasswordForm forced name={user.name} />;
  return <AdminApp user={user} />;
}
