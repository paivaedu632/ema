import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// Initialize AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

/**
 * POST /api/upload-document
 * Upload KYC documents to AWS S3
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

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('documentType') as string
    const userId = formData.get('userId') as string

    // Validate input
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!documentType) {
      return NextResponse.json(
        { success: false, error: 'Document type is required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Generate unique file name
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${userId}/${documentType}/${timestamp}.${fileExtension}`

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        userId: userId,
        documentType: documentType,
        originalName: file.name,
        uploadedBy: clerkUserId,
        uploadedAt: new Date().toISOString()
      }
    })

    await s3Client.send(uploadCommand)

    // Generate S3 URL
    const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`

    return NextResponse.json({
      success: true,
      data: {
        s3Key: fileName,
        s3Url: s3Url,
        documentType: documentType,
        fileSize: file.size,
        fileName: file.name,
        uploadedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error uploading document:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload document',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/upload-document
 * Get upload configuration and limits
 */
export async function GET() {
  try {
    // Get authenticated user
    const { userId: clerkUserId } = await auth()
    
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        supportedDocuments: [
          'id-front',
          'id-back',
          'selfie',
          'proof-of-address',
          'bank-statement'
        ],
        bucketName: process.env.AWS_S3_BUCKET_NAME,
        region: process.env.AWS_REGION || 'us-east-1'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error getting upload configuration:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get upload configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
