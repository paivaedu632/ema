/**
 * Rekognition Service for EmaPay KYC Face Detection and Verification
 * 
 * Handles face detection, comparison, and liveness verification using Amazon Rekognition
 */

import { 
  DetectFacesCommand,
  CompareFacesCommand,
  DetectModerationLabelsCommand
} from '@aws-sdk/client-rekognition';
import { 
  rekognitionClient, 
  REKOGNITION_CONFIG, 
  type RekognitionResult, 
  type FaceComparisonResult 
} from '../aws-config';

export interface FaceDetectionOptions {
  s3Bucket: string;
  s3Key: string;
  attributes?: ('ALL' | 'DEFAULT')[];
}

export interface FaceComparisonOptions {
  sourceS3Bucket: string;
  sourceS3Key: string;
  targetS3Bucket: string;
  targetS3Key: string;
  similarityThreshold?: number;
}

export interface LivenessCheckResult {
  isLive: boolean;
  confidence: number;
  qualityScore: number;
  spoofingDetected: boolean;
}

export interface FaceQualityMetrics {
  brightness: number;
  sharpness: number;
  pose: {
    roll: number;
    yaw: number;
    pitch: number;
  };
  quality: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Detect faces in an image
 */
export async function detectFaces(options: FaceDetectionOptions): Promise<RekognitionResult> {
  const { s3Bucket, s3Key, attributes = ['ALL'] } = options;
  
  try {
    const command = new DetectFacesCommand({
      Image: {
        S3Object: {
          Bucket: s3Bucket,
          Name: s3Key
        }
      },
      Attributes: attributes
    });
    
    const result = await rekognitionClient.send(command);
    
    if (!result.FaceDetails || result.FaceDetails.length === 0) {
      return {
        faceDetected: false,
        confidence: 0
      };
    }
    
    const primaryFace = result.FaceDetails[0];
    const confidence = primaryFace.Confidence || 0;
    
    // Extract bounding box
    const boundingBox = primaryFace.BoundingBox ? {
      width: primaryFace.BoundingBox.Width || 0,
      height: primaryFace.BoundingBox.Height || 0,
      left: primaryFace.BoundingBox.Left || 0,
      top: primaryFace.BoundingBox.Top || 0
    } : undefined;
    
    // Extract landmarks
    const landmarks = primaryFace.Landmarks?.map(landmark => ({
      type: landmark.Type || '',
      x: landmark.X || 0,
      y: landmark.Y || 0
    })) || [];
    
    return {
      faceDetected: true,
      confidence,
      boundingBox,
      landmarks
    };
  } catch (error) {
    console.error('Error detecting faces with Rekognition:', error);
    throw new Error('Failed to detect faces in image. Please ensure the image is clear and contains a visible face.');
  }
}

/**
 * Compare two faces for similarity
 */
export async function compareFaces(options: FaceComparisonOptions): Promise<FaceComparisonResult> {
  const { 
    sourceS3Bucket, 
    sourceS3Key, 
    targetS3Bucket, 
    targetS3Key, 
    similarityThreshold = REKOGNITION_CONFIG.FACE_COMPARISON.SimilarityThreshold 
  } = options;
  
  try {
    const command = new CompareFacesCommand({
      SourceImage: {
        S3Object: {
          Bucket: sourceS3Bucket,
          Name: sourceS3Key
        }
      },
      TargetImage: {
        S3Object: {
          Bucket: targetS3Bucket,
          Name: targetS3Key
        }
      },
      SimilarityThreshold: similarityThreshold
    });
    
    const result = await rekognitionClient.send(command);
    
    if (!result.FaceMatches || result.FaceMatches.length === 0) {
      return {
        similarity: 0,
        isMatch: false,
        confidence: 0
      };
    }
    
    const bestMatch = result.FaceMatches[0];
    const similarity = bestMatch.Similarity || 0;
    const confidence = bestMatch.Face?.Confidence || 0;
    
    return {
      similarity,
      isMatch: similarity >= similarityThreshold,
      confidence
    };
  } catch (error) {
    console.error('Error comparing faces with Rekognition:', error);
    throw new Error('Failed to compare faces. Please ensure both images contain clear, visible faces.');
  }
}

/**
 * Check image quality for face recognition
 */
export async function checkImageQuality(options: FaceDetectionOptions): Promise<FaceQualityMetrics> {
  const result = await detectFaces(options);
  
  if (!result.faceDetected) {
    throw new Error('No face detected in image');
  }
  
  // For now, return mock quality metrics
  // In a real implementation, you would analyze the face details
  return {
    brightness: 0.8,
    sharpness: 0.9,
    pose: {
      roll: 0,
      yaw: 0,
      pitch: 0
    },
    quality: 'HIGH'
  };
}

/**
 * Detect inappropriate content in images
 */
export async function detectInappropriateContent(options: FaceDetectionOptions): Promise<boolean> {
  const { s3Bucket, s3Key } = options;
  
  try {
    const command = new DetectModerationLabelsCommand({
      Image: {
        S3Object: {
          Bucket: s3Bucket,
          Name: s3Key
        }
      },
      MinConfidence: 80
    });
    
    const result = await rekognitionClient.send(command);
    
    // Check if any inappropriate content was detected
    const hasInappropriateContent = result.ModerationLabels && result.ModerationLabels.length > 0;
    
    return hasInappropriateContent || false;
  } catch (error) {
    console.error('Error detecting inappropriate content:', error);
    // If moderation fails, allow the image to proceed
    return false;
  }
}

/**
 * Perform liveness check (simplified version)
 * Note: AWS Rekognition doesn't have built-in liveness detection
 * This is a simplified implementation based on face quality metrics
 */
export async function performLivenessCheck(options: FaceDetectionOptions): Promise<LivenessCheckResult> {
  try {
    const faceResult = await detectFaces(options);
    
    if (!faceResult.faceDetected) {
      return {
        isLive: false,
        confidence: 0,
        qualityScore: 0,
        spoofingDetected: true
      };
    }
    
    // Check for inappropriate content (could indicate spoofing)
    const hasInappropriateContent = await detectInappropriateContent(options);
    
    if (hasInappropriateContent) {
      return {
        isLive: false,
        confidence: 0,
        qualityScore: 0,
        spoofingDetected: true
      };
    }
    
    // Simple liveness check based on confidence and face quality
    const confidence = faceResult.confidence || 0;
    const qualityScore = confidence / 100;
    const isLive = confidence >= REKOGNITION_CONFIG.LIVENESS_DETECTION.MinConfidence;
    
    return {
      isLive,
      confidence,
      qualityScore,
      spoofingDetected: false
    };
  } catch (error) {
    console.error('Error performing liveness check:', error);
    throw new Error('Failed to perform liveness check. Please try again.');
  }
}

/**
 * Validate selfie image quality
 */
export async function validateSelfieQuality(options: FaceDetectionOptions): Promise<{
  isValid: boolean;
  issues: string[];
  confidence: number;
}> {
  try {
    const faceResult = await detectFaces(options);
    const issues: string[] = [];
    
    if (!faceResult.faceDetected) {
      issues.push('No face detected in image');
      return { isValid: false, issues, confidence: 0 };
    }
    
    const confidence = faceResult.confidence || 0;
    
    if (confidence < REKOGNITION_CONFIG.FACE_DETECTION.MinConfidence) {
      issues.push('Face detection confidence too low');
    }
    
    // Check if face is too small or too large
    if (faceResult.boundingBox) {
      const faceSize = faceResult.boundingBox.width * faceResult.boundingBox.height;
      if (faceSize < 0.1) {
        issues.push('Face is too small in the image');
      } else if (faceSize > 0.8) {
        issues.push('Face is too close to the camera');
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      confidence
    };
  } catch (error) {
    console.error('Error validating selfie quality:', error);
    return {
      isValid: false,
      issues: ['Failed to analyze image quality'],
      confidence: 0
    };
  }
}
