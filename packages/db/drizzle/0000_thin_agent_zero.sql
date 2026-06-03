CREATE TABLE "persons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"birth_year" integer,
	"death_year" integer,
	"birth_lat" double precision,
	"birth_lng" double precision,
	"birth_place" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"related_person_id" integer NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "relationships_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "relationships_related_person_id_persons_id_fk" FOREIGN KEY ("related_person_id") REFERENCES "persons"("id") ON DELETE cascade ON UPDATE no action
);
