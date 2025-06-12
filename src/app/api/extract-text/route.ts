import { extractDocumentText, analyzeDocument, extractAngolanBI } from '@/lib/aws-services/textract-service';
import { S3_CONFIG } from '@/lib/aws-config';
import {
  KYCAPIHandlers,
  createMethodNotAllowedHandler
} from '@/lib/aws-services/api-handler-utils';

interface TextExtractionBody {
  s3Key: string;
  documentType?: string;
}

// Text extraction operation
async function performTextExtraction(body: TextExtractionBody) {
  const { s3Key, documentType = 'ID_CARD' } = body;

  // Extract text using Textract
  const textResult = await extractDocumentText({
    s3Bucket: S3_CONFIG.BUCKET_NAME,
    s3Key,
    documentType
  });

  // Analyze document structure for key-value pairs
  const analyzedData = await analyzeDocument({
    s3Bucket: S3_CONFIG.BUCKET_NAME,
    s3Key,
    documentType
  });

  // Extract Angola BI number if present
  const extractedBI = extractAngolanBI(textResult.extractedText.rawText);

  return {
    documentId: textResult.documentId,
    rawText: textResult.extractedText.rawText,
    confidence: textResult.confidence,
    processingTime: textResult.processingTime,
    extractedData: {
      ...analyzedData,
      biNumber: extractedBI
    }
  };
}

// Use the generic handler
export const POST = KYCAPIHandlers.createTextExtractionHandler(performTextExtraction);

// Use the generic GET handler
export const GET = createMethodNotAllowedHandler();
