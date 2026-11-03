ALTER TABLE "instructor_profiles" ADD COLUMN "claim_user_id" uuid;--> statement-breakpoint
ALTER TABLE "instructor_profiles" ADD COLUMN "claim_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "instructor_profiles" ADD CONSTRAINT "instructor_profiles_claim_user_id_profiles_id_fk" FOREIGN KEY ("claim_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructor_profiles" ADD CONSTRAINT "instructor_profiles_claimUserId_unique" UNIQUE("claim_user_id");