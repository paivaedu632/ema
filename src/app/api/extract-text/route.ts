import { NextRequest, NextResponse } from 'next/server';
import { extractDocumentText, analyzeDocument, extractAngolanBI } from '@/lib/aws-services/textract-service';
import { S3_CONFIG } from '@/lib/aws-config';
import { 
  handleAWSError, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/aws-services/aws-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { s3Key, documentType = 'ID_CARD' } = body;
    
    // Validate required fields
    if (!s3Key) {
      return NextResponse.json(
        createErrorResponse('S3 key is required', 400),
        { status: 400 }
      );
    }
    
    // Validate document type
    const validDocumentTypes = ['ID_CARD', 'PASSPORT', 'DRIVERS_LICENSE'];
    if (!validDocumentTypes.includes(documentType)) {
      return NextResponse.json(
        createErrorResponse(`Invalid document type. Must be one of: ${validDocumentTypes.join(', ')}`, 400),
        { status: 400 }
      );
    }
    
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
    
    const result = {
      documentId: textResult.documentId,
      rawText: textResult.extractedText.rawText,
      confidence: textResult.confidence,
      processingTime: textResult.processingTime,
      extractedData: {
        ...analyzedData,
        biNumber: extractedBI
      }
    };
    
    return NextResponse.json(
      createSuccessResponse(result, 'Text extracted successfully'),
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error in extract-text API:', error);
    
    try {
      handleAWSError(error);
    } catch (handledError) {
      return NextResponse.json(
        createErrorResponse(handledError.message, 500),
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      createErrorResponse('Failed to extract text from document', 500),
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    createErrorResponse('Method not allowed', 405),
    { status: 405 }
  );
}
