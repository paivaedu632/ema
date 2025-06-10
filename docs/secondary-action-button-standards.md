# EmaPay Universal Secondary Action Button Standards

This document outlines the standardized CSS classes for secondary action buttons used across all EmaPay components. These classes ensure consistent styling, behavior, and user experience for all non-primary interactive elements.

## Overview

All EmaPay components use various types of secondary buttons that have been standardized into reusable CSS classes in `src/app/globals.css`. This approach provides:

- **Consistency**: All secondary buttons use the same styling patterns
- **Hierarchy**: Clear visual distinction from primary action buttons
- **Maintainability**: Changes can be made in one location
- **User Experience**: Consistent interaction patterns across the app
- **Developer Experience**: Clear, semantic class names

## Secondary Button Classes

### 1. Navigation Buttons

#### `.back-button`
Navigation back buttons with arrow icons.
```css
.back-button {
  @apply p-0 mb-6;
  /* Uses ShadCN Button with variant="ghost" size="icon" */
}
```
**Usage**: Back navigation in all flows
**Implementation**: `<Button variant="ghost" size="icon" className="back-button">`

### 2. Action Feedback Buttons

#### `.copy-button`
Copy action buttons with state feedback.
```css
.copy-button {
  @apply h-8 px-4 text-xs transition-all;
  background-color: #f3f4f6 !important; /* gray-100 - consistent with secondary buttons */
  border: 1px solid #f3f4f6 !important; /* gray-100 - consistent with secondary buttons */
  color: #111827 !important; /* gray-900 - consistent with secondary buttons */
  border-radius: 9999px !important; /* rounded-full - consistent with secondary buttons */
}

.copy-button:hover {
  background-color: #f3f4f6 !important; /* gray-100 - consistent with secondary buttons */
}

.copy-button.copied {
  background-color: #000000 !important; /* black */
  border-color: #000000 !important; /* black */
  color: #ffffff !important; /* white */
}
```
**Usage**: Copy buttons in deposit flow, payment details
**State Management**: Add `.copied` class for visual feedback

### 3. Secondary Actions

#### `.secondary-action-button`
Secondary actions like "Vender", "Comprar".
```css
.secondary-action-button {
  @apply flex-1 font-medium border border-gray-100 cursor-pointer;
  height: 3rem !important; /* 48px - h-12 */
  background-color: #f3f4f6 !important; /* gray-100 */
  color: #111827 !important; /* gray-900 */
  border-radius: 9999px !important; /* rounded-full */
  font-size: 1rem !important; /* 16px - text-base */
  transition: background-color 0.2s ease-in-out !important;
}

.secondary-action-button:hover {
  background-color: #f3f4f6 !important; /* gray-100 */
}
```
**Usage**: Dashboard secondary actions, paired buttons

#### `.outline-secondary-button`
Alternative actions like "Voltar ao início".
```css
.outline-secondary-button {
  @apply w-full text-black font-medium;
  height: 4rem !important; /* 64px - h-16 */
  background-color: transparent !important;
  border: 1px solid #000000 !important; /* black border */
  border-radius: 9999px !important; /* rounded-full */
  font-size: 1.125rem !important; /* 18px - text-lg */
  transition: background-color 0.2s ease-in-out !important;
}

.outline-secondary-button:hover {
  background-color: #f3f4f6 !important; /* gray-100 */
}
```
**Usage**: Alternative actions in success pages, secondary navigation

### 4. Small Actions

#### `.small-action-button`
Small actions like "Trocar", "Enviar".
```css
.small-action-button {
  @apply h-8 px-3 text-sm;
  background-color: #f3f4f6 !important; /* gray-100 - consistent with secondary buttons */
  border: 1px solid #f3f4f6 !important; /* gray-100 - consistent with secondary buttons */
  color: #111827 !important; /* gray-900 - consistent with secondary buttons */
  border-radius: 9999px !important; /* rounded-full - consistent with secondary buttons */
  transition: background-color 0.2s ease-in-out !important;
}

.small-action-button:hover {
  background-color: #f3f4f6 !important; /* gray-100 - consistent with secondary buttons */
}
```
**Usage**: Inline actions, form controls, small interactive elements

### 5. Icon Buttons

