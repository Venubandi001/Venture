-- Same rule as 0001: no access through Supabase's public Data API (this table holds personal/KYC data).
ALTER TABLE "booking_applications" ENABLE ROW LEVEL SECURITY;
