# 🔍 EmaPay Component Creation Checklist

## ⚡ Quick Reference - Before Creating ANY Component

### 1. **Check Existing Components First**
```bash
# Review these files:
- src/components/ui/form-field.tsx (FormField, AuthFormField)
- src/components/ui/detail-row.tsx (DetailRow, SimpleDetailRow)  
- src/components/ui/info-section.tsx (InfoSection, SimpleInfoSection)
- src/components/ui/confirmation-section.tsx (ConfirmationSection, ConfirmationRow, ConfirmationWarning)
- src/components/ui/page-header.tsx (PageHeader)
- src/components/ui/fixed-bottom-action.tsx (FixedBottomAction)
- src/components/ui/success-screen.tsx (SuccessScreen)
- src/components/ui/amount-input.tsx (AmountInput)
- src/components/ui/back-button.tsx (BackButton)
```

### 2. **Decision Tree**
```
Need new UI element?
├── Exact component exists? → ✅ USE IT
├── Similar exists?
│   ├── Can add props? → ✅ EXTEND IT  
│   └── Too different? → ❓ EVALUATE
└── Completely new?
    ├── Used 3+ times? → ✅ CREATE REUSABLE
    ├── Used 1-2 times? → ⚠️ INLINE FIRST
    └── Uncertain? → ⚠️ START INLINE
```

### 3. **Quick Evaluation Questions**
- [ ] Does `FormField` or `AuthFormField` handle this input need?
- [ ] Does `DetailRow` handle this label/value display?
- [ ] Does `InfoSection` handle this icon + text pattern?
- [ ] Does `ConfirmationSection` handle this confirmation layout?
- [ ] Will this be used in 3+ places?
- [ ] Does this follow EmaPay design system (check globals.css)?

### 4. **If Creating New Component**
- [ ] Add to `ShadCN-context.md`
- [ ] Use TypeScript interfaces
- [ ] Follow naming convention (ComponentName)
- [ ] Test with existing patterns
- [ ] Document props and usage

### 5. **EmaPay Design System Classes**
```css
/* Use these established classes: */
.page-container-white
.content-container  
.heading-section, .heading-card, .heading-small
.value-large, .value-primary, .value-secondary
.label-form
.primary-action-button, .small-action-button
.card-balance, .card-transaction, .card-selection
.amount-input
```

## 🚨 **STOP AND CHECK** Before Coding
1. **Search existing components** for similar patterns
2. **Check ShadCN-context.md** for component inventory
3. **Review globals.css** for established styling
4. **Ask: "Can I extend existing instead of creating new?"**

---
**Goal: Maintain clean, consistent, reusable component library**
