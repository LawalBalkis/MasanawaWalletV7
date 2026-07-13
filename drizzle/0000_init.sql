CREATE TABLE "beneficiaries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"bank" text NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fundings" (
	"transaction_ref" text PRIMARY KEY NOT NULL,
	"account_reference" text NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"payer_name" text NOT NULL,
	"payer_account_number" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"tx_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"asset" text NOT NULL,
	"amount" numeric(38, 18) NOT NULL,
	"ngn_value" numeric(20, 2) NOT NULL,
	"fee_ngn" numeric(20, 2) DEFAULT 0 NOT NULL,
	"counterparty" text,
	"note" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"password_hash" text NOT NULL,
	"pin_hash" text,
	"tier" integer DEFAULT 1 NOT NULL,
	"billstack_ref" text NOT NULL,
	"kyc_address" text,
	"kyc_id_type" text,
	"kyc_id_number" text,
	"notify_transactions" boolean DEFAULT true NOT NULL,
	"notify_prices" boolean DEFAULT false NOT NULL,
	"notify_product" boolean DEFAULT true NOT NULL,
	"two_factor" boolean DEFAULT false NOT NULL,
	"biometric" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_billstack_ref_unique" UNIQUE("billstack_ref")
);
--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "beneficiaries_user_id_idx" ON "beneficiaries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fundings_account_reference_idx" ON "fundings" USING btree ("account_reference");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_user_created_idx" ON "transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "users_billstack_ref_idx" ON "users" USING btree ("billstack_ref");