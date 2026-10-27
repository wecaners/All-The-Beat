CREATE TYPE "public"."booking_type" AS ENUM('naver', 'kakao_openchat', 'insta_dm', 'google_form', 'other');--> statement-breakpoint
CREATE TYPE "public"."class_level" AS ENUM('intro', 'beginner', 'intermediate_plus');--> statement-breakpoint
CREATE TYPE "public"."class_status" AS ENUM('open', 'closing_soon', 'closed', 'ended', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."encore_round_status" AS ENUM('collecting', 'delivered', 'reviewing', 'opened', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('song_view', 'class_view', 'booking_click', 'search');--> statement-breakpoint
CREATE TYPE "public"."instructor_status" AS ENUM('pending', 'verified', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('waiting', 'opened', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."time_pref" AS ENUM('weekday_evening', 'weekend_day', 'weekend_evening', 'any');--> statement-breakpoint
CREATE TYPE "public"."video_type" AS ENUM('dance_practice', 'performance', 'mv');--> statement-breakpoint
CREATE TABLE "encore_rounds" (
	"class_id" bigint PRIMARY KEY NOT NULL,
	"threshold" smallint NOT NULL,
	"status" "encore_round_status" DEFAULT 'collecting' NOT NULL,
	"reached_at" timestamp with time zone,
	"reviewing_at" timestamp with time zone,
	"count_at_review" integer,
	"responded_at" timestamp with time zone,
	"encore_class_id" bigint,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "encore_rounds_encoreClassId_unique" UNIQUE("encore_class_id"),
	CONSTRAINT "encore_rounds_threshold_pos" CHECK ("encore_rounds"."threshold" > 0)
);
--> statement-breakpoint
ALTER TABLE "encore_rounds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "encores" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "encores_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"class_id" bigint NOT NULL,
	"time_pref" time_pref DEFAULT 'any' NOT NULL,
	"message" text,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "encores_userId_classId_unique" UNIQUE("user_id","class_id"),
	CONSTRAINT "encores_message_len" CHECK (char_length("encores"."message") <= 100)
);
--> statement-breakpoint
ALTER TABLE "encores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"type" "event_type" NOT NULL,
	"song_id" bigint,
	"class_id" bigint,
	"user_id" uuid,
	"session_id" text NOT NULL,
	"referrer" text,
	"query" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "requests" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"song_id" bigint NOT NULL,
	"region_id" smallint,
	"time_pref" time_pref DEFAULT 'any' NOT NULL,
	"message" text,
	"status" "request_status" DEFAULT 'waiting' NOT NULL,
	"fulfilled_class_id" bigint,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requests_userId_songId_unique" UNIQUE("user_id","song_id"),
	CONSTRAINT "requests_message_len" CHECK (char_length("requests"."message") <= 100)
);
--> statement-breakpoint
ALTER TABLE "requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "class_songs" (
	"class_id" bigint NOT NULL,
	"song_id" bigint NOT NULL,
	"position" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_songs_class_id_song_id_pk" PRIMARY KEY("class_id","song_id"),
	CONSTRAINT "class_songs_position_range" CHECK ("class_songs"."position" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "class_songs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "classes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "classes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"instructor_id" bigint NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"studio_name" text NOT NULL,
	"address" text NOT NULL,
	"place_id" bigint,
	"region_id" smallint NOT NULL,
	"price" integer NOT NULL,
	"level" "class_level" NOT NULL,
	"capacity" smallint,
	"booking_url" text NOT NULL,
	"booking_type" "booking_type" NOT NULL,
	"thumbnail_path" text,
	"description" text,
	"teaser_video_id" text,
	"status" "class_status" DEFAULT 'open' NOT NULL,
	"cancel_reason" text,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"created_by_admin" boolean DEFAULT false NOT NULL,
	"from_request" boolean DEFAULT false NOT NULL,
	"encore_of_class_id" bigint,
	"schedule_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classes_time_order" CHECK ("classes"."ends_at" > "classes"."starts_at"),
	CONSTRAINT "classes_price_nonneg" CHECK ("classes"."price" >= 0),
	CONSTRAINT "classes_capacity_pos" CHECK ("classes"."capacity" > 0),
	CONSTRAINT "classes_booking_url_http" CHECK ("classes"."booking_url" ~* '^https?://'),
	CONSTRAINT "classes_description_len" CHECK (char_length("classes"."description") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "classes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "instructor_places" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "instructor_places_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"instructor_id" bigint NOT NULL,
	"studio_name" text NOT NULL,
	"address" text NOT NULL,
	"sigungu" text,
	"bname" text,
	"region_id" smallint NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instructor_places" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "region_mappings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "region_mappings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sigungu" text NOT NULL,
	"bname" text,
	"region_id" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "region_mappings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "regions" (
	"id" smallint PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"sort_order" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "regions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "instructor_profiles" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "instructor_profiles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid,
	"display_name" text NOT NULL,
	"instagram_handle" text NOT NULL,
	"bio" text,
	"status" "instructor_status" DEFAULT 'pending' NOT NULL,
	"is_proxy" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp with time zone,
	"consent_note" text,
	"verify_code_hash" text,
	"verify_code_expires_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"rejected_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instructor_profiles_userId_unique" UNIQUE("user_id"),
	CONSTRAINT "instructor_profiles_instagramHandle_unique" UNIQUE("instagram_handle"),
	CONSTRAINT "instructor_profiles_handle_lower" CHECK ("instructor_profiles"."instagram_handle" = lower("instructor_profiles"."instagram_handle") and "instructor_profiles"."instagram_handle" !~ '^@'),
	CONSTRAINT "instructor_profiles_bio_len" CHECK (char_length("instructor_profiles"."bio") <= 50)
);
--> statement-breakpoint
ALTER TABLE "instructor_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "instructor_regions" (
	"instructor_id" bigint NOT NULL,
	"region_id" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instructor_regions_instructor_id_region_id_pk" PRIMARY KEY("instructor_id","region_id")
);
--> statement-breakpoint
ALTER TABLE "instructor_regions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nickname" text NOT NULL,
	"avatar_url" text,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"terms_agreed_at" timestamp with time zone,
	"privacy_agreed_at" timestamp with time zone,
	"marketing_agreed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "artist_aliases" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "artist_aliases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"artist_id" bigint NOT NULL,
	"alias" text NOT NULL,
	"alias_norm" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artist_aliases_artistId_aliasNorm_unique" UNIQUE("artist_id","alias_norm")
);
--> statement-breakpoint
ALTER TABLE "artist_aliases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "artists" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "artists_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"merged_into_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artists_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "artists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "song_aliases" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "song_aliases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"song_id" bigint NOT NULL,
	"alias" text NOT NULL,
	"alias_norm" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "song_aliases_songId_aliasNorm_unique" UNIQUE("song_id","alias_norm")
);
--> statement-breakpoint
ALTER TABLE "song_aliases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "songs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "songs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"artist_id" bigint NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"release_date" date,
	"review_status" "review_status" DEFAULT 'pending' NOT NULL,
	"merged_into_id" bigint,
	"created_by" uuid,
	"yt_video_id" text,
	"video_type" "video_type",
	"video_title" text,
	"video_channel" text,
	"video_thumb_url" text,
	"video_embeddable" boolean,
	"video_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "songs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "songs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "encore_rounds" ADD CONSTRAINT "encore_rounds_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encore_rounds" ADD CONSTRAINT "encore_rounds_encore_class_id_classes_id_fk" FOREIGN KEY ("encore_class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encores" ADD CONSTRAINT "encores_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encores" ADD CONSTRAINT "encores_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_fulfilled_class_id_classes_id_fk" FOREIGN KEY ("fulfilled_class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_songs" ADD CONSTRAINT "class_songs_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_songs" ADD CONSTRAINT "class_songs_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_instructor_id_instructor_profiles_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_place_id_instructor_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."instructor_places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_encore_of_class_id_classes_id_fk" FOREIGN KEY ("encore_of_class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructor_places" ADD CONSTRAINT "instructor_places_instructor_id_instructor_profiles_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructor_places" ADD CONSTRAINT "instructor_places_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "region_mappings" ADD CONSTRAINT "region_mappings_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructor_profiles" ADD CONSTRAINT "instructor_profiles_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructor_regions" ADD CONSTRAINT "instructor_regions_instructor_id_instructor_profiles_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructor_regions" ADD CONSTRAINT "instructor_regions_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_aliases" ADD CONSTRAINT "artist_aliases_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_merged_into_id_artists_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_aliases" ADD CONSTRAINT "song_aliases_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_merged_into_id_songs_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "encore_rounds_status_expires_idx" ON "encore_rounds" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "encores_active_class_idx" ON "encores" USING btree ("class_id") WHERE "encores"."canceled_at" is null;--> statement-breakpoint
CREATE INDEX "encores_user_idx" ON "encores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "events_type_class_created_idx" ON "events" USING btree ("type","class_id","created_at");--> statement-breakpoint
CREATE INDEX "events_type_song_created_idx" ON "events" USING btree ("type","song_id","created_at");--> statement-breakpoint
CREATE INDEX "requests_song_created_idx" ON "requests" USING btree ("song_id","created_at") WHERE "requests"."status" <> 'canceled';--> statement-breakpoint
CREATE INDEX "requests_region_created_idx" ON "requests" USING btree ("region_id","created_at");--> statement-breakpoint
CREATE INDEX "requests_user_idx" ON "requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "class_songs_song_idx" ON "class_songs" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX "classes_status_starts_at_idx" ON "classes" USING btree ("status","starts_at") WHERE not "classes"."is_hidden";--> statement-breakpoint
CREATE INDEX "classes_region_starts_at_idx" ON "classes" USING btree ("region_id","starts_at");--> statement-breakpoint
CREATE INDEX "classes_instructor_starts_at_idx" ON "classes" USING btree ("instructor_id","starts_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "instructor_profiles_display_name_trgm" ON "instructor_profiles" USING gin ("display_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "artist_aliases_alias_norm_trgm" ON "artist_aliases" USING gin ("alias_norm" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "song_aliases_alias_norm_trgm" ON "song_aliases" USING gin ("alias_norm" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "songs_video_synced_at_idx" ON "songs" USING btree ("video_synced_at") WHERE "songs"."yt_video_id" is not null;