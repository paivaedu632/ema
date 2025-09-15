import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate request body against a Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errorMessage = result.error.issues
        .map((err: any) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      
      return {
        success: false,
        error: `Validation error: ${errorMessage}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch {
    return {
      success: false,
      error: 'Invalid JSON in request body'
    };
  }
}

/**
 * Validate URL search parameters against a Zod schema
 */
export function validateSearchParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, unknown> = {};

    // Convert search params to object
    searchParams.forEach((value, key) => {
      // Try to parse numbers
      if (/^\d+$/.test(value)) {
        params[key] = parseInt(value, 10);
      } else if (/^\d+\.\d+$/.test(value)) {
        params[key] = parseFloat(value);
      } else {
        params[key] = value;
      }
    });

    const result = schema.safeParse(params);

    if (!result.success) {
      const errorMessage = result.error.issues
        .map((err: any) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      
      return {
        success: false,
        error: `Validation error: ${errorMessage}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch {
    return {
      success: false,
      error: 'Invalid search parameters'
    };
  }
}

/**
 * Validate route parameters against a Zod schema
 */
export function validateRouteParams<T>(
  params: Record<string, string>,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    const result = schema.safeParse(params);

    if (!result.success) {
      const errorMessage = result.error.issues
        .map((err: any) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      
      return {
        success: false,
        error: `Validation error: ${errorMessage}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch {
    return {
      success: false,
      error: 'Invalid route parameters'
    };
  }
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(error: string) {
  return NextResponse.json(
    {
      success: false,
      error,
      code: 'VALIDATION_ERROR'
    },
    { status: 400 }
  );
}

/**
 * Middleware wrapper for request validation
 */
export function withValidation<TBody, TParams = unknown>(
  bodySchema?: z.ZodSchema<TBody>,
  paramsSchema?: z.ZodSchema<TParams>
) {
  return function <T extends unknown[]>(
    handler: (
      request: NextRequest,
      validatedData: { body?: TBody; params?: TParams },
      ...args: T
    ) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const validatedData: { body?: TBody; params?: TParams } = {};

      // Validate body if schema provided and method requires body
      if (bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const bodyValidation = await validateRequestBody(request, bodySchema);
        if (!bodyValidation.success) {
          return createValidationErrorResponse(bodyValidation.error!);
        }
        validatedData.body = bodyValidation.data as TBody;
      }

      // Validate params if schema provided
      if (paramsSchema && args.length > 0) {
        const params = args[0] as { params: Record<string, string> };
        if (params?.params) {
          const paramsValidation = validateRouteParams(params.params, paramsSchema);
          if (!paramsValidation.success) {
            return createValidationErrorResponse(paramsValidation.error!);
          }
          validatedData.params = paramsValidation.data as TParams;
        }
      }

      return handler(request, validatedData, ...args);
    };
  };
}
