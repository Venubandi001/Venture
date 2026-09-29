import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { currentUser, hasUsers } from "@/server/auth";
import "../admin.css";

export const metadata = { title: "Sign in · VENTURE Control", robots: { index: false } };

export default async function LoginPage() {
  if (await currentUser()) redirect("/admin");
  return <LoginForm noAccounts={!(await hasUsers())} />;
}
