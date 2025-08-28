import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { RekognitionClient, DetectFacesCommand, type FaceDetail, type Emotion } from '@aws-sdk/client-rekognition'

// Initialize AWS Rekognition client
const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

/**
 * POST /api/liveness-check
 * Perform liveness detection on selfie images using AWS Rekognition
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId: clerkUserId } = await auth()
    
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { s3Key, checkType = 'basic' } = body

    // Validate input
    if (!s3Key) {
      return NextResponse.json(
        { success: false, error: 'S3 key is required' },
        { status: 400 }
      )
    }

    // Prepare Rekognition command for detailed face analysis
    const command = new DetectFacesCommand({
      Image: {
        S3Object: {
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Name: s3Key,
        },
      },
      Attributes: ['ALL'], // Get all face attributes for liveness analysis
    })

    // Execute face detection with detailed attributes
    const response = await rekognitionClient.send(command)

    // Process liveness detection results
    const faces = response.FaceDetails || []
    
    if (faces.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No faces detected in the image',
        data: {
          livenessScore: 0,
          isLive: false,
          confidence: 0,
          reasons: ['No face detected']
        }
      }, { status: 400 })
    }

    // Analyze the primary face for liveness indicators
    const primaryFace = faces[0]
    const livenessAnalysis = analyzeLiveness(primaryFace, checkType)

    return NextResponse.json({
      success: true,
      data: {
        livenessScore: livenessAnalysis.score,
        isLive: livenessAnalysis.isLive,
        confidence: livenessAnalysis.confidence,
        faceCount: faces.length,
        analysis: {
          eyesOpen: primaryFace.EyesOpen,
          mouthOpen: primaryFace.MouthOpen,
          pose: primaryFace.Pose,
          quality: primaryFace.Quality,
          emotions: primaryFace.Emotions,
          ageRange: primaryFace.AgeRange,
          gender: primaryFace.Gender
        },
        validation: livenessAnalysis.validation,
        checkType: checkType,
        processedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error performing liveness check:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform liveness check',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Helper function to analyze liveness indicators
 */
function analyzeLiveness(face: FaceDetail, checkType: string): {
  score: number;
  isLive: boolean;
  confidence: number;
  validation: Record<string, unknown>;
  indicators: Record<string, unknown>;
} {
  const analysis = {
    score: 0,
    isLive: false,
    confidence: face.Confidence || 0,
    validation: {
      isValid: false,
      errors: [] as string[],
      warnings: [] as string[],
      recommendations: [] as string[],
      indicators: {} as any
    }
  }

  let livenessScore = 0
  const indicators = analysis.validation.indicators

  // Check eyes open (strong liveness indicator)
  if (face.EyesOpen) {
    indicators.eyesOpen = {
      value: face.EyesOpen.Value,
      confidence: face.EyesOpen.Confidence
    }
    
    if (face.EyesOpen.Value && face.EyesOpen.Confidence > 80) {
      livenessScore += 30
    } else if (!face.EyesOpen.Value) {
      analysis.validation.warnings.push('Eyes appear to be closed')
      analysis.validation.recommendations.push('Keep eyes open and look directly at the camera')
    }
  }

  // Check face pose (natural pose indicates liveness)
  if (face.Pose) {
    indicators.pose = face.Pose
    
    const { Roll, Yaw, Pitch } = face.Pose
    const poseVariation = Math.abs(Roll) + Math.abs(Yaw) + Math.abs(Pitch)
    
    // Some natural pose variation is good for liveness
    if (poseVariation > 5 && poseVariation < 30) {
      livenessScore += 20
    } else if (poseVariation >= 30) {
      analysis.validation.warnings.push('Face pose is too extreme')
      analysis.validation.recommendations.push('Hold head in a more natural position')
    } else {
      // Too perfect pose might indicate a photo of a photo
      livenessScore += 10
    }
  }

  // Check image quality (high quality suggests real capture)
  if (face.Quality) {
    indicators.quality = face.Quality
    
    const { Brightness, Sharpness } = face.Quality
    
    // Good brightness range
    if (Brightness >= 40 && Brightness <= 80) {
      livenessScore += 15
    } else {
      analysis.validation.warnings.push('Image brightness is not optimal')
      analysis.validation.recommendations.push('Ensure good, even lighting')
    }
    
    // Good sharpness indicates real-time capture
    if (Sharpness >= 60) {
      livenessScore += 15
    } else {
      analysis.validation.warnings.push('Image is not sharp enough')
      analysis.validation.recommendations.push('Hold camera steady and ensure focus')
    }
  }

  // Check emotions (natural expression indicates liveness)
  if (face.Emotions && face.Emotions.length > 0) {
    indicators.emotions = face.Emotions
    
    // Look for natural emotional expressions
    const naturalEmotions = face.Emotions.filter((emotion: Emotion) =>
      emotion.Type && ['HAPPY', 'CALM', 'SURPRISED'].includes(emotion.Type) &&
      emotion.Confidence && emotion.Confidence > 50
    )
    
    if (naturalEmotions.length > 0) {
      livenessScore += 10
    }
  }

  // Check for sunglasses (reduces liveness confidence)
  if (face.Sunglasses && face.Sunglasses.Value) {
    analysis.validation.errors.push('Sunglasses detected')
    analysis.validation.recommendations.push('Remove sunglasses for liveness verification')
    livenessScore -= 20
  }

  // Advanced checks for enhanced liveness detection
  if (checkType === 'enhanced') {
    // Check mouth state
    if (face.MouthOpen) {
      indicators.mouthOpen = {
        value: face.MouthOpen.Value,
        confidence: face.MouthOpen.Confidence
      }
      
      // Natural mouth state variation
      if (face.MouthOpen.Confidence > 70) {
        livenessScore += 5
      }
    }

    // Check for facial hair (natural variation)
    if (face.Beard || face.Mustache) {
      indicators.facialHair = {
        beard: face.Beard,
        mustache: face.Mustache
      }
      livenessScore += 5
    }
  }

  // Calculate final score and determine liveness
  analysis.score = Math.max(0, Math.min(100, livenessScore))
  analysis.isLive = analysis.score >= 60 // Threshold for liveness

  // Set validation status
  if (analysis.isLive) {
    analysis.validation.isValid = true
    if (analysis.score >= 80) {
      indicators.livenessLevel = 'HIGH'
    } else if (analysis.score >= 70) {
      indicators.livenessLevel = 'MEDIUM'
    } else {
      indicators.livenessLevel = 'LOW'
      analysis.validation.warnings.push('Liveness confidence is low')
      analysis.validation.recommendations.push('Try taking a new selfie with better conditions')
    }
  } else {
    analysis.validation.isValid = false
    analysis.validation.errors.push('Liveness check failed')
    analysis.validation.recommendations.push('Take a new live selfie following the guidelines')
  }

  return analysis
}
