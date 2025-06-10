/**
 * Textract Service for EmaPay KYC Document Text Extraction
 * 
 * Handles OCR processing of ID documents using Amazon Textract
 */

import {
  DetectDocumentTextCommand,
  AnalyzeDocumentCommand
} from '@aws-sdk/client-textract';
import { textractClient, TEXTRACT_CONFIG, type TextractResult } from '../aws-config';

export interface TextractOptions {
  s3Bucket: string;
  s3Key: string;
  documentType?: 'ID_CARD' | 'PASSPORT' | 'DRIVERS_LICENSE';
}

export interface ExtractedIDData {
  documentNumber?: string;
  fullName?: string;
  dateOfBirth?: string;
  nationality?: string;
  expiryDate?: string;
  issueDate?: string;
  placeOfBirth?: string;
  gender?: string;
  confidence: number;
  rawText: string;
}

/**
 * Extract text from ID document using Textract
 */
export async function extractDocumentText(options: TextractOptions): Promise<TextractResult> {
  const { s3Bucket, s3Key, documentType = 'ID_CARD' } = options;
  const startTime = Date.now();
  
  try {
    const command = new DetectDocumentTextCommand({
      Document: {
        S3Object: {
          Bucket: s3Bucket,
          Name: s3Key
        }
      }
    });
    
    const result = await textractClient.send(command);
    const processingTime = Date.now() - startTime;
    
    // Extract text blocks
    const textBlocks = result.Blocks?.filter(block => block.BlockType === 'LINE') || [];
    const extractedText = textBlocks
      .map(block => block.Text)
      .filter(text => text)
      .join('\n');
    
    // Calculate average confidence
    const confidences = textBlocks
      .map(block => block.Confidence || 0)
      .filter(conf => conf > 0);
    const averageConfidence = confidences.length > 0 
      ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length 
      : 0;
    
    return {
      documentId: `${s3Key}-${Date.now()}`,
      extractedText: { rawText: extractedText },
      confidence: averageConfidence,
      processingTime
    };
  } catch {
    throw new Error('Failed to extract text from document. Please ensure the image is clear and try again.');
  }
}

/**
 * Analyze document structure and extract key-value pairs
 */
export async function analyzeDocument(options: TextractOptions): Promise<ExtractedIDData> {
  const { s3Bucket, s3Key } = options;
  
  try {
    const command = new AnalyzeDocumentCommand({
      Document: {
        S3Object: {
          Bucket: s3Bucket,
          Name: s3Key
        }
      },
      FeatureTypes: TEXTRACT_CONFIG.FEATURE_TYPES
    });
    
    const result = await textractClient.send(command);
    
    // Extract and parse the document data
    const extractedData = parseIDDocument(result.Blocks || []);
    
    return extractedData;
  } catch {
    throw new Error('Failed to analyze document structure. Please try again.');
  }
}

/**
 * Extract Angola BI number from document text
 */
export function extractAngolanBI(text: string): string | null {
  // Angola BI format: 9 digits + 2 letters + 3 digits (e.g., 123456789LA041)
  const biRegex = /\b\d{9}[A-Z]{2}\d{3}\b/g;
  const matches = text.match(biRegex);
  
  if (matches && matches.length > 0) {
    return matches[0];
  }
  
  // Alternative patterns for partial matches
  const partialRegex = /\b\d{9}[A-Z]{2}\d{1,3}\b/g;
  const partialMatches = text.match(partialRegex);
  
  if (partialMatches && partialMatches.length > 0) {
    return partialMatches[0];
  }
  
  return null;
}

/**
 * Extract name from document text
 */
export function extractName(text: string): string | null {
  // Look for common name patterns in Portuguese/Angola documents
  const namePatterns = [
    /(?:NOME|NAME|APELIDO)[:\s]+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+)/i,
    /(?:PRIMEIRO NOME|FIRST NAME)[:\s]+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+)/i,
    /(?:ÚLTIMO NOME|LAST NAME)[:\s]+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Extract date of birth from document text
 */
export function extractDateOfBirth(text: string): string | null {
  // Common date patterns
  const datePatterns = [
    /(?:DATA DE NASCIMENTO|DATE OF BIRTH|NASCIMENTO)[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    /(?:BORN|NASC)[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\b/g
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Parse ID document blocks and extract structured data
 */
function parseIDDocument(blocks: any[]): ExtractedIDData {
  const textBlocks = blocks.filter(block => block.BlockType === 'LINE');
  const fullText = textBlocks.map(block => block.Text).join('\n');
  
  // Calculate average confidence
  const confidences = textBlocks
    .map(block => block.Confidence || 0)
    .filter(conf => conf > 0);
  const averageConfidence = confidences.length > 0 
    ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length 
    : 0;
  
  return {
    documentNumber: extractAngolanBI(fullText),
    fullName: extractName(fullText),
    dateOfBirth: extractDateOfBirth(fullText),
    confidence: averageConfidence,
    rawText: fullText
  };
}

/**
 * Validate extracted BI number format
 */
export function validateBIFormat(biNumber: string): boolean {
  const biRegex = /^\d{9}[A-Z]{2}\d{3}$/;
  return biRegex.test(biNumber);
}

/**
 * Clean and format extracted text
 */
export function cleanExtractedText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-\.\/]/g, '')
    .trim();
}
