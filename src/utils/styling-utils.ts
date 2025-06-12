/**
 * Styling utilities for EmaPay components
 * Consolidates common CSS class patterns and provides utility functions
 */

import { cn } from '@/lib/utils'
import type { ValidationState, ButtonSize } from '@/types/component-props'

// ===== VALIDATION STYLING UTILITIES =====

/**
 * Get validation border classes based on state
 */
export function getValidationBorderClass(state: ValidationState): string {
  switch (state) {
    case 'valid':
      return 'validation-valid'
    case 'invalid':
      return 'validation-invalid'
    case 'neutral':
    case null:
    default:
      return 'validation-neutral'
  }
}

/**
 * Get validation text color classes
 */
export function getValidationTextClass(state: ValidationState): string {
  switch (state) {
    case 'invalid':
      return 'text-red-700'
    case 'valid':
      return 'text-green-700'
    case 'neutral':
    case null:
    default:
      return 'text-gray-600'
  }
}

// ===== FORM STYLING UTILITIES =====

/**
 * Get form input classes based on type and state
 */
export function getFormInputClasses(
  type: 'standard' | 'auth' | 'validation' | 'search' | 'amount' = 'standard',
  validationState?: ValidationState,
  additionalClasses?: string
): string {
  const baseClasses = {
    standard: 'form-input-standard',
    auth: 'form-input-auth',
    validation: 'form-input-auth-validation',
    search: 'search-input',
    amount: 'amount-input-standard'
  }

  const classes = [baseClasses[type]]

  if (validationState && type === 'validation') {
    classes.push(getValidationBorderClass(validationState))
  }

  if (additionalClasses) {
    classes.push(additionalClasses)
  }

  return cn(...classes)
}

/**
 * Get form spacing classes
 */
export function getFormSpacingClasses(hasSubtitle = false): string {
  return hasSubtitle ? 'form-input-with-subtitle' : 'space-y-2'
}

// ===== BUTTON STYLING UTILITIES =====

/**
 * Get EmaPay-specific button classes
 */
export function getEmapayButtonClasses(
  variant: 'primary' | 'secondary' | 'back' | 'copy' = 'primary',
  state?: 'default' | 'loading' | 'disabled' | 'copied'
): string {
  const baseClasses = {
    primary: 'primary-action-button',
    secondary: 'secondary-action-button',
    back: 'back-button',
    copy: 'copy-button'
  }

  const classes = [baseClasses[variant]]

  if (state === 'copied' && variant === 'copy') {
    classes.push('copied')
  }

  return cn(...classes)
}

/**
 * Get button size classes
 */
export function getButtonSizeClasses(size: ButtonSize): string {
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    default: 'h-12 px-4 text-base',
    lg: 'h-14 px-6 text-lg',
    icon: 'w-10 h-10'
  }

  return sizeClasses[size]
}

// ===== CARD STYLING UTILITIES =====

/**
 * Get card classes based on variant
 */
export function getCardClasses(
  variant: 'default' | 'selection' | 'content' | 'info' | 'warning' | 'balance' | 'transaction' = 'default',
  isActive = false,
  isClickable = false
): string {
  const baseClasses = {
    default: 'bg-white rounded-2xl p-4',
    selection: isActive ? 'card-selection-active' : 'card-selection',
    content: 'card-content',
    info: 'card-info',
    warning: 'card-warning',
    balance: 'card-balance',
    transaction: 'card-transaction'
  }

  const classes = [baseClasses[variant]]

  if (isClickable && variant !== 'selection') {
    classes.push('cursor-pointer hover:bg-gray-50 transition-colors')
  }

  return cn(...classes)
}

/**
 * Get card padding classes
 */
export function getCardPaddingClasses(padding: 'none' | 'sm' | 'md' | 'lg' = 'md'): string {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6'
  }

  return paddingClasses[padding]
}

// ===== TYPOGRAPHY STYLING UTILITIES =====

/**
 * Get heading classes based on level
 */
export function getHeadingClasses(
  level: 'main' | 'step' | 'section' | 'card' | 'small' = 'main'
): string {
  const headingClasses = {
    main: 'heading-main',
    step: 'heading-step',
    section: 'heading-section',
    card: 'heading-card',
    small: 'heading-small'
  }

  return headingClasses[level]
}

/**
 * Get label classes based on type
 */