#### `.icon-action-button`
Dashboard icon buttons with labels.
```css
.icon-action-button {
  @apply flex flex-col items-center space-y-2 cursor-pointer p-2 rounded-lg;
  transition: opacity 0.2s ease-in-out, background-color 0.2s ease-in-out !important;
}

.icon-action-button:hover {
  opacity: 0.8 !important;
  background-color: #f3f4f6 !important; /* gray-100 */
}
```

#### `.icon-action-circle`
Circular icon containers for icon buttons.
```css
.icon-action-circle {
  @apply w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-100;
}
```
**Usage**: Dashboard navigation icons (Depositar, Enviar, Receber, Retirar)

## Usage Examples

### Back Navigation
```tsx
<Button variant="ghost" size="icon" onClick={handleBack} className="back-button">
  <ArrowLeft className="h-6 w-6" />
</Button>
```

### Copy Button with State
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => copyToClipboard(value, fieldName)}
  className={`copy-button ${copiedField === fieldName ? "copied" : ""}`}
>
  {copiedField === fieldName ? (
    <>
      <Check className="h-3 w-3 mr-1" />
      Copiado
    </>
  ) : (
    "Copiar"
  )}
</Button>
```

### Secondary Action Buttons
```tsx
<div className="flex space-x-3">
  <Button onClick={handleVender} className="secondary-action-button">
    Vender
  </Button>
  <Button onClick={handleComprar} className="secondary-action-button">
    Comprar
  </Button>
</div>
```

### Outline Secondary Button
```tsx
<Button
  onClick={handleBackToHome}
  variant="outline"
  className="outline-secondary-button"
>
  Voltar ao início
</Button>
```

### Small Action Button
```tsx
<Button variant="outline" size="sm" className="small-action-button">
  Trocar
</Button>
```

### Icon Action Button
```tsx
<button onClick={handleDepositar} className="icon-action-button">
  <div className="icon-action-circle">
    <Plus className="w-5 h-5 text-gray-700" />
  </div>
  <span className="text-sm text-gray-700 font-medium">Depositar</span>
</button>
```

## Button Hierarchy

1. **Primary Action Button** (`.primary-action-button`) - Main actions (black, prominent)
2. **Secondary Action Button** (`.secondary-action-button`) - Secondary actions (gray, medium)
3. **Outline Secondary Button** (`.outline-secondary-button`) - Alternative actions (outline, medium)
4. **Small Action Button** (`.small-action-button`) - Inline actions (gray, small)
5. **Copy Button** (`.copy-button`) - Feedback actions (gray → black, small)
6. **Back Button** (`.back-button`) - Navigation (ghost, icon only)

## Sizing Standards

- **Large**: 64px height (h-16) - Primary and outline secondary buttons
- **Medium**: 48px height (h-12) - Secondary action buttons
- **Small**: 32px height (h-8) - Copy and small action buttons
- **Icon**: 36px size (size-9) - Back buttons

## Color Scheme

- **Gray-100** (`#f3f4f6`) - Secondary button backgrounds
- **Gray-200** (`#e5e7eb`) - Small button backgrounds, hover states
- **Gray-300** (`#d1d5db`) - Hover states for small buttons
- **Black** (`#000000`) - Outline borders, active copy button
- **Gray-50** (`#f9fafb`) - Outline button hover background

## Best Practices

1. **Use appropriate hierarchy** - Choose button type based on action importance
2. **Consistent spacing** - Use standardized heights and padding
3. **State feedback** - Implement proper hover and active states
4. **Accessibility** - Ensure proper contrast and touch targets
5. **Icon consistency** - Use Lucide icons with consistent sizing
6. **Test interactions** - Verify hover effects and transitions work properly

## Migration Guide

### Before (Old Pattern)
```tsx
<Button
  variant="outline"
  size="sm"
  className="h-8 bg-gray-200 hover:bg-gray-300 border-gray-200 rounded-full px-3 text-sm"
>
  Trocar
</Button>
```

### After (New Pattern)
```tsx
<Button variant="outline" size="sm" className="small-action-button">
  Trocar
</Button>
```

## Related Standards

- [Primary Action Button Standards](./primary-action-button-standards.md)
- [Typography Standards](./typography-standards.md)
- [Layout Container Standards](./layout-container-standards.md)
