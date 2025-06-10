# EmaPay Universal Layout Container Standards

This document outlines the standardized CSS classes for layout containers used across all EmaPay components. These classes ensure consistent spacing, positioning, and responsive behavior throughout the application.

## Overview

All EmaPay components follow consistent layout patterns that have been standardized into reusable CSS classes in `src/app/globals.css`. This approach provides:

- **Consistency**: All flows use the same layout patterns
- **Maintainability**: Changes can be made in one location
- **Developer Experience**: Clear, semantic class names
- **Responsive Design**: Built-in responsive behavior

## Layout Container Classes

### 1. Page Containers

#### `.page-container`
Basic full-height page wrapper without background color.
```css
.page-container {
  @apply min-h-screen;
}
```

#### `.page-container-white`
Page container with white background - used for deposit, send, receive flows.
```css
.page-container-white {
  @apply min-h-screen bg-white;
}
```

#### `.page-container-gray`
Page container with gray background - used for buy, sell, withdraw flows.
```css
.page-container-gray {
  @apply min-h-screen bg-gray-100;
}
```

### 2. Content Containers

#### `.content-container`
Standard content area with consistent spacing and max-width.
```css
.content-container {
  @apply max-w-sm mx-auto px-4 pt-8 pb-24;
}
```

#### `.content-container-centered`
Centered content variant for success pages and special layouts.
```css
.content-container-centered {
  @apply max-w-sm mx-auto px-4 pt-8 pb-24 flex flex-col justify-center items-center text-center flex-1;
}
```

### 3. Fixed Bottom Container

#### `.fixed-bottom-container`
Bottom action button area with consistent positioning.
```css
.fixed-bottom-container {
  @apply fixed bottom-6 left-4 right-4 max-w-sm mx-auto;
}
```

## Usage Examples

### Standard Flow Layout
```tsx
export function MyFlow() {
  return (
    <div className="page-container-white">
      <main className="content-container">
        {/* Your content here */}
        <h1>Flow Title</h1>
        {/* Form elements, etc. */}
      </main>
      
      <div className="fixed-bottom-container">
        <Button className="primary-action-button">
          Continue
        </Button>
      </div>
    </div>
  )
}
```

### Success Page Layout
```tsx
export function SuccessPage() {
  return (
    <div className="page-container-white flex flex-col">
      <main className="content-container-centered">
        {/* Centered success content */}
        <div className="w-24 h-24 mb-8">
          {/* Success icon */}
        </div>
        <h1>Success!</h1>
        <p>Your action was completed successfully.</p>
      </main>
      
      <div className="fixed-bottom-container">
        <Button className="primary-action-button">
          Back to Home
        </Button>
      </div>
    </div>
  )
}
```

### Gray Background Flow
```tsx
export function BuyFlow() {
  return (
    <div className="page-container-gray">
      <main className="content-container">
        {/* Your content here */}
        <h1>Buy Currency</h1>
        {/* Form elements, etc. */}
      </main>
      
      <div className="fixed-bottom-container">
        <Button className="primary-action-button">
          Continue
        </Button>
      </div>
    </div>
  )
}
```

## Migration Guide

### Before (Old Pattern)
```tsx
<div className="min-h-screen bg-white">
  <main className="max-w-sm mx-auto px-4 pt-8 pb-24">
    {/* content */}
  </main>
  <div className="fixed bottom-6 left-4 right-4 max-w-sm mx-auto">
    <Button>Action</Button>
  </div>
</div>
```

### After (New Pattern)
```tsx
<div className="page-container-white">
  <main className="content-container">
    {/* content */}
  </main>
  <div className="fixed-bottom-container">
    <Button>Action</Button>
  </div>
</div>
```

## Component Usage Guidelines

### When to Use Each Container

- **`.page-container-white`**: Deposit, Send, Receive, Transfer flows
- **`.page-container-gray`**: Buy, Sell, Withdraw flows  
- **`.content-container`**: All standard flow steps
- **`.content-container-centered`**: Success pages, confirmation screens
- **`.fixed-bottom-container`**: All bottom action buttons

### Responsive Behavior

All container classes include built-in responsive behavior:
- **Mobile-first design**: Optimized for mobile devices
- **Consistent spacing**: 16px horizontal padding, 32px top padding, 96px bottom padding
- **Max-width constraint**: 384px (24rem) maximum width for optimal mobile experience
- **Center alignment**: Automatic horizontal centering

## Best Practices

1. **Always use these standardized classes** instead of custom layout styles
2. **Combine with existing universal classes** like `.primary-action-button`
3. **Maintain consistent patterns** across all EmaPay flows
4. **Test on mobile devices** to ensure proper spacing and usability
5. **Update documentation** when adding new layout patterns

## Related Standards

- [Primary Action Button Standards](./primary-action-button-standards.md)
- [Amount Input Field Standards](./amount-input-standards.md)
- [Currency Selector Standards](./currency-selector-standards.md)
