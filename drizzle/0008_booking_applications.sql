CREATE TABLE "booking_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"venture_slug" text NOT NULL,
	"plot_number" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"applicant_name" text NOT NULL,
	"mobile" text NOT NULL,
	"email" text,
	"pan_enc" text,
	"pan_last4" text,
	"details" jsonb NOT NULL,
	"sales_person_id" integer,
	"lead_id" integer,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_status_chk" CHECK ("booking_applications"."status" in ('submitted','received','confirmed','sold','cancelled'))
);
--> statement-breakpoint
ALTER TABLE "booking_applications" ADD CONSTRAINT "booking_applications_venture_slug_ventures_slug_fk" FOREIGN KEY ("venture_slug") REFERENCES "public"."ventures"("slug") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_applications" ADD CONSTRAINT "booking_applications_sales_person_id_users_id_fk" FOREIGN KEY ("sales_person_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_applications" ADD CONSTRAINT "booking_applications_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_applications" ADD CONSTRAINT "booking_applications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_plot_idx" ON "booking_applications" USING btree ("venture_slug","plot_number");--> statement-breakpoint
CREATE INDEX "booking_created_idx" ON "booking_applications" USING btree ("created_at" DESC NULLS LAST);