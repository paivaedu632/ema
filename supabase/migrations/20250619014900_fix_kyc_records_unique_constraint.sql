-- =====================================================================================
-- Fix KYC Records Unique Constraint Migration
-- =====================================================================================
-- This migration adds the missing unique constraint on user_id in kyc_records table
-- to fix the ON CONFLICT clause in the trigger function.
-- =====================================================================================

-- Add unique constraint on user_id to kyc_records table
-- This ensures each user can only have one KYC record
ALTER TABLE kyc_records ADD CONSTRAINT kyc_records_user_id_unique UNIQUE (user_id);

-- Migration completed successfully
SELECT 'KYC records unique constraint added successfully' AS status;
