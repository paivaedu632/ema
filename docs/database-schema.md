# EmaPay Database Schema Documentation

## Overview

The EmaPay database is built on Supabase (PostgreSQL) with a focus on security, scalability, and type safety. All tables implement Row Level Security (RLS) to ensure users can only access their authorized data.

## Tables

### 1. users
**Purpose**: Store user profile information synced with Clerk authentication

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| clerk_user_id | text | NOT NULL, UNIQUE | Clerk authentication ID |
| email | text | NOT NULL | User email address |
| full_name | text | | User's full name |
| phone_number | text | | User's phone number |
| profile_image_url | text | | URL to user's profile image |
| created_at | timestamptz | DEFAULT now() | Record creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_users_clerk_user_id` on `clerk_user_id`
- `idx_users_email` on `email`

### 2. wallets
**Purpose**: Store multi-currency wallet balances for each user

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique wallet identifier |
| user_id | uuid | NOT NULL, REFERENCES users(id) | Owner of the wallet |
| currency | text | NOT NULL, CHECK (currency IN ('AOA', 'EUR')) | Currency code |
| balance | decimal(15,2) | NOT NULL, DEFAULT 0, CHECK (balance >= 0) | Total balance |
| available_balance | decimal(15,2) | NOT NULL, DEFAULT 0, CHECK (available_balance >= 0) | Available for transactions |
| pending_balance | decimal(15,2) | NOT NULL, DEFAULT 0, CHECK (pending_balance >= 0) | Pending transactions |
| created_at | timestamptz | DEFAULT now() | Record creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Constraints**:
- `UNIQUE(user_id, currency)` - One wallet per currency per user
- `CHECK (balance = available_balance + pending_balance)` - Balance integrity

**Indexes**:
- `idx_wallets_user_id` on `user_id`
- `idx_wallets_currency` on `currency`

### 3. transactions
**Purpose**: Record all financial transactions with comprehensive metadata

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique transaction identifier |
| user_id | uuid | NOT NULL, REFERENCES users(id) | Transaction owner |
| type | text | NOT NULL, CHECK (type IN ('buy', 'sell', 'send', 'deposit', 'withdraw')) | Transaction type |
| amount | decimal(15,2) | NOT NULL, CHECK (amount > 0) | Transaction amount |
| currency | text | NOT NULL, CHECK (currency IN ('AOA', 'EUR')) | Transaction currency |
| fee_amount | decimal(15,2) | NOT NULL, DEFAULT 0, CHECK (fee_amount >= 0) | Fee charged |
| net_amount | decimal(15,2) | NOT NULL, CHECK (net_amount > 0) | Amount after fees |
| exchange_rate | decimal(10,6) | | Exchange rate used (if applicable) |
| status | text | NOT NULL, DEFAULT 'pending', CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')) | Transaction status |
| reference_id | text | | External reference ID |
| recipient_info | jsonb | | Recipient details (for send transactions) |
| metadata | jsonb | | Additional transaction metadata |
| created_at | timestamptz | DEFAULT now() | Record creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_transactions_user_id` on `user_id`
- `idx_transactions_type` on `type`
- `idx_transactions_status` on `status`
- `idx_transactions_created_at` on `created_at DESC`

### 4. kyc_records
**Purpose**: Track KYC verification progress and store verification data

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique KYC record identifier |
| user_id | uuid | NOT NULL, REFERENCES users(id) | User undergoing KYC |
| status | text | NOT NULL, DEFAULT 'not_started', CHECK (status IN ('not_started', 'in_progress', 'pending_review', 'approved', 'rejected', 'requires_update')) | KYC status |
| current_step | integer | DEFAULT 1, CHECK (current_step >= 1 AND current_step <= 16) | Current step in KYC process |
| data | jsonb | NOT NULL, DEFAULT '{}' | KYC form data |
| documents | jsonb | DEFAULT '{}' | Document references |
| verification_results | jsonb | DEFAULT '{}' | AI verification results |
| created_at | timestamptz | DEFAULT now() | Record creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Constraints**:
- `UNIQUE(user_id)` - One KYC record per user

**Indexes**:
- `idx_kyc_records_user_id` on `user_id`
- `idx_kyc_records_status` on `status`

