import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition'

// Initialize AWS Rekognition client
const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

/**
 * POST /api/compare-faces
 * Compare faces between two images using AWS Rekognition
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
    const { sourceS3Key, targetS3Key, similarityThreshold = 80 } = body

    // Validate input
    if (!sourceS3Key) {
      return NextResponse.json(
        { success: false, error: 'Source S3 key is required' },
        { status: 400 }
      )
    }

    if (!targetS3Key) {
      return NextResponse.json(
        { success: false, error: 'Target S3 key is required' },
        { status: 400 }
      )
    }

    // Prepare Rekognition command
    const command = new CompareFacesCommand({
      SourceImage: {
        S3Object: {
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Name: sourceS3Key,
        },
      },
      TargetImage: {
        S3Object: {
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Name: targetS3Key,
        },
      },
      SimilarityThreshold: similarityThreshold,
    })

    // Execute face comparison
    const response = await rekognitionClient.send(command)

    // Process comparison results
    const faceMatches = response.FaceMatches || []
    const unmatchedFaces = response.UnmatchedFaces || []
    
    // Determine if faces match
    const hasMatch = faceMatches.length > 0
    const highestSimilarity = hasMatch 
      ? Math.max(...faceMatches.map(match => match.Similarity || 0))
      : 0

    // Generate comparison result
    const comparisonResult = {
      isMatch: hasMatch && highestSimilarity >= similarityThreshold,
      similarity: highestSimilarity,
      confidence: hasMatch ? faceMatches[0].Face?.Confidence || 0 : 0,
      threshold: similarityThreshold,
      matchCount: faceMatches.length,
      unmatchedCount: unmatchedFaces.length
    }

    // Generate validation and recommendations
    const validation = validateFaceComparison(comparisonResult, faceMatches, unmatchedFaces)

    return NextResponse.json({
      success: true,
      data: {
        comparison: comparisonResult,
        faceMatches: faceMatches.map(match => ({
          similarity: match.Similarity,
          face: {
            confidence: match.Face?.Confidence,
            boundingBox: match.Face?.BoundingBox,
            landmarks: match.Face?.Landmarks,
            pose: match.Face?.Pose,
            quality: match.Face?.Quality
          }
        })),
        unmatchedFaces: unmatchedFaces.map(face => ({
          confidence: face.Confidence,
          boundingBox: face.BoundingBox,
          landmarks: face.Landmarks,
          pose: face.Pose,
          quality: face.Quality
        })),
        validation: validation,
        processedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error comparing faces:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to compare faces',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Helper function to validate face comparison results
 */
function validateFaceComparison(
  comparisonResult: any, 
  faceMatches: any[], 
  unmatchedFaces: any[]
): any {
  const validation = {
    isValid: false,
    status: '',
    errors: [] as string[],
    warnings: [] as string[],
    recommendations: [] as string[]
  }

  // Determine validation status
  if (comparisonResult.isMatch) {
    validation.isValid = true
    validation.status = 'MATCH_CONFIRMED'
    
    if (comparisonResult.similarity >= 95) {
      validation.status = 'STRONG_MATCH'
    } else if (comparisonResult.similarity >= 85) {
      validation.status = 'GOOD_MATCH'
    } else {
      validation.status = 'WEAK_MATCH'
      validation.warnings.push(`Similarity score is relatively low (${comparisonResult.similarity.toFixed(1)}%)`)
      validation.recommendations.push('Consider retaking photos with better lighting and positioning')
    }
  } else {
    validation.isValid = false
    validation.status = 'NO_MATCH'
    validation.errors.push('Faces do not match the similarity threshold')
    
    if (faceMatches.length === 0 && unmatchedFaces.length > 0) {
      validation.errors.push('No matching faces found between the images')
      validation.recommendations.push('Ensure both images contain clear, visible faces of the same person')
    }
    
    if (comparisonResult.similarity > 0 && comparisonResult.similarity < comparisonResult.threshold) {
      validation.warnings.push(`Similarity (${comparisonResult.similarity.toFixed(1)}%) is below threshold (${comparisonResult.threshold}%)`)
      validation.recommendations.push('Try taking new photos with better lighting and clearer face visibility')
    }
  }

  // Additional quality checks
  if (faceMatches.length > 0) {
    const primaryMatch = faceMatches[0]
    
    if (primaryMatch.Face?.Quality) {
      const quality = primaryMatch.Face.Quality
      
      if (quality.Brightness < 30 || quality.Brightness > 90) {
        validation.warnings.push('Image brightness may affect comparison accuracy')
        validation.recommendations.push('Ensure consistent lighting conditions in both photos')
      }
      
      if (quality.Sharpness < 50) {
        validation.warnings.push('Image sharpness may affect comparison accuracy')
        validation.recommendations.push('Hold camera steady and ensure proper focus')
      }
    }
    
    if (primaryMatch.Face?.Pose) {
      const pose = primaryMatch.Face.Pose
      if (Math.abs(pose.Roll) > 20 || Math.abs(pose.Yaw) > 20 || Math.abs(pose.Pitch) > 20) {
        validation.warnings.push('Face pose may affect comparison accuracy')
        validation.recommendations.push('Ensure face is properly aligned in both photos')
      }
    }
  }

  return validation
}
