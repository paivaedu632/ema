/**
 * AWS Utilities for EmaPay KYC Implementation
 * 
 * Common utilities, error handling, and helper functions for AWS services
 */

import { type AWSError } from '../aws-config';

export interface ProcessingStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
}

export interface KYCDocumentMetadata {
  userId: string;
  documentType: string;
  uploadedAt: string;
  processedAt?: string;
  extractedData?: Record<string, any>;
  validationResults?: Record<string, any>;
}

/**
 * Handle AWS service errors and convert to user-friendly messages
 */
export function handleAWSError(error: any): never {
  console.error('AWS Service Error:', error);
  
  const awsError = error as AWSError;
  
  // Handle specific AWS error codes
  switch (awsError.code) {
    case 'AccessDenied':
      throw new Error('Access denied. Please check your permissions.');
    
    case 'InvalidParameterException':
      throw new Error('Invalid request parameters. Please check your input.');
    
    case 'ThrottlingException':
      throw new Error('Service is temporarily busy. Please try again in a moment.');
    
    case 'InternalServerError':
      throw new Error('AWS service is temporarily unavailable. Please try again.');
    
    case 'NoSuchBucket':
      throw new Error('Storage bucket not found. Please contact support.');
    
    case 'NoSuchKey':
      throw new Error('Document not found. Please upload the document again.');
    
    case 'InvalidImageFormatException':
      throw new Error('Invalid image format. Please use JPEG or PNG images.');
    
    case 'ImageTooLargeException':
      throw new Error('Image is too large. Please use an image smaller than 10MB.');
    
    case 'InvalidS3ObjectException':
      throw new Error('Invalid document. Please upload a clear image.');
    
    case 'UnsupportedDocumentException':
      throw new Error('Document type not supported. Please upload a valid ID document.');
    
    default:
      // Generic error message
      throw new Error(awsError.message || 'An unexpected error occurred. Please try again.');
  }
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Check if an error should not be retried
 */
function isNonRetryableError(error: any): boolean {
  const nonRetryableCodes = [
    'AccessDenied',
    'InvalidParameterException',
    'InvalidImageFormatException',
    'ImageTooLargeException',
    'UnsupportedDocumentException',
    'NoSuchBucket'
  ];
  
  return nonRetryableCodes.includes(error.code);
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): void {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  
  if (file.size > maxSize) {
    throw new Error(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type must be one of: ${allowedTypes.join(', ')}`);
  }
}

/**
 * Generate unique user ID for KYC process
 */
export function generateKYCUserId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `kyc_${timestamp}_${random}`;
}

/**
 * Create processing status object
 */
export function createProcessingStatus(
  status: ProcessingStatus['status'],
  progress: number,
  message: string,
  error?: string
): ProcessingStatus {
  return {
    status,
    progress: Math.max(0, Math.min(100, progress)),
    message,
    error
  };
}

/**
 * Format confidence score as percentage
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence)}%`;
}

/**
 * Check if confidence meets minimum threshold
 */
export function isConfidenceAcceptable(confidence: number, minThreshold: number = 80): boolean {
  return confidence >= minThreshold;
}

/**
 * Extract file extension from content type
 */
export function getFileExtensionFromContentType(contentType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png'
  };
  
  return extensions[contentType] || 'jpg';
}

/**
 * Create document metadata object
 */
export function createDocumentMetadata(
  userId: string,
  documentType: string,
  additionalData?: Record<string, any>
): KYCDocumentMetadata {
  return {
    userId,
    documentType,
    uploadedAt: new Date().toISOString(),
    ...additionalData
  };
}

/**
 * Sanitize filename for S3 storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

/**
 * Generate S3 object key with proper structure
 */
export function generateS3Key(
  folder: string,
  userId: string,
  documentType: string,
  extension: string
): string {
  const timestamp = Date.now();
  const sanitizedUserId = sanitizeFilename(userId);
  const sanitizedDocType = sanitizeFilename(documentType);
  
  return `${folder}${sanitizedUserId}/${sanitizedDocType}-${timestamp}.${extension}`;
}

/**
 * Parse S3 key to extract metadata
 */
export function parseS3Key(key: string): {
  folder: string;
  userId: string;
  documentType: string;
  timestamp: string;
  extension: string;
} | null {
  const regex = /^(.+\/)([^\/]+)\/([^-]+)-(\d+)\.([^.]+)$/;
  const match = key.match(regex);
  
  if (!match) {
    return null;
  }
  
  return {
    folder: match[1],
    userId: match[2],
    documentType: match[3],
    timestamp: match[4],
    extension: match[5]
  };
}

/**
 * Convert File to Buffer for AWS SDK
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Create error response for API routes
 */
export function createErrorResponse(message: string, statusCode: number = 500) {
  return {
    error: message,
    statusCode,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create success response for API routes
 */
export function createSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}
