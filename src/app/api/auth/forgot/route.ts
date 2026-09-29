import { clientIp, createResetToken, rateLimited } from "@/server/auth";
import { appUrl, emailEnabled, sendEmail } from "@/server/email";
import { cleanEmail } from "@/server/validate";

// Always the same answer whether or not the account exists, so this can't be used to discover emails.
export async function POST(req: Request) {
  if (!emailEnabled()) return Response.json({ ok: true, email: false }); // UI: "ask your administrator"
  const email = cleanEmail((await req.json().catch(() => null))?.email);
  const [byIp, byEmail] = await Promise.all([
    rateLimited(`forgot:ip:${clientIp(req)}`, 10, 60 * 60e3),
    rateLimited(`forgot:email:${email}`, 3, 60 * 60e3),
  ]);
  if (!byIp && !byEmail && email) {
    const r = await createResetToken(email);
    if (r)
      await sendEmail(r.user.email, "Reset your VENTURE admin password",
        `Hi ${r.user.name},\n\nSomeone asked to reset the password for your VENTURE admin account.\n` +
        `Open this link within 30 minutes to choose a new password:\n\n${appUrl()}/admin/reset?token=${r.token}\n\n` +
        `If this wasn't you, ignore this email — your password stays the same.`,
      ).catch((e) => console.error("reset email failed:", e.message)); // same answer either way — a 500 here would reveal the account exists
  }
  return Response.json({ ok: true, email: true });
}
