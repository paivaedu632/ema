/**
 * AWS API Handler Utilities for EmaPay KYC
 * 
 * Reusable utilities for handling AWS API routes with consistent error handling,
 * validation, and response formatting across all KYC API endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  handleAWSError, 
  createErrorResponse, 
  createSuccessResponse 
} from './aws-utils'

export interface APIHandlerOptions<T = Record<string, unknown>> {
  requiredFields: string[]
  validationRules?: Record<string, (value: unknown) => boolean | string>
  operation: (body: T) => Promise<unknown>
  successMessage?: string
  operationName: string
}

export interface FormDataAPIHandlerOptions<T = Record<string, unknown>> {
  requiredFields: string[]
  validationRules?: Record<string, (value: unknown) => boolean | string>
  operation: (formData: FormData, parsedData: T) => Promise<unknown>
  successMessage?: string
  operationName: string
}

/**
 * Generic AWS API handler that eliminates duplicate error handling patterns
 * Used across detect-face, compare-faces, extract-text, and liveness-check APIs
 */
export async function createAWSAPIHandler<T = Record<string, unknown>>(
  options: APIHandlerOptions<T>
) {
  return async function handler(request: NextRequest) {
    try {
      const body = await request.json()
      const {
        requiredFields,
        validationRules = {},
        operation,
        successMessage = 'Operation completed successfully'
      } = options

      // Validate required fields
      for (const field of requiredFields) {
        if (!body[field]) {
          return NextResponse.json(
            createErrorResponse(`${field} is required`, 400),
            { status: 400 }
          )
        }
      }

      // Apply custom validation rules
      for (const [field, validator] of Object.entries(validationRules)) {
        if (body[field] !== undefined) {
          const validationResult = validator(body[field])
          if (validationResult !== true) {
            const errorMessage = typeof validationResult === 'string' 
              ? validationResult 
              : `Invalid ${field}`
            return NextResponse.json(
              createErrorResponse(errorMessage, 400),
              { status: 400 }
            )
          }
        }
      }

      // Execute the operation
      const result = await operation(body)

      return NextResponse.json(
        createSuccessResponse(result, successMessage),
        { status: 200 }
      )

    } catch (error) {
      try {
        handleAWSError(error)
      } catch (handledError) {
        return NextResponse.json(
          createErrorResponse(handledError.message, 500),
          { status: 500 }
        )
      }

      return NextResponse.json(
        createErrorResponse(`Failed to ${operationName.toLowerCase()}`, 500),
        { status: 500 }
      )
    }
  }
}

/**
 * Generic FormData API handler for file uploads and form data processing
 */
export async function createFormDataAPIHandler<T = Record<string, unknown>>(
  options: FormDataAPIHandlerOptions<T>
) {
  return async function handler(request: NextRequest) {
    try {
      const formData = await request.formData()
      const {
        requiredFields,
        validationRules = {},
        operation,
        successMessage = 'Operation completed successfully'
      } = options

      // Parse form data into an object for validation
      const parsedData: Record<string, unknown> = {}
      for (const field of requiredFields) {
        parsedData[field] = formData.get(field)
      }

      // Add optional fields that might have validation rules
      for (const field of Object.keys(validationRules)) {
        if (!parsedData[field]) {
          parsedData[field] = formData.get(field)
        }
      }

      // Validate required fields
      for (const field of requiredFields) {
        if (!parsedData[field]) {
          return NextResponse.json(
            createErrorResponse(`${field} is required`, 400),
            { status: 400 }
          )
        }
      }

      // Apply custom validation rules
      for (const [field, validator] of Object.entries(validationRules)) {
        if (parsedData[field] !== undefined && parsedData[field] !== null) {
          const validationResult = validator(parsedData[field])
          if (validationResult !== true) {
            const errorMessage = typeof validationResult === 'string'
              ? validationResult
              : `Invalid ${field}`
            return NextResponse.json(
              createErrorResponse(errorMessage, 400),
              { status: 400 }
            )
          }
        }
      }

      // Execute the operation
      const result = await operation(formData, parsedData)

      return NextResponse.json(
        createSuccessResponse(result, successMessage),
        { status: 200 }
      )

    } catch (error) {
      try {
        handleAWSError(error)
      } catch (handledError) {
        return NextResponse.json(
          createErrorResponse(handledError.message, 500),
          { status: 500 }
        )
      }

      return NextResponse.json(
        createErrorResponse(`Failed to ${operationName.toLowerCase()}`, 500),
        { status: 500 }
      )
    }
  }
}

