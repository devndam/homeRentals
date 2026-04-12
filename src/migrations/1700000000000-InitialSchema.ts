import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1700000000000 implements MigrationInterface {
    name = 'InitialSchema1700000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // ── Enum types ──
        await queryRunner.query(`CREATE TYPE "property_type_enum" AS ENUM('apartment','house','duplex','flat','self_contain','room','shop','office','land')`);
        await queryRunner.query(`CREATE TYPE "property_status_enum" AS ENUM('draft','pending_review','active','rented','suspended','archived')`);
        await queryRunner.query(`CREATE TYPE "booking_status_enum" AS ENUM('pending','approved','inspection_scheduled','rejected','completed','cancelled','no_show','rented')`);
        await queryRunner.query(`CREATE TYPE "rent_status_enum" AS ENUM('active','due','overdue','terminated')`);
        await queryRunner.query(`CREATE TYPE "invoice_status_enum" AS ENUM('requested','draft','sent','paid','agreement_sent','completed','expired','cancelled','terminated')`);
        await queryRunner.query(`CREATE TYPE "invoice_type_enum" AS ENUM('initial','renewal')`);
        await queryRunner.query(`CREATE TYPE "payment_type_enum" AS ENUM('rent','deposit','commission','invoice_fee','initial')`);
        await queryRunner.query(`CREATE TYPE "payment_status_enum" AS ENUM('pending','success','failed','refunded')`);
        await queryRunner.query(`CREATE TYPE "transaction_type_enum" AS ENUM('credit','debit')`);
        await queryRunner.query(`CREATE TYPE "withdrawal_status_enum" AS ENUM('pending','approved','rejected','completed')`);
        await queryRunner.query(`CREATE TYPE "legal_document_status_enum" AS ENUM('pending','acknowledged')`);
        await queryRunner.query(`CREATE TYPE "dispute_type_enum" AS ENUM('invoice','payment','refund')`);
        await queryRunner.query(`CREATE TYPE "dispute_status_enum" AS ENUM('open','in_review','resolved')`);
        await queryRunner.query(`CREATE TYPE "kyc_document_type_enum" AS ENUM('national_id','international_passport','drivers_license','voters_card')`);
        await queryRunner.query(`CREATE TYPE "kyc_status_enum" AS ENUM('pending','approved','rejected')`);
        await queryRunner.query(`CREATE TYPE "notification_type_enum" AS ENUM('booking','invoice','payment','rent','organisation','legal_document','system')`);
        await queryRunner.query(`CREATE TYPE "blog_post_status_enum" AS ENUM('draft','published','archived')`);
        await queryRunner.query(`CREATE TYPE "organisation_invite_status_enum" AS ENUM('pending','accepted','declined')`);

        // ── Users ──
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "firstName" character varying(100) NOT NULL,
                "lastName" character varying(100) NOT NULL,
                "email" character varying(255) NOT NULL,
                "phone" character varying(20) NOT NULL,
                "password" character varying NOT NULL,
                "isPropertyOwner" boolean NOT NULL DEFAULT false,
                "avatarUrl" character varying,
                "bankName" character varying(255),
                "bankAccountNumber" character varying(20),
                "bankAccountName" character varying(255),
                "paystackSubaccountCode" character varying,
                "preferences" jsonb,
                "emailVerified" boolean NOT NULL DEFAULT false,
                "phoneVerified" boolean NOT NULL DEFAULT false,
                "identityVerified" boolean NOT NULL DEFAULT false,
                "isActive" boolean NOT NULL DEFAULT true,
                "twoFactorSecret" character varying,
                "twoFactorEnabled" boolean NOT NULL DEFAULT false,
                "passwordResetToken" character varying,
                "passwordResetExpires" TIMESTAMP,
                "emailVerificationOTP" character varying,
                "emailVerificationExpires" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_users" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_phone" ON "users" ("phone")`);

        // ── Admins ──
        await queryRunner.query(`
            CREATE TABLE "admins" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "firstName" character varying(100) NOT NULL,
                "lastName" character varying(100) NOT NULL,
                "email" character varying(255) NOT NULL,
                "phone" character varying(20) NOT NULL,
                "password" character varying NOT NULL,
                "isSuperAdmin" boolean NOT NULL DEFAULT false,
                "permissions" jsonb NOT NULL DEFAULT '[]',
                "addedByAdminId" uuid,
                "isActive" boolean NOT NULL DEFAULT true,
                "twoFactorSecret" character varying,
                "twoFactorEnabled" boolean NOT NULL DEFAULT false,
                "passwordResetToken" character varying,
                "passwordResetExpires" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_admins" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_admins_email" ON "admins" ("email")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_admins_phone" ON "admins" ("phone")`);

        // ── Organisations ──
        await queryRunner.query(`
            CREATE TABLE "organisations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(200) NOT NULL,
                "logoUrl" character varying,
                "ownerId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_organisations" PRIMARY KEY ("id"),
                CONSTRAINT "FK_organisations_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // ── Organisation Members ──
        await queryRunner.query(`
            CREATE TABLE "organisation_members" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organisationId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "permissions" jsonb NOT NULL DEFAULT '[]',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_organisation_members" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_org_member" UNIQUE ("organisationId", "userId"),
                CONSTRAINT "FK_org_members_org" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_org_members_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // ── Organisation Invites ──
        await queryRunner.query(`
            CREATE TABLE "organisation_invites" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organisationId" uuid NOT NULL,
                "email" character varying(255) NOT NULL,
                "permissions" jsonb NOT NULL DEFAULT '[]',
                "status" "organisation_invite_status_enum" NOT NULL DEFAULT 'pending',
                "invitedById" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_organisation_invites" PRIMARY KEY ("id"),
                CONSTRAINT "FK_org_invites_org" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE
            )
        `);

        // ── Properties ──
        await queryRunner.query(`
            CREATE TABLE "properties" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title" character varying(255) NOT NULL,
                "description" text NOT NULL,
                "type" "property_type_enum" NOT NULL,
                "status" "property_status_enum" NOT NULL DEFAULT 'draft',
                "price" numeric(12,2) NOT NULL,
                "pricePeriod" character varying NOT NULL DEFAULT 'yearly',
                "address" character varying(255) NOT NULL,
                "city" character varying(100) NOT NULL,
                "state" character varying(100) NOT NULL,
                "country" character varying(100) NOT NULL DEFAULT 'Nigeria',
                "latitude" numeric(10,7),
                "longitude" numeric(10,7),
                "bedrooms" integer,
                "bathrooms" integer,
                "toilets" integer,
                "areaSqm" numeric(10,2),
                "totalUnits" integer NOT NULL DEFAULT 1,
                "availableUnits" integer NOT NULL DEFAULT 1,
                "amenities" jsonb NOT NULL DEFAULT '[]',
                "rules" jsonb,
                "isFurnished" boolean NOT NULL DEFAULT false,
                "hasServicing" boolean NOT NULL DEFAULT false,
                "isPetFriendly" boolean NOT NULL DEFAULT false,
                "rejectionReason" character varying,
                "viewCount" integer NOT NULL DEFAULT 0,
                "availableFrom" TIMESTAMP,
                "ownerId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_properties" PRIMARY KEY ("id"),
                CONSTRAINT "FK_properties_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_properties_address" ON "properties" ("address")`);
        await queryRunner.query(`CREATE INDEX "IDX_properties_state" ON "properties" ("state")`);

        // ── Property Images ──
        await queryRunner.query(`
            CREATE TABLE "property_images" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "url" character varying NOT NULL,
                "thumbnailUrl" character varying,
                "isPrimary" boolean NOT NULL DEFAULT false,
                "sortOrder" integer NOT NULL DEFAULT 0,
                "mediaType" character varying NOT NULL DEFAULT 'image',
                "propertyId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_property_images" PRIMARY KEY ("id"),
                CONSTRAINT "FK_property_images_property" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE
            )
        `);

        // ── Favorites ──
        await queryRunner.query(`
            CREATE TABLE "favorites" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "propertyId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_favorites" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_favorites" UNIQUE ("userId", "propertyId"),
                CONSTRAINT "FK_favorites_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_favorites_property" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE
            )
        `);

        // ── Bookings ──
        await queryRunner.query(`
            CREATE TABLE "bookings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "tenantId" uuid NOT NULL,
                "propertyId" uuid NOT NULL,
                "ownerId" uuid NOT NULL,
                "proposedDate" TIMESTAMP NOT NULL,
                "inspectionDate" TIMESTAMP,
                "message" text,
                "status" "booking_status_enum" NOT NULL DEFAULT 'pending',
                "ownerNote" text,
                "alternativeDate" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_bookings" PRIMARY KEY ("id"),
                CONSTRAINT "FK_bookings_tenant" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_bookings_property" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_bookings_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // ── Rents ──
        await queryRunner.query(`
            CREATE TABLE "rents" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "tenantId" uuid NOT NULL,
                "ownerId" uuid NOT NULL,
                "propertyId" uuid NOT NULL,
                "status" "rent_status_enum" NOT NULL DEFAULT 'active',
                "rentAmount" numeric(12,2) NOT NULL,
                "rentPeriod" character varying NOT NULL DEFAULT 'yearly',
                "units" integer NOT NULL DEFAULT 1,
                "cautionDeposit" numeric(12,2) NOT NULL DEFAULT 0,
                "startDate" date NOT NULL,
                "nextDueDate" date NOT NULL,
                "additionalTerms" text,
                "agreementPdfUrl" character varying,
                "tenantSignature" character varying,
                "tenantSignedAt" TIMESTAMP,
                "bookingId" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_rents" PRIMARY KEY ("id"),
                CONSTRAINT "FK_rents_tenant" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_rents_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_rents_property" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE
            )
        `);

        // ── Invoices ──
        await queryRunner.query(`
            CREATE TABLE "invoices" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "tenantId" uuid NOT NULL,
                "ownerId" uuid NOT NULL,
                "propertyId" uuid NOT NULL,
                "status" "invoice_status_enum" NOT NULL DEFAULT 'requested',
                "rentAmount" numeric(12,2),
                "rentPeriod" character varying NOT NULL DEFAULT 'yearly',
                "units" integer NOT NULL DEFAULT 1,
                "cautionDeposit" numeric(12,2),
                "startDate" date,
                "endDate" date,
                "additionalTerms" text,
                "tenantSignature" character varying,
                "tenantSignedAt" TIMESTAMP,
                "pdfUrl" character varying,
                "initialPaymentDone" boolean NOT NULL DEFAULT false,
                "initialPaymentId" uuid,
                "rentStartDate" date,
                "nextRentDueDate" date,
                "isRenewal" boolean NOT NULL DEFAULT false,
                "parentInvoiceId" uuid,
                "rentId" uuid,
                "invoiceType" "invoice_type_enum",
                "bookingId" uuid,
                "requestedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_invoices" PRIMARY KEY ("id"),
                CONSTRAINT "FK_invoices_parent" FOREIGN KEY ("parentInvoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_invoices_rent" FOREIGN KEY ("rentId") REFERENCES "rents"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_invoices_booking" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_invoices_tenant" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_invoices_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_invoices_property" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE
            )
        `);

        // ── Payments ──
        await queryRunner.query(`
            CREATE TABLE "payments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "reference" character varying(100) NOT NULL,
                "userId" uuid NOT NULL,
                "propertyId" uuid,
                "invoiceId" uuid,
                "type" "payment_type_enum" NOT NULL,
                "status" "payment_status_enum" NOT NULL DEFAULT 'pending',
                "amount" numeric(12,2) NOT NULL,
                "commission" numeric(12,2) NOT NULL DEFAULT 0,
                "ownerAmount" numeric(12,2) NOT NULL DEFAULT 0,
                "currency" character varying NOT NULL DEFAULT 'NGN',
                "paystackReference" character varying,
                "paystackAuthorizationUrl" character varying,
                "paystackMetadata" jsonb,
                "receiptUrl" character varying,
                "description" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
                CONSTRAINT "FK_payments_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_payments_property" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_payments_invoice" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_payments_reference" ON "payments" ("reference")`);

        // ── Wallets ──
        await queryRunner.query(`
            CREATE TABLE "wallets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "balance" numeric(12,2) NOT NULL DEFAULT 0,
                "totalEarned" numeric(12,2) NOT NULL DEFAULT 0,
                "totalWithdrawn" numeric(12,2) NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_wallets" PRIMARY KEY ("id"),
                CONSTRAINT "FK_wallets_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_wallets_userId" ON "wallets" ("userId")`);

        // ── Wallet Transactions ──
        await queryRunner.query(`
            CREATE TABLE "wallet_transactions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "walletId" uuid NOT NULL,
                "type" "transaction_type_enum" NOT NULL,
                "amount" numeric(12,2) NOT NULL,
                "reference" character varying(100) NOT NULL,
                "description" text,
                "relatedPaymentId" uuid,
                "balanceAfter" numeric(12,2) NOT NULL,
                "status" "withdrawal_status_enum" NOT NULL DEFAULT 'completed',
                "rejectionReason" text,
                "processedByAdminId" uuid,
                "processedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_wallet_transactions" PRIMARY KEY ("id"),
                CONSTRAINT "FK_wallet_tx_wallet" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_wallet_tx_payment" FOREIGN KEY ("relatedPaymentId") REFERENCES "payments"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_wallet_tx_reference" ON "wallet_transactions" ("reference")`);

        // ── Legal Document Templates ──
        await queryRunner.query(`
            CREATE TABLE "legal_document_templates" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "description" text,
                "fileUrl" character varying NOT NULL,
                "createdByAdminId" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_legal_document_templates" PRIMARY KEY ("id"),
                CONSTRAINT "FK_legal_doc_templates_admin" FOREIGN KEY ("createdByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL
            )
        `);

        // ── Legal Documents ──
        await queryRunner.query(`
            CREATE TABLE "legal_documents" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "rentId" uuid NOT NULL,
                "tenantId" uuid NOT NULL,
                "title" character varying(255) NOT NULL,
                "description" text,
                "documentUrl" character varying NOT NULL,
                "templateId" uuid,
                "assignedByAdminId" uuid NOT NULL,
                "status" "legal_document_status_enum" NOT NULL DEFAULT 'pending',
                "acknowledgedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_legal_documents" PRIMARY KEY ("id"),
                CONSTRAINT "FK_legal_docs_rent" FOREIGN KEY ("rentId") REFERENCES "rents"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_legal_docs_tenant" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_legal_docs_template" FOREIGN KEY ("templateId") REFERENCES "legal_document_templates"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_legal_docs_admin" FOREIGN KEY ("assignedByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL
            )
        `);

        // ── Disputes ──
        await queryRunner.query(`
            CREATE TABLE "disputes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "propertyId" uuid NOT NULL,
                "tenantId" uuid NOT NULL,
                "ownerId" uuid NOT NULL,
                "type" "dispute_type_enum" NOT NULL,
                "status" "dispute_status_enum" NOT NULL DEFAULT 'open',
                "description" text NOT NULL,
                "resolution" text,
                "resolvedByAdminId" uuid,
                "resolvedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_disputes" PRIMARY KEY ("id"),
                CONSTRAINT "FK_disputes_property" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_disputes_tenant" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_disputes_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_disputes_admin" FOREIGN KEY ("resolvedByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL
            )
        `);

        // ── KYC Documents ──
        await queryRunner.query(`
            CREATE TABLE "kyc_documents" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "documentType" "kyc_document_type_enum" NOT NULL,
                "documentUrl" character varying NOT NULL,
                "status" "kyc_status_enum" NOT NULL DEFAULT 'pending',
                "rejectionReason" text,
                "reviewedByAdminId" uuid,
                "reviewedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_kyc_documents" PRIMARY KEY ("id"),
                CONSTRAINT "FK_kyc_docs_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_kyc_docs_admin" FOREIGN KEY ("reviewedByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL
            )
        `);

        // ── Notifications ──
        await queryRunner.query(`
            CREATE TABLE "notifications" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "type" "notification_type_enum" NOT NULL,
                "title" character varying(255) NOT NULL,
                "message" text NOT NULL,
                "relatedEntityId" uuid,
                "relatedEntityType" character varying(50),
                "isRead" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
                CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_userId" ON "notifications" ("userId")`);

        // ── System Settings ──
        await queryRunner.query(`
            CREATE TABLE "system_settings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "storageProvider" character varying NOT NULL DEFAULT 'local',
                "platformCommissionPercent" numeric(5,2) NOT NULL DEFAULT 5,
                "serviceChargeType" character varying NOT NULL DEFAULT 'fixed',
                "serviceChargeValue" numeric(12,2) NOT NULL DEFAULT 0,
                "agentFeeType" character varying NOT NULL DEFAULT 'fixed',
                "agentFeeValue" numeric(12,2) NOT NULL DEFAULT 0,
                "legalFeeType" character varying NOT NULL DEFAULT 'fixed',
                "legalFeeValue" numeric(12,2) NOT NULL DEFAULT 0,
                "cautionDepositType" character varying NOT NULL DEFAULT 'fixed',
                "cautionDepositValue" numeric(12,2) NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_system_settings" PRIMARY KEY ("id")
            )
        `);

        // ── Blog Categories ──
        await queryRunner.query(`
            CREATE TABLE "blog_categories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(100) NOT NULL,
                "slug" character varying(120) NOT NULL,
                "description" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_blog_categories" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_blog_categories_slug" ON "blog_categories" ("slug")`);

        // ── Blog Tags ──
        await queryRunner.query(`
            CREATE TABLE "blog_tags" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(60) NOT NULL,
                "slug" character varying(80) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_blog_tags" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_blog_tags_slug" ON "blog_tags" ("slug")`);

        // ── Blog Posts ──
        await queryRunner.query(`
            CREATE TABLE "blog_posts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title" character varying(255) NOT NULL,
                "slug" character varying(280) NOT NULL,
                "metaDescription" character varying(160),
                "excerpt" text,
                "body" text NOT NULL,
                "featuredImage" character varying,
                "featuredImageAlt" character varying(255),
                "status" "blog_post_status_enum" NOT NULL DEFAULT 'draft',
                "publishedAt" TIMESTAMP,
                "viewCount" integer NOT NULL DEFAULT 0,
                "categoryId" uuid,
                "authorId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_blog_posts" PRIMARY KEY ("id"),
                CONSTRAINT "FK_blog_posts_category" FOREIGN KEY ("categoryId") REFERENCES "blog_categories"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_blog_posts_author" FOREIGN KEY ("authorId") REFERENCES "admins"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_blog_posts_slug" ON "blog_posts" ("slug")`);

        // ── Blog Post Tags (join table) ──
        await queryRunner.query(`
            CREATE TABLE "blog_post_tags" (
                "postId" uuid NOT NULL,
                "tagId" uuid NOT NULL,
                CONSTRAINT "PK_blog_post_tags" PRIMARY KEY ("postId", "tagId"),
                CONSTRAINT "FK_blog_post_tags_post" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "FK_blog_post_tags_tag" FOREIGN KEY ("tagId") REFERENCES "blog_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_blog_post_tags_postId" ON "blog_post_tags" ("postId")`);
        await queryRunner.query(`CREATE INDEX "IDX_blog_post_tags_tagId" ON "blog_post_tags" ("tagId")`);

        // ── Service Locations ──
        await queryRunner.query(`
            CREATE TABLE "service_locations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "city" character varying(100) NOT NULL,
                "state" character varying(100) NOT NULL,
                "country" character varying(100) NOT NULL DEFAULT 'Nigeria',
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_service_locations" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_service_locations" UNIQUE ("city", "state", "country")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "blog_post_tags"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "blog_posts"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "blog_tags"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "blog_categories"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "service_locations"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "system_settings"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "kyc_documents"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "disputes"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "legal_documents"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "legal_document_templates"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "wallet_transactions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "wallets"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "rents"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "bookings"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "favorites"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "property_images"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "properties"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "organisation_invites"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "organisation_members"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "organisations"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "admins"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

        await queryRunner.query(`DROP TYPE IF EXISTS "organisation_invite_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "blog_post_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "kyc_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "kyc_document_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "dispute_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "dispute_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "legal_document_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "withdrawal_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "transaction_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "payment_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "invoice_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "invoice_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "rent_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "booking_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "property_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "property_type_enum"`);
    }
}
