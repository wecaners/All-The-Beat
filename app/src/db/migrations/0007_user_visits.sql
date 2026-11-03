CREATE TABLE "user_visits" (
	"user_id" uuid NOT NULL,
	"visited_on" date NOT NULL,
	CONSTRAINT "user_visits_user_id_visited_on_pk" PRIMARY KEY("user_id","visited_on")
);
--> statement-breakpoint
ALTER TABLE "user_visits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_visits" ADD CONSTRAINT "user_visits_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;