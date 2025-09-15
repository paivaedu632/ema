/**
 * Standardized component prop interfaces for EmaPay
 * Consolidates common prop patterns and ensures consistency
 */

import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

// ===== BASE COMPONENT PROPS =====

/**
 * Base props that most components should accept
 */
export interface BaseComponentProps {
  className?: string
  children?: ReactNode
}

/**
 * Props for components that can be clicked
 */
export interface ClickableProps {
  onClick?: () => void
  disabled?: boolean
}

/**
 * Props for components with loading states
 */
export interface LoadingProps {
  isLoading?: boolean
  loadingText?: string
}

/**
 * Props for components with error states
 */
export interface ErrorProps {
  error?: string | null
  onErrorClear?: () => void
}

// ===== FORM COMPONENT PROPS =====

/**
 * Standard validation states for form components
 */
export type ValidationState = 'valid' | 'invalid' | 'neutral' | null

/**
 * Base props for form input components
 */
export interface BaseFormInputProps extends BaseComponentProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  validationState?: ValidationState
  errorMessage?: string
  subtitle?: string
}

/**
 * Props for form inputs with different types
 */
export interface TypedFormInputProps extends BaseFormInputProps {
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'url'
}

/**
 * Props for form inputs with password toggle functionality
 */
export interface PasswordFormInputProps extends BaseFormInputProps {
  type: 'password'
  showPasswordToggle?: boolean
}

/**
 * Props for form inputs with formatting (like date, phone, currency)
 */
export interface FormattedFormInputProps extends BaseFormInputProps {
  formatValue?: (value: string) => string
  parseValue?: (value: string) => string
}

// ===== DISPLAY COMPONENT PROPS =====

/**
 * Props for components that display label-value pairs
 */
export interface LabelValueProps extends BaseComponentProps {
  label: string
  value: string
}

/**
 * Props for components with copy-to-clipboard functionality
 */
export interface CopyableProps {
  showCopyButton?: boolean
  onCopy?: (value: string) => void
  copyButtonText?: string
  copiedText?: string
}

/**
 * Props for detail row components
 */
export interface DetailRowProps extends LabelValueProps, CopyableProps {
  fieldName?: string
}

/**
 * Props for info section components with icons
 */
export interface InfoSectionProps extends LabelValueProps {
  icon: LucideIcon
  actionButton?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'ghost'
  }
}

// ===== CARD COMPONENT PROPS =====

/**
 * Base props for card components
 */
export interface BaseCardProps extends BaseComponentProps, ClickableProps {
  variant?: 'default' | 'selection' | 'content' | 'info' | 'warning'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

/**
 * Props for balance card components
 */
export interface BalanceCardProps extends BaseCardProps {
  type: string
  currency: string
  amount: string
  flag: ReactNode
}

/**
 * Props for transaction card components
 */
export interface TransactionCardProps extends BaseCardProps {
  title: string
  subtitle?: string
  amount: string
  currency: string
  date: string
  status?: 'completed' | 'pending' | 'failed'
  icon?: LucideIcon
}

// ===== NAVIGATION COMPONENT PROPS =====

/**
 * Props for components with back navigation
 */
export interface BackNavigationProps {
  onBack?: () => void
  backPath?: string
  showBackButton?: boolean
}

/**
 * Props for page header components
 */
export interface PageHeaderProps extends BaseComponentProps, BackNavigationProps {
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'ghost'
  }
}

/**
 * Props for step indicator components
 */
export interface StepIndicatorProps extends BaseComponentProps {
  currentStep: number
  totalSteps: number
  completedSteps?: number[]
  stepLabels?: string[]
}

// ===== BUTTON COMPONENT PROPS =====

/**
 * Standard button variants used across EmaPay
 */
export type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive'
export type ButtonSize = 'sm' | 'default' | 'lg' | 'icon'

/**
 * Props for action button components
 */
export interface ActionButtonProps extends BaseComponentProps, ClickableProps, LoadingProps {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
}

// ===== CURRENCY & AMOUNT COMPONENT PROPS =====

/**
 * Props for currency display components
 */
export interface CurrencyDisplayProps extends BaseComponentProps {
  amount: string | number
  currency: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showSymbol?: boolean
  precision?: number
}

/**
 * Props for amount input components
 */
export interface AmountInputProps extends BaseFormInputProps {
  currency: string
  maxAmount?: number
  minAmount?: number
  showCurrencySelector?: boolean
  availableCurrencies?: string[]
  onCurrencyChange?: (currency: string) => void
}

// ===== FILE UPLOAD COMPONENT PROPS =====

/**
 * Props for file upload components
 */
export interface FileUploadProps extends BaseComponentProps, LoadingProps, ErrorProps {
  onUpload: (file: File) => void | Promise<void>
  onCancel?: () => void
  acceptedTypes?: string[]
  maxSizeInMB?: number
  title?: string
  description?: string
  showCameraOption?: boolean
  showFileOption?: boolean
  multiple?: boolean
}

// ===== SELECTION COMPONENT PROPS =====

/**
 * Props for selectable option items
 */
export interface SelectableOptionProps<T = string> extends BaseComponentProps, ClickableProps {
  value: T
  label: string
  description?: string
  icon?: LucideIcon | ReactNode
  isSelected?: boolean
  isDisabled?: boolean
}

/**
 * Props for radio selection components
 */
export interface RadioSelectionProps<T = string> extends BaseComponentProps {
  options: SelectableOptionProps<T>[]
  selectedValue?: T
  onSelectionChange: (value: T) => void
  name: string
  layout?: 'vertical' | 'horizontal' | 'grid'
}

// ===== MODAL & DIALOG COMPONENT PROPS =====

/**
 * Props for modal/dialog components
 */
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  showCloseButton?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  preventCloseOnOverlayClick?: boolean
}

/**
 * Props for confirmation dialog components
 */
export interface ConfirmationDialogProps extends ModalProps {
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel?: () => void
  variant?: 'default' | 'destructive' | 'warning'
}

// ===== UTILITY TYPE HELPERS =====

/**
 * Make certain props required
 */
export type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * Make certain props optional
 */
export type OptionalProps<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Combine multiple prop interfaces
 */
export type CombinedProps<T extends Record<string, unknown>[]> = T extends [infer First, ...infer Rest]
  ? First & CombinedProps<Rest extends Record<string, unknown>[] ? Rest : []>
  : Record<string, never>

// ===== COMMON PROP COMBINATIONS =====

/**
 * Props for interactive form components
 */
export type InteractiveFormProps = BaseFormInputProps & ClickableProps & LoadingProps & ErrorProps

/**
 * Props for display components with actions
 */
export type ActionableDisplayProps = LabelValueProps & ClickableProps & CopyableProps

/**
 * Props for card components with full functionality
 */
export type FullCardProps = BaseCardProps & LoadingProps & ErrorProps

/**
 * Props for navigation components
 */
export type NavigationComponentProps = BaseComponentProps & BackNavigationProps & LoadingProps
