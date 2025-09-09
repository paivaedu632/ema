import { z } from 'zod';

// Common validation patterns
export const currencySchema = z.enum(['EUR', 'AOA']);
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const phoneSchema = z.string().min(10).max(15);
export const pinSchema = z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits');
export const amountSchema = z.number().positive().max(1000000);

// User search schema
export const userSearchSchema = z.object({
  query: z.string().min(1).max(100),
  type: z.enum(['email', 'phone', 'name']).optional()
});

// Transfer schemas
export const transferSendSchema = z.object({
  recipientId: z.union([uuidSchema, emailSchema]), // Allow UUID or email
  amount: amountSchema,
  currency: currencySchema,
  pin: pinSchema,
  description: z.string().max(200).optional()
});

export const transferHistorySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  currency: currencySchema.optional()
});

// Order schemas
export const limitOrderSchema = z.object({
  side: z.enum(['buy', 'sell']),
  amount: amountSchema,
  price: z.number().positive(),
  baseCurrency: currencySchema,
  quoteCurrency: currencySchema
});

export const marketOrderSchema = z.object({
  side: z.enum(['buy', 'sell']),
  amount: amountSchema,
  baseCurrency: currencySchema,
  quoteCurrency: currencySchema,
  slippageLimit: z.number().min(0).max(0.1).default(0.05) // 5% default slippage
});

export const orderHistorySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'filled', 'cancelled', 'partial']).optional()
});

// Security schemas
export const pinSetSchema = z.object({
  pin: pinSchema,
  confirmPin: pinSchema
}).refine(data => data.pin === data.confirmPin, {
  message: "PINs don't match",
  path: ["confirmPin"]
});

export const pinVerifySchema = z.object({
  pin: pinSchema
});

// Market data schemas
export const marketDepthSchema = z.object({
  levels: z.number().int().min(1).max(50).default(10)
});

// Wallet schemas
export const walletCurrencySchema = z.object({
  currency: currencySchema
});

// Pagination helper
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

// Response schemas
export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional()
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional()
});

export type UserSearchInput = z.infer<typeof userSearchSchema>;
export type TransferSendInput = z.infer<typeof transferSendSchema>;
export type TransferHistoryInput = z.infer<typeof transferHistorySchema>;
export type LimitOrderInput = z.infer<typeof limitOrderSchema>;
export type MarketOrderInput = z.infer<typeof marketOrderSchema>;
export type OrderHistoryInput = z.infer<typeof orderHistorySchema>;
export type PinSetInput = z.infer<typeof pinSetSchema>;
export type PinVerifyInput = z.infer<typeof pinVerifySchema>;
export type MarketDepthInput = z.infer<typeof marketDepthSchema>;
export type WalletCurrencyInput = z.infer<typeof walletCurrencySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
