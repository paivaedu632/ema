import { NextRequest, NextResponse } from 'next/server';
import { performLivenessCheck } from '@/lib/aws-services/rekognition-service';
import { S3_CONFIG } from '@/lib/aws-config';
import { 
  handleAWSError, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/aws-services/aws-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { s3Key } = body;
    
    // Validate required fields
    if (!s3Key) {
      return NextResponse.json(
        createErrorResponse('S3 key is required', 400),
        { status: 400 }
      );
    }
    
    // Perform liveness check using Rekognition
    const livenessResult = await performLivenessCheck({
      s3Bucket: S3_CONFIG.BUCKET_NAME,
      s3Key,
      attributes: ['ALL']
    });
    
    const result = {
      isLive: livenessResult.isLive,
      confidence: livenessResult.confidence,
      qualityScore: livenessResult.qualityScore,
      spoofingDetected: livenessResult.spoofingDetected,
      status: livenessResult.isLive ? 'PASSED' : 'FAILED',
      recommendation: getLivenessRecommendation(livenessResult)
    };
    
    return NextResponse.json(
      createSuccessResponse(result, 'Liveness check completed successfully'),
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error in liveness-check API:', error);
    
    try {
      handleAWSError(error);
    } catch (handledError) {
      return NextResponse.json(
        createErrorResponse(handledError.message, 500),
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      createErrorResponse('Failed to perform liveness check', 500),
      { status: 500 }
    );
  }
}

function getLivenessRecommendation(result: any): string {
  if (result.isLive) {
    return 'Liveness verification passed successfully';
  }
  
  if (result.spoofingDetected) {
    return 'Potential spoofing detected. Please take a new selfie in good lighting';
  }
  
  if (result.confidence < 80) {
    return 'Low confidence score. Please ensure good lighting and clear face visibility';
  }
  
  return 'Liveness verification failed. Please try again with better lighting and positioning';
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    createErrorResponse('Method not allowed', 405),
    { status: 405 }
  );
}
