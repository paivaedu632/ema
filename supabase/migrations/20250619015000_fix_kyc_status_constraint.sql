-- =====================================================================================
-- Fix KYC Status Constraint Migration
-- =====================================================================================
-- This migration updates the kyc_records status check constraint to include 
-- 'not_started' status which is used by the trigger function.
-- =====================================================================================

-- Drop the existing check constraint
ALTER TABLE kyc_records DROP CONSTRAINT kyc_records_status_check;

-- Add the updated check constraint with 'not_started' included
ALTER TABLE kyc_records ADD CONSTRAINT kyc_records_status_check 
  CHECK (status IN ('not_started', 'pending', 'in_progress', 'completed', 'rejected'));

-- Migration completed successfully
SELECT 'KYC status constraint updated successfully' AS status;
