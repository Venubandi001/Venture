-- Same rule as 0001: no access through Supabase's public Data API.
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