/**
 * Standard GET handler that returns method not allowed
 */
export function createMethodNotAllowedHandler() {
  return async function GET() {
    return NextResponse.json(
      createErrorResponse('Method not allowed', 405),
      { status: 405 }
    )
  }
}

/**
 * Validation rules for common KYC API parameters
 */
export const KYCValidationRules = {
  s3Key: (value: string) => {
    if (typeof value !== 'string' || value.trim() === '') {
      return 'S3 key must be a non-empty string'
    }
    return true
  },

  documentType: (value: string) => {
    const validTypes = ['ID_CARD', 'PASSPORT', 'DRIVERS_LICENSE']
    if (!validTypes.includes(value)) {
      return `Invalid document type. Must be one of: ${validTypes.join(', ')}`
    }
    return true
  },

  similarityThreshold: (value: number) => {
    if (typeof value !== 'number' || value < 0 || value > 100) {
      return 'Similarity threshold must be a number between 0 and 100'
    }
    return true
  },

  userId: (value: string) => {
    if (typeof value !== 'string' || value.trim() === '') {
      return 'User ID must be a non-empty string'
    }
    return true
  },

  fileSize: (value: number) => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (typeof value !== 'number' || value > maxSize) {
      return `File size must not exceed ${maxSize / (1024 * 1024)}MB`
    }
    return true
  }
}

/**
 * Pre-configured handlers for common KYC operations
 */
export const KYCAPIHandlers = {
  /**
   * Face detection API handler
   */
  createFaceDetectionHandler: (detectFacesOperation: (body: Record<string, unknown>) => Promise<unknown>) =>
    createAWSAPIHandler({
      requiredFields: ['s3Key'],
      validationRules: {
        s3Key: KYCValidationRules.s3Key
      },
      operation: detectFacesOperation,
      successMessage: 'Face detection completed successfully',
      operationName: 'detect-face'
    }),

  /**
   * Face comparison API handler
   */
  createFaceComparisonHandler: (compareFacesOperation: (body: Record<string, unknown>) => Promise<unknown>) =>
    createAWSAPIHandler({
      requiredFields: ['sourceS3Key', 'targetS3Key'],
      validationRules: {
        sourceS3Key: KYCValidationRules.s3Key,
        targetS3Key: KYCValidationRules.s3Key,
        similarityThreshold: KYCValidationRules.similarityThreshold
      },
      operation: compareFacesOperation,
      successMessage: 'Face comparison completed successfully',
      operationName: 'compare-faces'
    }),

  /**
   * Text extraction API handler
   */
  createTextExtractionHandler: (extractTextOperation: (body: Record<string, unknown>) => Promise<unknown>) =>
    createAWSAPIHandler({
      requiredFields: ['s3Key'],
      validationRules: {
        s3Key: KYCValidationRules.s3Key,
        documentType: KYCValidationRules.documentType
      },
      operation: extractTextOperation,
      successMessage: 'Text extraction completed successfully',
      operationName: 'extract-text'
    }),

  /**
   * Liveness check API handler
   */
  createLivenessCheckHandler: (livenessCheckOperation: (body: Record<string, unknown>) => Promise<unknown>) =>
    createAWSAPIHandler({
      requiredFields: ['s3Key'],
      validationRules: {
        s3Key: KYCValidationRules.s3Key
      },
      operation: livenessCheckOperation,
      successMessage: 'Liveness check completed successfully',
      operationName: 'liveness-check'
    }),

  /**
   * Document upload API handler (FormData)
   */
  createDocumentUploadHandler: (uploadOperation: (formData: FormData, parsedData: Record<string, unknown>) => Promise<unknown>) =>
    createFormDataAPIHandler({
      requiredFields: ['file', 'userId', 'documentType'],
      validationRules: {
        userId: KYCValidationRules.userId,
        documentType: (value: unknown) => {
          const validTypes = ['id-front', 'id-back', 'selfie', 'id-upload']
          if (typeof value !== 'string' || !validTypes.includes(value)) {
            return `Invalid document type. Must be one of: ${validTypes.join(', ')}`
          }
          return true
        }
      },
      operation: uploadOperation,
      successMessage: 'Document uploaded successfully',
      operationName: 'upload-document'
    })
}
