-- ==============================================================================
-- Migration: 20261010153000_remediate_public_rls_and_privileges
-- Purpose: Remediate Supabase Security Advisor finding rls_disabled_in_public
-- Scope: All 58 tables in schema public
-- Security Posture: Targeted lockdown of direct PostgREST table and sequence access
-- Connection Compatibility: Role 'postgres' with rolbypassrls = true (Prisma ORM)
-- Invariants:
--   - DO NOT ENABLE FORCE ROW LEVEL SECURITY.
--   - DO NOT ADD BLANKET POLICIES (USING true).
--   - DO NOT GRANT UNNECESSARY PRIVILEGES TO service_role.
--   - DO NOT REVOKE ROUTINES WITHOUT FUNCTION INVENTORY AND DEPENDENCY ANALYSIS.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY ON ALL 58 PUBLIC TABLES
-- Activates default-deny for PostgREST roles (anon, authenticated).
-- Role 'postgres' (Prisma connection) continues normal operation via rolbypassrls.
-- ------------------------------------------------------------------------------

ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_feature_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_communication_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_chat_conversations ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. REVOKE DIRECT API AND PUBLIC PRIVILEGES ON EXISTING PUBLIC TABLES & SEQUENCES
-- Eliminates unauthorized PostgREST data access for anon, authenticated, and PUBLIC.
-- Note: Routines are intentionally excluded pending explicit staging routine inventory.
-- ------------------------------------------------------------------------------

-- Tables
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, PUBLIC;

-- Explicitly revoke on internal Prisma migration tracker table
REVOKE ALL ON TABLE public._prisma_migrations FROM anon, authenticated, PUBLIC;

-- Sequences
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, PUBLIC;

-- Schema creation privileges
REVOKE CREATE ON SCHEMA public FROM anon, authenticated, PUBLIC;

-- ------------------------------------------------------------------------------
-- 3. CONFIGURE DEFAULT PRIVILEGES FOR FUTURE TABLES & SEQUENCES CREATED BY 'postgres'
-- Prevents future Prisma-migrated tables and sequences from inheriting PostgREST grants.
-- Note regarding 'supabase_admin': Role 'postgres' cannot alter defaults for
-- 'supabase_admin' because postgres is not a superuser and not a member of
-- supabase_admin. Because Prisma migrations run as 'postgres', setting defaults
-- for role 'postgres' protects all future Prisma migrations.
-- Note regarding functions: Function defaults are omitted pending dependency analysis.
-- ------------------------------------------------------------------------------

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, PUBLIC;