### 5. documents
**Purpose**: Store KYC document metadata and AWS S3 references

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique document identifier |
| user_id | uuid | NOT NULL, REFERENCES users(id) | Document owner |
| kyc_record_id | uuid | REFERENCES kyc_records(id) | Associated KYC record |
| document_type | text | NOT NULL, CHECK (document_type IN ('identity_card_front', 'identity_card_back', 'passport', 'driver_license_front', 'driver_license_back', 'proof_of_address', 'selfie', 'selfie_with_document')) | Type of document |
| file_name | text | NOT NULL | Original file name |
| file_size | integer | | File size in bytes |
| mime_type | text | | File MIME type |
| s3_bucket | text | NOT NULL | AWS S3 bucket name |
| s3_key | text | NOT NULL | AWS S3 object key |
| verification_status | text | DEFAULT 'pending', CHECK (verification_status IN ('pending', 'processing', 'verified', 'rejected', 'requires_resubmission')) | Verification status |
| verification_results | jsonb | DEFAULT '{}' | AWS AI service results |
| created_at | timestamptz | DEFAULT now() | Record creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_documents_user_id` on `user_id`
- `idx_documents_kyc_record_id` on `kyc_record_id`
- `idx_documents_type` on `document_type`
- `idx_documents_verification_status` on `verification_status`

### 6. exchange_rates
**Purpose**: Store currency exchange rates (EUR ↔ AOA)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique rate identifier |
| from_currency | text | NOT NULL, CHECK (from_currency IN ('AOA', 'EUR')) | Source currency |
| to_currency | text | NOT NULL, CHECK (to_currency IN ('AOA', 'EUR')) | Target currency |
| rate | decimal(10,6) | NOT NULL, CHECK (rate > 0) | Exchange rate |
| rate_type | text | NOT NULL, CHECK (rate_type IN ('automatic', 'manual')) | Rate setting method |
| is_active | boolean | NOT NULL, DEFAULT true | Whether rate is active |
| created_at | timestamptz | DEFAULT now() | Record creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Constraints**:
- `CHECK (from_currency != to_currency)` - Different currencies required

**Indexes**:
- `idx_exchange_rates_currencies` on `(from_currency, to_currency)`
- `idx_exchange_rates_active` on `is_active`

## Database Functions

### 1. get_active_exchange_rate(from_curr text, to_curr text)
**Purpose**: Get the current active exchange rate between two currencies
**Returns**: `decimal` - The exchange rate
**Usage**: Used for real-time currency conversion calculations

### 2. get_current_user_id()
**Purpose**: Get the current authenticated user's ID from JWT
**Returns**: `uuid` - Current user ID
**Usage**: Used in RLS policies for user-based data access

### 3. get_user_balance(user_uuid uuid, currency_code text)
**Purpose**: Get user's total balance for a specific currency
**Returns**: `decimal` - Total balance
**Usage**: Balance display and transaction validation

### 4. get_user_available_balance(user_uuid uuid, currency_code text)
**Purpose**: Get user's available balance for a specific currency
**Returns**: `decimal` - Available balance
**Usage**: Transaction validation and spending limits

### 5. user_owns_resource(resource_user_id uuid)
**Purpose**: Check if current user owns a resource
**Returns**: `boolean` - Ownership status
**Usage**: Used in RLS policies for data access control

## Row Level Security (RLS) Policies

### users table
- **SELECT**: Users can only view their own profile
- **INSERT**: New users can be created via service role
- **UPDATE**: Users can only update their own profile
- **DELETE**: Restricted to service role only

### wallets table
- **SELECT**: Users can only view their own wallets
- **INSERT**: Wallets created via service role during user registration
- **UPDATE**: Balance updates via service role only
- **DELETE**: Restricted to service role only

### transactions table
- **SELECT**: Users can only view their own transactions
- **INSERT**: Users can create transactions for themselves
- **UPDATE**: Status updates via service role only
- **DELETE**: No deletion allowed

### kyc_records table
- **SELECT**: Users can only view their own KYC record
- **INSERT**: Users can create their own KYC record
- **UPDATE**: Users can update their own KYC record
- **DELETE**: No deletion allowed

### documents table
- **SELECT**: Users can only view their own documents
- **INSERT**: Users can upload their own documents
- **UPDATE**: Verification updates via service role only
- **DELETE**: Users can delete their own documents

### exchange_rates table
- **SELECT**: Public read access for all users
- **INSERT/UPDATE/DELETE**: Restricted to service role only

## Triggers

### updated_at Triggers
All tables have `updated_at` triggers that automatically update the timestamp when a record is modified.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

## Sample Data

### Exchange Rates
```sql
INSERT INTO exchange_rates (from_currency, to_currency, rate, rate_type) VALUES
('EUR', 'AOA', 850.00, 'automatic'),
('AOA', 'EUR', 0.00118, 'automatic');
```

## Migration History

1. **Initial Schema** - Created all core tables with proper constraints
2. **RLS Policies** - Implemented Row Level Security for all tables
3. **Database Functions** - Added utility functions for common operations
4. **Indexes** - Added performance indexes for common queries
5. **Triggers** - Added updated_at triggers for all tables

## Performance Considerations

- All foreign keys have corresponding indexes
- Composite indexes on frequently queried column combinations
- Partial indexes on status columns for active records
- JSONB columns use GIN indexes for efficient querying

## Backup & Recovery

- Automated daily backups via Supabase
- Point-in-time recovery available
- Migration scripts stored in version control
- Database schema versioning with Supabase CLI

---

**Last Updated**: June 14, 2025  
**Schema Version**: 1.0.0
