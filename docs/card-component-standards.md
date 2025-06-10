# EmaPay Universal Card Component Standards

This document outlines the standardized CSS classes for card components used across all EmaPay components. These classes ensure consistent styling, behavior, and user experience for all card-based UI elements.

## Overview

All EmaPay components use various types of cards that have been standardized into reusable CSS classes in `src/app/globals.css`. This approach provides:

- **Consistency**: All cards follow the same design patterns
- **Maintainability**: Changes can be made in one central location
- **Efficiency**: Developers can quickly apply appropriate card styles
- **User Experience**: Consistent visual hierarchy and interaction patterns

## Card Component Classes

### 1. Balance Cards

#### `.card-balance`
Used for dashboard account/currency balance cards.
```css
.card-balance {
  @apply bg-gray-100 rounded-2xl border border-gray-100 p-6;
}
```
**Usage**: Dashboard account cards, currency balance displays
**Background**: Light gray (`bg-gray-100`)
**Border**: Gray border (`border-gray-100`)
**Padding**: Large padding (`p-6`)
**Border Radius**: Extra large (`rounded-2xl`)

### 2. Content Cards

#### `.card-content`
Used for exchange details, payment info, confirmation summaries.
```css
.card-content {
  @apply bg-white rounded-2xl p-4;
}
```
**Usage**: Exchange rate displays, payment information, confirmation details
**Background**: White (`bg-white`)
**Border**: None (clean appearance)
**Padding**: Medium padding (`p-4`)
**Border Radius**: Extra large (`rounded-2xl`)

### 3. Selection Cards

#### `.card-selection`
Used for payment methods, exchange options, clickable choices.
```css
.card-selection {
  @apply bg-white border border-black rounded-2xl p-4 cursor-pointer hover:bg-gray-100 transition-colors;
}
```
**Usage**: Payment method selection, exchange method options, clickable choices
**Background**: White with hover state (`hover:bg-gray-100`)
**Border**: Black border (`border-black`)
**Interaction**: Clickable with smooth transitions
**Padding**: Medium padding (`p-4`)

#### `.card-selection-active`
Used when a selection card is selected/active.
```css
.card-selection-active {
  @apply bg-white border-2 border-black rounded-2xl p-4 cursor-pointer;
}
```
**Usage**: Selected payment methods, active exchange options
**Border**: Thicker black border (`border-2 border-black`) to indicate selection

### 4. Info Cards

#### `.card-info`
Used for informational content, help text, and notices.
```css
.card-info {
  @apply bg-gray-100 border border-gray-100 rounded-2xl p-4;
}
```
**Usage**: Help text, informational notices, tips
**Background**: Light gray (`bg-gray-100`)
**Border**: Gray border (`border-gray-100`)

#### `.card-warning`
Used for important warnings and alerts.
```css
.card-warning {
  @apply bg-gray-100 border border-gray-100 rounded-2xl p-4;
}
```
**Usage**: Important warnings, alerts, attention-required content
**Background**: Light gray (`bg-gray-100`)
**Border**: Gray border (`border-gray-100`)

### 5. Transaction Cards

#### `.card-transaction`
Used for transaction history items and similar list items.
```css
.card-transaction {
  @apply bg-white border border-gray-100 rounded-2xl p-4 hover:bg-gray-100 transition-colors;
}
```
**Usage**: Transaction history, contact lists, similar list items
**Background**: White with hover state
**Border**: Light gray border (`border-gray-100`)
**Interaction**: Hover effect for better UX

### 6. Exchange Detail Cards

#### `.card-exchange-detail`
Used specifically for exchange rate and fee information.
```css
.card-exchange-detail {
  @apply bg-white rounded-2xl p-4;
}
```
**Usage**: Exchange rate displays, fee breakdowns, calculation summaries
**Background**: Clean white background
**Border**: None for minimal appearance

### 7. Cards with Dividers

#### `.card-with-dividers`
Used for cards with internal sections separated by borders.
```css
.card-with-dividers {
  @apply bg-white rounded-2xl p-4;
}

.card-with-dividers .card-divider {
  @apply py-2 border-b border-gray-100 last:border-b-0;
}
```
**Usage**: Confirmation summaries, detailed breakdowns with multiple sections
**Structure**: Main card with internal divider elements
**Dividers**: Light gray borders between sections, no border on last item

## Implementation Examples

### Balance Card Example
```jsx
<div className="card-balance">
  <div className="flex items-center space-x-3">
    <AngolaFlag />
    <h3 className="heading-card">AOA</h3>
  </div>
  <div>
    <p className="label-form">Conta</p>
    <p className="value-large">100 AOA</p>
  </div>
</div>
```

### Selection Card Example
```jsx
<div className="card-selection">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Landmark className="h-5 w-5" />
      <span className="value-secondary">Transferência bancária</span>
    </div>
    <Button className="small-action-button">Trocar</Button>
  </div>
</div>
```

### Card with Dividers Example
```jsx
<div className="card-with-dividers">
  <div className="card-divider">
    <div className="flex justify-between">
      <span className="label-form">Câmbio</span>
      <span className="value-primary">1.00 USD = 924.0675 AOA</span>
    </div>
  </div>
  <div className="card-divider">
    <div className="flex justify-between">
      <span className="label-form">Taxa</span>
      <span className="value-primary">100 AOA</span>
    </div>
  </div>
  <div className="card-divider">
    <div className="flex justify-between">
      <span className="label-form">Você recebe</span>
      <span className="value-primary">100 AOA</span>
    </div>
  </div>
</div>
```

## Design Principles

1. **Consistent Border Radius**: All cards use `rounded-2xl` for consistent visual appearance
2. **Appropriate Padding**: `p-6` for balance cards (more content), `p-4` for most other cards
3. **Clear Visual Hierarchy**: Different background colors indicate different card purposes
4. **Interactive Feedback**: Hover states and transitions for clickable cards
5. **Accessibility**: Proper cursor states and visual feedback for interactive elements
6. **Minimal Borders**: Only use borders when necessary for visual separation or selection states

## Migration Guide

When updating existing components to use these standards:

1. Replace custom card styling with appropriate universal classes
2. Ensure content inside cards uses the universal typography classes
3. Test hover states and interactions
4. Verify visual consistency across different screen sizes
5. Update any custom CSS that conflicts with the universal standards

## Maintenance

- All card styling changes should be made in `src/app/globals.css`
- Test changes across all components that use card classes
- Update this documentation when adding new card types
- Ensure new card classes follow the established naming convention: `.card-{purpose}`
