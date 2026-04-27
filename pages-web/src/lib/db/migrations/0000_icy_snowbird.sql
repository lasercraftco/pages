CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(40),
	"action" varchar(80) NOT NULL,
	"target" varchar(200),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" varchar(40) PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" varchar(300) NOT NULL,
	"sort_name" varchar(300) NOT NULL,
	"bio" text,
	"photo_url" varchar(800),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_files" (
	"id" varchar(40) PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"book_id" varchar(40) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"format" varchar(16) NOT NULL,
	"path" varchar(1000) NOT NULL,
	"size_bytes" bigint,
	"content_hash" varchar(80),
	"duration_seconds" integer,
	"chapters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bitrate" integer,
	"sample_rate" integer,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" varchar(40) PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"book_id" varchar(40) NOT NULL,
	"file_id" varchar(40) NOT NULL,
	"label" varchar(200),
	"cfi" varchar(600),
	"position_seconds" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" varchar(40) PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"title" varchar(500) NOT NULL,
	"sort_title" varchar(500) NOT NULL,
	"subtitle" varchar(500),
	"author_id" varchar(40),
	"series_id" varchar(40),
	"series_index" double precision,
	"narrator" varchar(300),
	"isbn10" varchar(16),
	"isbn13" varchar(20),
	"asin" varchar(20),
	"publisher" varchar(300),
	"published_at" timestamp with time zone,
	"language" varchar(10),
	"summary" text,
	"page_count" integer,
	"duration_seconds" integer,
	"word_count" integer,
	"content_rating" varchar(16),
	"cover_url" varchar(800),
	"cover_color" varchar(16),
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"genres" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" varchar(40) PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"target_id" varchar(40) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "highlights" (
	"id" varchar(40) PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"book_id" varchar(40) NOT NULL,
	"file_id" varchar(40) NOT NULL,
	"cfi_range" varchar(1000) NOT NULL,
	"text" text NOT NULL,
	"note" text,
	"color" varchar(16) DEFAULT 'yellow' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_requests" (
	"id" varchar(40) PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"title" varchar(500) NOT NULL,
	"author" varchar(300),
	"isbn13" varchar(20),
	"asin" varchar(20),
	"cover_url" varchar(800),
	"format_preference" varchar(16) DEFAULT 'either' NOT NULL,
	"note" text,
	"source" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"readarr_id" integer,
	"fulfilled_book_id" varchar(40),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_progress" (
	"id" varchar(40) PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"book_id" varchar(40) NOT NULL,
	"file_id" varchar(40) NOT NULL,
	"cfi" varchar(600),
	"position_seconds" double precision,
	"progress" double precision DEFAULT 0 NOT NULL,
	"device_id" varchar(80),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" varchar(40) PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" varchar(300) NOT NULL,
	"author_id" varchar(40),
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(80) PRIMARY KEY NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" varchar(500),
	"ip" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "shelf_books" (
	"shelf_id" varchar(40) NOT NULL,
	"book_id" varchar(40) NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shelves" (
	"id" varchar(40) PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"name" varchar(200) NOT NULL,
	"smart_query" jsonb,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_book_state" (
	"id" varchar(40) PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"book_id" varchar(40) NOT NULL,
	"status" varchar(16) DEFAULT 'none' NOT NULL,
	"star_rating" integer,
	"private_notes" text,
	"public_review" text,
	"finished_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(40) PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"first_name" varchar(80) NOT NULL,
	"role" varchar(20) DEFAULT 'friend' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"auto_approve" boolean DEFAULT true NOT NULL,
	"daily_request_quota" integer DEFAULT 10 NOT NULL,
	"kindle_email" varchar(320),
	"kobo_token" varchar(200),
	"reading_speed_wpm" integer DEFAULT 250 NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_files" ADD CONSTRAINT "book_files_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_file_id_book_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."book_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_file_id_book_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."book_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_requests" ADD CONSTRAINT "library_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_requests" ADD CONSTRAINT "library_requests_fulfilled_book_id_books_id_fk" FOREIGN KEY ("fulfilled_book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_file_id_book_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."book_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelf_books" ADD CONSTRAINT "shelf_books_shelf_id_shelves_id_fk" FOREIGN KEY ("shelf_id") REFERENCES "public"."shelves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelf_books" ADD CONSTRAINT "shelf_books_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelves" ADD CONSTRAINT "shelves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_book_state" ADD CONSTRAINT "user_book_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_book_state" ADD CONSTRAINT "user_book_state_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_user" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_action" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_authors_sort" ON "authors" USING btree ("sort_name");--> statement-breakpoint
CREATE INDEX "idx_authors_name" ON "authors" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_book_files_path" ON "book_files" USING btree ("path");--> statement-breakpoint
CREATE INDEX "idx_book_files_book" ON "book_files" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "idx_book_files_kind" ON "book_files" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "idx_bookmarks_user_book" ON "bookmarks" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "idx_books_sort_title" ON "books" USING btree ("sort_title");--> statement-breakpoint
CREATE INDEX "idx_books_author" ON "books" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_books_series" ON "books" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "idx_books_added" ON "books" USING btree ("added_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_books_isbn13" ON "books" USING btree ("isbn13");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_follow_user_target" ON "follows" USING btree ("user_id","kind","target_id");--> statement-breakpoint
CREATE INDEX "idx_highlights_user_book" ON "highlights" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "idx_requests_user" ON "library_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_requests_status" ON "library_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_progress_user_file" ON "reading_progress" USING btree ("user_id","file_id");--> statement-breakpoint
CREATE INDEX "idx_progress_user_book" ON "reading_progress" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_series_name_author" ON "series" USING btree (lower("name"),"author_id");--> statement-breakpoint
CREATE INDEX "idx_series_author" ON "series" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_shelf_book" ON "shelf_books" USING btree ("shelf_id","book_id");--> statement-breakpoint
CREATE INDEX "idx_shelves_user" ON "shelves" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_book" ON "user_book_state" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "idx_user_book_status" ON "user_book_state" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_first_name" ON "users" USING btree (lower("first_name"));