-- =====================================================================================
-- EmaPay Initial Seed Data Migration
-- =====================================================================================
-- This migration seeds the database with initial data for EmaPay:
-- 1. Default exchange rates (EUR to AOA and vice versa)
-- 2. System configuration data
-- =====================================================================================

-- =====================================================================================
-- 1. SEED EXCHANGE RATES
-- =====================================================================================
-- Insert initial exchange rates based on current market rates
-- EUR to AOA: approximately 924 AOA per 1 EUR
-- AOA to EUR: approximately 0.00108 EUR per 1 AOA

-- EUR to AOA exchange rate (manual type as per user preference for static rates)
INSERT INTO exchange_rates (
  from_currency,
  to_currency,
  rate,
  rate_type,
  is_active
) VALUES (
  'EUR',
  'AOA',
  924.067500,
  'manual',
  true
);

-- AOA to EUR exchange rate
INSERT INTO exchange_rates (
  from_currency,
  to_currency,
  rate,
  rate_type,
  is_active
) VALUES (
  'AOA',
  'EUR',
  0.001082,
  'manual',
  true
);

-- =====================================================================================
-- 2. SYSTEM CONFIGURATION (Future Use)
-- =====================================================================================
-- Note: Additional system configuration tables can be added here in future migrations
-- Examples: app_settings, fee_configurations, notification_templates, etc.

-- =====================================================================================
-- 3. VERIFICATION AND LOGGING
-- =====================================================================================
-- Log the successful seeding operation
DO $$
BEGIN
  RAISE NOTICE 'EmaPay initial seed data migration completed successfully';
  RAISE NOTICE 'Exchange rates seeded: EUR/AOA = 924.067500, AOA/EUR = 0.001082';
END $$;