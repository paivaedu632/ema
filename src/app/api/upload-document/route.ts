import { NextRequest, NextResponse } from 'next/server';
import { uploadDocument } from '@/lib/aws-services/s3-service';
import { 
  handleAWSError, 
  validateFile, 
  createErrorResponse, 
  createSuccessResponse,
  generateKYCUserId 
} from '@/lib/aws-services/aws-utils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const documentType = formData.get('documentType') as string;
    
    // Validate required fields
    if (!file) {
      return NextResponse.json(
        createErrorResponse('File is required', 400),
        { status: 400 }
      );
    }
    
    if (!userId) {
      return NextResponse.json(
        createErrorResponse('User ID is required', 400),
        { status: 400 }
      );
    }
    
    if (!documentType) {
      return NextResponse.json(
        createErrorResponse('Document type is required', 400),
        { status: 400 }
      );
    }
    
    // Validate document type
    const validDocumentTypes = ['id-front', 'id-back', 'selfie', 'id-upload'];
    if (!validDocumentTypes.includes(documentType)) {
      return NextResponse.json(
        createErrorResponse(`Invalid document type. Must be one of: ${validDocumentTypes.join(', ')}`, 400),
        { status: 400 }
      );
    }
    
    // Validate file
    validateFile(file);
    
    // Upload to S3
    const uploadResult = await uploadDocument({
      userId,
      documentType: documentType as 'id-front' | 'id-back' | 'selfie' | 'id-upload',
      file,
      contentType: file.type,
      metadata: {
        originalName: file.name,
        uploadedBy: 'kyc-process'
      }
    });
    
    return NextResponse.json(
      createSuccessResponse(uploadResult, 'Document uploaded successfully'),
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error in upload-document API:', error);
    
    try {
      handleAWSError(error);
    } catch (handledError) {
      return NextResponse.json(
        createErrorResponse(handledError.message, 500),
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      createErrorResponse('Failed to upload document', 500),
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
