# EmaPay Universal Typography Standards

This document outlines the standardized CSS classes for typography used across all EmaPay components. These classes ensure consistent text styling, hierarchy, and readability throughout the application.

## Overview

All EmaPay components follow consistent typography patterns that have been standardized into reusable CSS classes in `src/app/globals.css`. This approach provides:

- **Consistency**: All text uses the same styling patterns
- **Hierarchy**: Clear visual hierarchy with standardized heading levels
- **Maintainability**: Changes can be made in one location
- **Readability**: Optimized font sizes and colors for accessibility
- **Developer Experience**: Clear, semantic class names

## Typography Classes

### 1. Heading Styles

#### `.heading-main`
Main page titles used for primary flow headings.
```css
.heading-main {
  @apply text-3xl font-bold text-gray-900;
  line-height: 1.2 !important; /* leading-tight */
}
```
**Usage**: "Quanto você quer depositar?", "Quanto você quer enviar?"

#### `.heading-step`
Step titles used for multi-step flow headings.
```css
.heading-step {
  @apply text-2xl font-bold text-gray-900;
}
```
**Usage**: "Como depositar?", "Para quem você quer enviar?"

#### `.heading-section`
Section headings used for dashboard sections and major content areas.
```css
.heading-section {
  @apply text-xl font-semibold text-gray-900;
}
```
**Usage**: "Saldo", "Transações", main dashboard sections

#### `.heading-card`
Card titles and subsection headings.
```css
.heading-card {
  @apply text-lg font-semibold text-gray-900;
}
```
**Usage**: Currency names in cards, subsection titles

#### `.heading-small`
Small headings for form groups and minor sections.
```css
.heading-small {
  @apply font-medium text-gray-900;
}
```
**Usage**: "Atenção:", form group titles, minor section headers

### 2. Label Styles

#### `.label-form`
Form field labels and descriptive text.
```css
.label-form {
  @apply text-sm text-gray-600;
}
```
**Usage**: Field labels, help text, form descriptions, account types

#### `.label-info`
Balance info, help text, and secondary information.
```css
.label-info {
  @apply text-base text-gray-700;
}
```
**Usage**: "Seu saldo:", balance information, important secondary text

### 3. Value Styles

#### `.value-primary`
Important data values, amounts, and key information.
```css
.value-primary {
  @apply text-sm font-medium text-gray-900;
}
```
**Usage**: Exchange rates, fees, transaction details, form values

#### `.value-large`
Prominent amounts and balance displays.
```css
.value-large {
  @apply font-bold text-2xl text-gray-900;
}
```
**Usage**: Account balances, large monetary amounts

#### `.value-secondary`
Regular data values and transaction amounts.
```css
.value-secondary {
  @apply font-semibold text-gray-900;
}
```
**Usage**: Transaction descriptions, recipient names, regular amounts

### 4. Body Text Styles

#### `.text-body`
Regular content, descriptions, and paragraphs.
```css
.text-body {
  @apply text-gray-600;
}
```
**Usage**: General descriptions, help text, paragraph content

#### `.text-body-large`
Larger body content and important descriptions.
```css
.text-body-large {
  @apply text-base text-gray-700;
}
```
**Usage**: Important descriptions, larger body text

## Usage Examples

### Flow Page Header
```tsx
<h1 className="heading-main mb-8">
  Quanto você quer depositar?
</h1>
```

### Multi-Step Flow
```tsx
<h1 className="heading-step mb-4">Como depositar?</h1>
<p className="text-body">
  Entre no seu banco e faça uma transferência expressa para a conta abaixo:
</p>
```

### Dashboard Section
```tsx
<h2 className="heading-section mb-4">Saldo</h2>
<div className="space-y-4">
  <h3 className="heading-card">AOA</h3>
  <p className="label-form mb-1">Conta</p>
  <p className="value-large">100 AOA</p>
</div>
```

### Form with Labels and Values
```tsx
<div className="space-y-3">
  <div className="flex justify-between">
    <span className="label-form">Câmbio</span>
    <span className="value-primary">1.00 USD = 924.0675 AOA</span>
  </div>
  <div className="flex justify-between">
    <span className="label-form">Taxa</span>
    <span className="value-primary">100 AOA</span>
  </div>
</div>
```

### Success Page
```tsx
<h1 className="heading-main mb-4">
  Depósito confirmado!
</h1>
<p className="text-body">
  Seu dinheiro chegará em segundos na sua conta EmaPay.
</p>
```

### Balance Information
```tsx
<p className="label-info">
  Seu saldo: <span className="value-secondary">100 EUR</span>
</p>
```

## Migration Guide

### Before (Old Pattern)
```tsx
<h1 className="text-3xl font-bold text-gray-900 leading-tight mb-8">
  Quanto você quer depositar?
</h1>
<p className="text-sm text-gray-600">
  Saldo disponível: 100 EUR
</p>
<span className="text-sm font-medium text-gray-900">924.0675 AOA</span>
```

### After (New Pattern)
```tsx
<h1 className="heading-main mb-8">
  Quanto você quer depositar?
</h1>
<p className="label-form">
  Saldo disponível: 100 EUR
</p>
<span className="value-primary">924.0675 AOA</span>
```

## Typography Hierarchy

1. **`.heading-main`** - Primary page titles (largest)
2. **`.heading-step`** - Step titles in flows
3. **`.heading-section`** - Dashboard sections
4. **`.heading-card`** - Card titles and subsections
5. **`.heading-small`** - Minor headings and form groups
6. **`.label-info`** - Important secondary text
7. **`.label-form`** - Form labels and descriptions (smallest)

## Color Usage

- **`text-gray-900`** - Primary text (headings, values)
- **`text-gray-700`** - Secondary important text
- **`text-gray-600`** - Labels and descriptions

## Font Weights

- **`font-bold`** - Main headings and large values
- **`font-semibold`** - Section headings and secondary values
- **`font-medium`** - Small headings and primary values
- **Regular weight** - Body text and labels

## Best Practices

1. **Use semantic classes** instead of utility classes for typography
2. **Maintain hierarchy** by using appropriate heading levels
3. **Consistent spacing** with standardized margin/padding patterns
4. **Accessibility** - ensure proper contrast and font sizes
5. **Test readability** on mobile devices
6. **Update documentation** when adding new typography patterns

## Related Standards

- [Layout Container Standards](./layout-container-standards.md)
- [Primary Action Button Standards](./primary-action-button-standards.md)
- [Amount Input Field Standards](./amount-input-standards.md)