export function getLabelClasses(
  type: 'info' | 'form' | 'body' | 'caption' = 'info'
): string {
  const labelClasses = {
    info: 'label-info',
    form: 'label-form',
    body: 'text-body',
    caption: 'text-caption'
  }

  return labelClasses[type]
}

/**
 * Get value display classes based on size
 */
export function getValueClasses(
  size: 'small' | 'medium' | 'large' | 'secondary' = 'medium'
): string {
  const valueClasses = {
    small: 'value-small',
    medium: 'value-medium',
    large: 'value-large',
    secondary: 'value-secondary'
  }

  return valueClasses[size]
}

// ===== LAYOUT STYLING UTILITIES =====

/**
 * Get flex layout classes
 */
export function getFlexClasses(
  direction: 'row' | 'col' = 'row',
  align: 'start' | 'center' | 'end' | 'stretch' = 'center',
  justify: 'start' | 'center' | 'end' | 'between' | 'around' = 'start',
  gap: 'none' | 'sm' | 'md' | 'lg' = 'md'
): string {
  const directionClass = direction === 'col' ? 'flex-col' : 'flex'
  const alignClass = `items-${align}`
  const justifyClass = `justify-${justify}`
  
  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  }

  return cn('flex', directionClass, alignClass, justifyClass, gapClasses[gap])
}

/**
 * Get grid layout classes
 */
export function getGridClasses(
  cols: 1 | 2 | 3 | 4 | 6 | 12 = 1,
  gap: 'none' | 'sm' | 'md' | 'lg' = 'md'
): string {
  const colsClass = `grid-cols-${cols}`
  
  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  }

  return cn('grid', colsClass, gapClasses[gap])
}

// ===== SPACING UTILITIES =====

/**
 * Get margin classes
 */
export function getMarginClasses(
  top?: 'none' | 'sm' | 'md' | 'lg' | 'xl',
  bottom?: 'none' | 'sm' | 'md' | 'lg' | 'xl',
  left?: 'none' | 'sm' | 'md' | 'lg' | 'xl',
  right?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
): string {
  const spacingMap = {
    none: '0',
    sm: '2',
    md: '4',
    lg: '6',
    xl: '8'
  }

  const classes: string[] = []

  if (top) classes.push(`mt-${spacingMap[top]}`)
  if (bottom) classes.push(`mb-${spacingMap[bottom]}`)
  if (left) classes.push(`ml-${spacingMap[left]}`)
  if (right) classes.push(`mr-${spacingMap[right]}`)

  return cn(...classes)
}

/**
 * Get padding classes
 */
export function getPaddingClasses(
  top?: 'none' | 'sm' | 'md' | 'lg' | 'xl',
  bottom?: 'none' | 'sm' | 'md' | 'lg' | 'xl',
  left?: 'none' | 'sm' | 'md' | 'lg' | 'xl',
  right?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
): string {
  const spacingMap = {
    none: '0',
    sm: '2',
    md: '4',
    lg: '6',
    xl: '8'
  }

  const classes: string[] = []

  if (top) classes.push(`pt-${spacingMap[top]}`)
  if (bottom) classes.push(`pb-${spacingMap[bottom]}`)
  if (left) classes.push(`pl-${spacingMap[left]}`)
  if (right) classes.push(`pr-${spacingMap[right]}`)

  return cn(...classes)
}

// ===== STATUS & STATE UTILITIES =====

/**
 * Get status indicator classes
 */
export function getStatusClasses(
  status: 'success' | 'warning' | 'error' | 'info' | 'pending' = 'info'
): string {
  const statusClasses = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    pending: 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return cn('px-2 py-1 rounded-full text-xs font-medium border', statusClasses[status])
}

/**
 * Get loading state classes
 */
export function getLoadingClasses(isLoading = false): string {
  return isLoading ? 'opacity-50 pointer-events-none' : ''
}

// ===== UTILITY COMBINATIONS =====

/**
 * Combine multiple utility classes
 */
export function combineClasses(...classGroups: (string | undefined)[]): string {
  return cn(...classGroups.filter(Boolean))
}

/**
 * Get responsive classes
 */
export function getResponsiveClasses(
  mobile: string,
  tablet?: string,
  desktop?: string
): string {
  const classes = [mobile]
  
  if (tablet) classes.push(`md:${tablet}`)
  if (desktop) classes.push(`lg:${desktop}`)
  
  return cn(...classes)
}
