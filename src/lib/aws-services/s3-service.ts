/**
 * S3 Service for EmaPay KYC Document Management
 * 
 * Handles document upload, download, and management for KYC process
 */

import { 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand 
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_CONFIG, type DocumentUploadResult } from '../aws-config';

export interface UploadOptions {
  userId: string;
  documentType: 'id-front' | 'id-back' | 'selfie' | 'id-upload';
  file: File | Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface PresignedUrlOptions {
  key: string;
  expiresIn?: number; // seconds, default 3600 (1 hour)
}

/**
 * Upload a document to S3
 */
export async function uploadDocument(options: UploadOptions): Promise<DocumentUploadResult> {
  const { userId, documentType, file, contentType, metadata = {} } = options;
  
  // Validate file size
  const fileSize = file instanceof File ? file.size : file.length;
  if (fileSize > S3_CONFIG.MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${S3_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
  
  // Validate content type
  if (!S3_CONFIG.ALLOWED_TYPES.includes(contentType)) {
    throw new Error(`File type ${contentType} is not allowed. Allowed types: ${S3_CONFIG.ALLOWED_TYPES.join(', ')}`);
  }
  
  // Generate unique key
  const timestamp = Date.now();
  const folder = getDocumentFolder(documentType);
  const extension = getFileExtension(contentType);
  const key = `${folder}${userId}/${documentType}-${timestamp}.${extension}`;
  
  // Convert File to Buffer if needed
  const body = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
  
  try {
    const command = new PutObjectCommand({
      Bucket: S3_CONFIG.BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: {
        userId,
        documentType,
        uploadedAt: new Date().toISOString(),
        ...metadata
      },
      ServerSideEncryption: 'AES256'
    });
    
    const result = await s3Client.send(command);
    
    return {
      key,
      bucket: S3_CONFIG.BUCKET_NAME,
      location: `https://${S3_CONFIG.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      etag: result.ETag || ''
    };
  } catch (error) {
    throw new Error('Failed to upload document. Please try again.');
  }
}

/**
 * Generate a presigned URL for secure document access
 */
export async function getPresignedUrl(options: PresignedUrlOptions): Promise<string> {
  const { key, expiresIn = 3600 } = options;
  
  try {
    const command = new GetObjectCommand({
      Bucket: S3_CONFIG.BUCKET_NAME,
      Key: key
    });
    
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    throw new Error('Failed to generate secure document URL');
  }
}

/**
 * Check if a document exists in S3
 */
export async function documentExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_CONFIG.BUCKET_NAME,
      Key: key
    });
    
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * Delete a document from S3
 */
export async function deleteDocument(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_CONFIG.BUCKET_NAME,
      Key: key
    });
    
    await s3Client.send(command);
  } catch (error) {
    throw new Error('Failed to delete document');
  }
}

/**
 * Get document metadata
 */
export async function getDocumentMetadata(key: string): Promise<Record<string, string>> {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_CONFIG.BUCKET_NAME,
      Key: key
    });
    
    const result = await s3Client.send(command);
    return result.Metadata || {};
  } catch (error) {
    throw new Error('Failed to get document metadata');
  }
}

// Helper functions
function getDocumentFolder(documentType: string): string {
  switch (documentType) {
    case 'id-front':
    case 'id-back':
    case 'id-upload':
      return S3_CONFIG.FOLDERS.ID_DOCUMENTS;
    case 'selfie':
      return S3_CONFIG.FOLDERS.SELFIES;
    default:
      return S3_CONFIG.FOLDERS.ID_DOCUMENTS;
  }
}

function getFileExtension(contentType: string): string {
  switch (contentType) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    default:
      return 'jpg';
  }
}

/**
 * Generate a unique user-specific document key
 */
export function generateDocumentKey(userId: string, documentType: string): string {
  const timestamp = Date.now();
  const folder = getDocumentFolder(documentType);
  return `${folder}${userId}/${documentType}-${timestamp}`;
}
