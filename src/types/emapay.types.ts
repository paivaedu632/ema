// EmaPay-specific types and enums
export type Currency = 'AOA' | 'EUR'

export type TransactionType = 
  | 'buy'      // Buy AOA with EUR
  | 'sell'     // Sell AOA for EUR  
  | 'send'     // Send money to another user
  | 'deposit'  // Deposit money into wallet
  | 'withdraw' // Withdraw money from wallet

export type TransactionStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type KycStatus = 
  | 'not_started'
  | 'in_progress'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'requires_update'

export type DocumentType = 
  | 'identity_card_front'
  | 'identity_card_back'
  | 'passport'
  | 'driver_license_front'
  | 'driver_license_back'
  | 'proof_of_address'
  | 'selfie'
  | 'selfie_with_document'

export type VerificationStatus = 
  | 'pending'
  | 'processing'
  | 'verified'
  | 'rejected'
  | 'requires_resubmission'

export type ExchangeRateType = 
  | 'automatic'  // Bot icon - automated rate
  | 'manual'     // Wrench icon - manually set rate

// KYC Step Data Types
export interface PersonalInfoData {
  full_name: string
  date_of_birth: string
  nationality: string
  country_of_residence: string
  city: string
  address: string
  postal_code?: string
  phone_number: string
}

export interface DocumentData {
  document_type: DocumentType
  document_number: string
  issue_date?: string
  expiry_date?: string
  issuing_authority?: string
}

export interface OccupationData {
  occupation: string
  employer_name?: string
  industry: string
  employment_status: 'employed' | 'self_employed' | 'unemployed' | 'student' | 'retired'
}

export interface IncomeData {
  source: string
  monthly_income_eur: number
  currency: Currency
}

export interface PepData {
  is_pep: boolean
  pep_details?: string
  family_member_pep: boolean
  family_pep_details?: string
}

export interface AppUsageData {
  primary_purpose: string
  expected_monthly_volume_eur: number
  source_of_funds: string
}

// Transaction-related types
export interface RecipientInfo {
  name?: string
  email?: string
  phone?: string
  bank_account?: string
  iban?: string
  swift_code?: string
}

export interface TransactionMetadata {
  description?: string
  reference?: string
  exchange_rate_used?: number
  fee_breakdown?: {
    base_fee: number
    percentage_fee: number
    total_fee: number
  }
  processing_time?: string
  payment_method?: string
}

// Wallet balance types
export interface WalletBalance {
  currency: Currency
  balance: number
  available_balance: number
  pending_balance: number
}

// Exchange rate types
export interface ExchangeRateInfo {
  from_currency: Currency
  to_currency: Currency
  rate: number
  rate_type: ExchangeRateType
  is_active: boolean
  created_at: string
  updated_at: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

// Form validation types
export interface ValidationError {
  field: string
  message: string
}

export interface FormState {
  isValid: boolean
  errors: ValidationError[]
  isSubmitting: boolean
}

// Constants
export const SUPPORTED_CURRENCIES: Currency[] = ['AOA', 'EUR']
export const TRANSACTION_FEE_PERCENTAGE = 0.02 // 2%

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  AOA: 'Kz',
  EUR: '€'
}

export const CURRENCY_NAMES: Record<Currency, string> = {
  AOA: 'Kwanza Angolano',
  EUR: 'Euro'
}

// KYC Steps configuration
export const KYC_STEPS = [
  { step: 1, name: 'notifications', title: 'Ativar Notificações' },
  { step: 2, name: 'passcode', title: 'Definir Código' },
  { step: 3, name: 'personal-info', title: 'Informações Pessoais' },
  { step: 4, name: 'id-upload', title: 'Carregar Documento' },
  { step: 5, name: 'id-verification', title: 'Verificação de Documento' },
  { step: 6, name: 'selfie', title: 'Verificação Biométrica' },
  { step: 7, name: 'occupation', title: 'Ocupação' },
  { step: 8, name: 'income', title: 'Rendimento' },
  { step: 9, name: 'pep-status', title: 'Status PEP' },
  { step: 10, name: 'app-usage', title: 'Uso da Aplicação' }
] as const

export type KycStepName = typeof KYC_STEPS[number]['name']
