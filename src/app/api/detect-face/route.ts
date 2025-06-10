import { NextRequest, NextResponse } from 'next/server';
import { detectFaces, validateSelfieQuality } from '@/lib/aws-services/rekognition-service';
import { S3_CONFIG } from '@/lib/aws-config';
import { 
  handleAWSError, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/aws-services/aws-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { s3Key, validateQuality = true } = body;
    
    // Validate required fields
    if (!s3Key) {
      return NextResponse.json(
        createErrorResponse('S3 key is required', 400),
        { status: 400 }
      );
    }
    
    const faceDetectionOptions = {
      s3Bucket: S3_CONFIG.BUCKET_NAME,
      s3Key,
      attributes: ['ALL' as const]
    };
    
    // Detect faces in the image
    const faceResult = await detectFaces(faceDetectionOptions);
    
    let qualityValidation = null;
    
    // Validate selfie quality if requested
    if (validateQuality && faceResult.faceDetected) {
      qualityValidation = await validateSelfieQuality(faceDetectionOptions);
    }
    
    const result = {
      faceDetected: faceResult.faceDetected,
      confidence: faceResult.confidence,
      boundingBox: faceResult.boundingBox,
      landmarks: faceResult.landmarks,
      qualityValidation
    };
    
    return NextResponse.json(
      createSuccessResponse(result, 'Face detection completed successfully'),
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error in detect-face API:', error);
    
    try {
      handleAWSError(error);
    } catch (handledError) {
      return NextResponse.json(
        createErrorResponse(handledError.message, 500),
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      createErrorResponse('Failed to detect face in image', 500),
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
