import { compareFaces } from '@/lib/aws-services/rekognition-service';
import { S3_CONFIG } from '@/lib/aws-config';
import {
  KYCAPIHandlers,
  createMethodNotAllowedHandler
} from '@/lib/aws-services/api-handler-utils';

interface FaceComparisonBody {
  sourceS3Key: string;
  targetS3Key: string;
  similarityThreshold?: number;
}

// Face comparison operation
async function performFaceComparison(body: FaceComparisonBody) {
  const { sourceS3Key, targetS3Key, similarityThreshold = 85 } = body;

  // Compare faces using Rekognition
  const comparisonResult = await compareFaces({
    sourceS3Bucket: S3_CONFIG.BUCKET_NAME,
    sourceS3Key,
    targetS3Bucket: S3_CONFIG.BUCKET_NAME,
    targetS3Key,
    similarityThreshold
  });

  return {
    similarity: comparisonResult.similarity,
    isMatch: comparisonResult.isMatch,
    confidence: comparisonResult.confidence,
    threshold: similarityThreshold,
    matchQuality: getMatchQuality(comparisonResult.similarity)
  };
}

function getMatchQuality(similarity: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (similarity >= 90) return 'HIGH';
  if (similarity >= 75) return 'MEDIUM';
  return 'LOW';
}

// Use the generic handler
export const POST = KYCAPIHandlers.createFaceComparisonHandler(performFaceComparison);

// Use the generic GET handler
export const GET = createMethodNotAllowedHandler();
