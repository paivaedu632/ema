import { performLivenessCheck } from '@/lib/aws-services/rekognition-service';
import { S3_CONFIG } from '@/lib/aws-config';
import {
  KYCAPIHandlers,
  createMethodNotAllowedHandler
} from '@/lib/aws-services/api-handler-utils';

interface LivenessCheckBody {
  s3Key: string;
}

interface LivenessResult {
  isLive: boolean;
  confidence: number;
  qualityScore: number;
  spoofingDetected: boolean;
}

// Liveness check operation
async function performLivenessCheckOperation(body: LivenessCheckBody) {
  const { s3Key } = body;

  // Perform liveness check using Rekognition
  const livenessResult = await performLivenessCheck({
    s3Bucket: S3_CONFIG.BUCKET_NAME,
    s3Key,
    attributes: ['ALL']
  });

  return {
    isLive: livenessResult.isLive,
    confidence: livenessResult.confidence,
    qualityScore: livenessResult.qualityScore,
    spoofingDetected: livenessResult.spoofingDetected,
    status: livenessResult.isLive ? 'PASSED' : 'FAILED',
    recommendation: getLivenessRecommendation(livenessResult)
  };
}

function getLivenessRecommendation(result: LivenessResult): string {
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

// Use the generic handler
export const POST = KYCAPIHandlers.createLivenessCheckHandler(performLivenessCheckOperation);

// Use the generic GET handler
export const GET = createMethodNotAllowedHandler();
