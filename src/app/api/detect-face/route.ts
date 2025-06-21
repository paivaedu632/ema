import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { RekognitionClient, DetectFacesCommand } from '@aws-sdk/client-rekognition'

// Initialize AWS Rekognition client
const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

/**
 * POST /api/detect-face
 * Detect faces in images using AWS Rekognition
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
    const { s3Key, imageType } = body

    // Validate input
    if (!s3Key) {
      return NextResponse.json(
        { success: false, error: 'S3 key is required' },
        { status: 400 }
      )
    }

    // Prepare Rekognition command
    const command = new DetectFacesCommand({
      Image: {
        S3Object: {
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Name: s3Key,
        },
      },
      Attributes: ['ALL'], // Get all face attributes
    })

    // Execute face detection
    const response = await rekognitionClient.send(command)

    // Process face detection results
    const faces = response.FaceDetails || []
    const faceCount = faces.length

    // Validate face detection results
    const validationResults = validateFaceDetection(faces, imageType)

    return NextResponse.json({
      success: true,
      data: {
        faceCount: faceCount,
        faces: faces.map(face => ({
          confidence: face.Confidence,
          boundingBox: face.BoundingBox,
          ageRange: face.AgeRange,
          gender: face.Gender,
          emotions: face.Emotions,
          eyesOpen: face.EyesOpen,
          mouthOpen: face.MouthOpen,
          mustache: face.Mustache,
          beard: face.Beard,
          eyeglasses: face.Eyeglasses,
          sunglasses: face.Sunglasses,
          smile: face.Smile,
          pose: face.Pose,
          quality: face.Quality
        })),
        validation: validationResults,
        imageType: imageType,
        processedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error detecting faces:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to detect faces in image',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Helper function to validate face detection results
 */
function validateFaceDetection(faces: any[], imageType?: string): any {
  const validation = {
    isValid: false,
    errors: [] as string[],
    warnings: [] as string[],
    recommendations: [] as string[]
  }

  // Check if any faces were detected
  if (faces.length === 0) {
    validation.errors.push('No faces detected in the image')
    validation.recommendations.push('Ensure the image contains a clear, visible face')
    return validation
  }

  // Check for multiple faces
  if (faces.length > 1) {
    validation.warnings.push(`Multiple faces detected (${faces.length}). Only one face should be visible.`)
    validation.recommendations.push('Take a new photo with only one person visible')
  }

  // Analyze the primary face (first detected face)
  const primaryFace = faces[0]

  // Check face confidence
  if (primaryFace.Confidence < 90) {
    validation.warnings.push(`Low face detection confidence (${primaryFace.Confidence.toFixed(1)}%)`)
    validation.recommendations.push('Ensure good lighting and clear image quality')
  }

  // Check image quality
  if (primaryFace.Quality) {
    if (primaryFace.Quality.Brightness < 30) {
      validation.warnings.push('Image is too dark')
      validation.recommendations.push('Take photo in better lighting conditions')
    }
    if (primaryFace.Quality.Brightness > 90) {
      validation.warnings.push('Image is too bright')
      validation.recommendations.push('Avoid direct sunlight or bright lights')
    }
    if (primaryFace.Quality.Sharpness < 50) {
      validation.warnings.push('Image is not sharp enough')
      validation.recommendations.push('Hold camera steady and ensure focus')
    }
  }

  // Check face pose
  if (primaryFace.Pose) {
    const { Roll, Yaw, Pitch } = primaryFace.Pose
    if (Math.abs(Roll) > 15 || Math.abs(Yaw) > 15 || Math.abs(Pitch) > 15) {
      validation.warnings.push('Face is not properly aligned')
      validation.recommendations.push('Look directly at the camera with head straight')
    }
  }

  // Check eyes visibility
  if (primaryFace.EyesOpen && primaryFace.EyesOpen.Value === false) {
    validation.warnings.push('Eyes appear to be closed')
    validation.recommendations.push('Keep eyes open and look at the camera')
  }

  // Check for sunglasses
  if (primaryFace.Sunglasses && primaryFace.Sunglasses.Value === true) {
    validation.errors.push('Sunglasses detected')
    validation.recommendations.push('Remove sunglasses for verification')
  }

  // Specific validations based on image type
  if (imageType === 'selfie') {
    // Additional selfie-specific validations
    if (primaryFace.Smile && primaryFace.Smile.Value === false) {
      validation.recommendations.push('A natural expression is recommended')
    }
  }

  // Determine overall validity
  validation.isValid = validation.errors.length === 0

  return validation
}
