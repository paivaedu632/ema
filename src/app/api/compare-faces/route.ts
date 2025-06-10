import { NextRequest, NextResponse } from 'next/server';
import { compareFaces } from '@/lib/aws-services/rekognition-service';
import { S3_CONFIG } from '@/lib/aws-config';
import { 
  handleAWSError, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/aws-services/aws-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceS3Key, targetS3Key, similarityThreshold = 85 } = body;
    
    // Validate required fields
    if (!sourceS3Key) {
      return NextResponse.json(
        createErrorResponse('Source S3 key is required', 400),
        { status: 400 }
      );
    }
    
    if (!targetS3Key) {
      return NextResponse.json(
        createErrorResponse('Target S3 key is required', 400),
        { status: 400 }
      );
    }
    
    // Validate similarity threshold
    if (typeof similarityThreshold !== 'number' || similarityThreshold < 0 || similarityThreshold > 100) {
      return NextResponse.json(
        createErrorResponse('Similarity threshold must be a number between 0 and 100', 400),
        { status: 400 }
      );
    }
    
    // Compare faces using Rekognition
    const comparisonResult = await compareFaces({
      sourceS3Bucket: S3_CONFIG.BUCKET_NAME,
      sourceS3Key,
      targetS3Bucket: S3_CONFIG.BUCKET_NAME,
      targetS3Key,
      similarityThreshold
    });
    
    const result = {
      similarity: comparisonResult.similarity,
      isMatch: comparisonResult.isMatch,
      confidence: comparisonResult.confidence,
      threshold: similarityThreshold,
      matchQuality: getMatchQuality(comparisonResult.similarity)
    };
    
    return NextResponse.json(
      createSuccessResponse(result, 'Face comparison completed successfully'),
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error in compare-faces API:', error);
    
    try {
      handleAWSError(error);
    } catch (handledError) {
      return NextResponse.json(
        createErrorResponse(handledError.message, 500),
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      createErrorResponse('Failed to compare faces', 500),
      { status: 500 }
    );
  }
}

function getMatchQuality(similarity: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (similarity >= 90) return 'HIGH';
  if (similarity >= 75) return 'MEDIUM';
  return 'LOW';
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    createErrorResponse('Method not allowed', 405),
    { status: 405 }
  );
}
