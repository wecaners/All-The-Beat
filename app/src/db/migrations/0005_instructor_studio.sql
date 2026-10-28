CREATE TABLE "studio_photos" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "studio_photos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"place_id" bigint NOT NULL,
	"path" text NOT NULL,
	"thumb_path" text NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "instructor_places" ADD COLUMN "kakao_place_id" text;--> statement-breakpoint
ALTER TABLE "instructor_places" ADD COLUMN "kakao_place_url" text;--> statement-breakpoint
ALTER TABLE "instructor_places" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "instructor_places" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "instructor_places" ADD COLUMN "facilities" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "instructor_places" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "instructor_profiles" ADD COLUMN "photo_path" text;--> statement-breakpoint
ALTER TABLE "instructor_profiles" ADD COLUMN "photo_thumb_path" text;--> statement-breakpoint
ALTER TABLE "instructor_profiles" ADD COLUMN "portfolio_video_ids" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "instructor_profiles" ADD COLUMN "media_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "studio_photos" ADD CONSTRAINT "studio_photos_place_id_instructor_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."instructor_places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "studio_photos_place_idx" ON "studio_photos" USING btree ("place_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "instructor_places_kakao_uq" ON "instructor_places" USING btree ("instructor_id","kakao_place_id") WHERE "instructor_places"."kakao_place_id" is not null;--> statement-breakpoint
ALTER TABLE "instructor_places" ADD CONSTRAINT "instructor_places_latlng_pair" CHECK (("instructor_places"."lat" is null) = ("instructor_places"."lng" is null));--> statement-breakpoint
ALTER TABLE "instructor_profiles" ADD CONSTRAINT "instructor_profiles_portfolio_max" CHECK (cardinality("instructor_profiles"."portfolio_video_ids") <= 2);