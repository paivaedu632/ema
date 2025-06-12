import { detectFaces, validateSelfieQuality } from '@/lib/aws-services/rekognition-service';
import { S3_CONFIG } from '@/lib/aws-config';
import {
  KYCAPIHandlers,
  createMethodNotAllowedHandler
} from '@/lib/aws-services/api-handler-utils';

interface FaceDetectionBody {
  s3Key: string;
  validateQuality?: boolean;
}

// Face detection operation
async function performFaceDetection(body: FaceDetectionBody) {
  const { s3Key, validateQuality = true } = body;

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

  return {
    faceDetected: faceResult.faceDetected,
    confidence: faceResult.confidence,
    boundingBox: faceResult.boundingBox,
    landmarks: faceResult.landmarks,
    qualityValidation
  };
}

// Use the generic handler
export const POST = KYCAPIHandlers.createFaceDetectionHandler(performFaceDetection);

// Use the generic GET handler
export const GET = createMethodNotAllowedHandler();
