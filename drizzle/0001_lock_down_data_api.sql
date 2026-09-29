-- Supabase exposes the public schema through its Data API using the (public) publishable key.
-- Turn on Row Level Security with NO policies so that API sees nothing; the app connects as the
-- postgres owner role, which bypasses RLS. Every new table must get the same line.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "layouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
