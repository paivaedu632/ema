/**
 * AWS SDK Configuration for EmaPay KYC Implementation
 * 
 * This file configures AWS services for:
 * - Amazon Textract: ID document text extraction
 * - Amazon Rekognition: Face detection and liveness verification
 * - Amazon S3: Document storage and retrieval
 */

import { S3Client } from '@aws-sdk/client-s3';
import { RekognitionClient } from '@aws-sdk/client-rekognition';
import { TextractClient } from '@aws-sdk/client-textract';

// AWS Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

// Validate required environment variables
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  throw new Error(
    'Missing required AWS credentials. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.'
  );
}

// AWS Client Configuration
const awsConfig = {
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
};

// Initialize AWS Clients
export const s3Client = new S3Client(awsConfig);
export const rekognitionClient = new RekognitionClient(awsConfig);
export const textractClient = new TextractClient(awsConfig);

// S3 Configuration for EmaPay KYC documents
export const S3_CONFIG = {
  BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || 'emapay-kyc-documents',
  FOLDERS: {
    ID_DOCUMENTS: 'id-documents/',
    SELFIES: 'selfies/',
    PROCESSED: 'processed/',
  },
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
};

// Textract Configuration
export const TEXTRACT_CONFIG = {
  FEATURE_TYPES: ['TABLES', 'FORMS'] as const,
  SUPPORTED_DOCUMENTS: ['ID_CARD', 'PASSPORT', 'DRIVERS_LICENSE'] as const,
};

// Rekognition Configuration
export const REKOGNITION_CONFIG = {
  FACE_DETECTION: {
    MinConfidence: 80,
    MaxFaces: 1,
  },
  FACE_COMPARISON: {
    SimilarityThreshold: 85,
  },
  LIVENESS_DETECTION: {
    MinConfidence: 90,
  },
};

// Export AWS region for use in other parts of the application
export { AWS_REGION };

// Type definitions for better TypeScript support
export interface AWSError {
  name: string;
  message: string;
  code?: string;
  statusCode?: number;
}

export interface DocumentUploadResult {
  key: string;
  bucket: string;
  location: string;
  etag: string;
}

export interface TextractResult {
  documentId: string;
  extractedText: Record<string, string>;
  confidence: number;
  processingTime: number;
}

export interface RekognitionResult {
  faceDetected: boolean;
  confidence: number;
  boundingBox?: {
    width: number;
    height: number;
    left: number;
    top: number;
  };
  landmarks?: Array<{
    type: string;
    x: number;
    y: number;
  }>;
}

export interface FaceComparisonResult {
  similarity: number;
  isMatch: boolean;
  confidence: number;
}
