import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract'

// Initialize AWS Textract client
const textractClient = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

/**
 * POST /api/extract-text
 * Extract text from documents using AWS Textract
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
    const { s3Key, documentType } = body

    // Validate input
    if (!s3Key) {
      return NextResponse.json(
        { success: false, error: 'S3 key is required' },
        { status: 400 }
      )
    }

    if (!documentType) {
      return NextResponse.json(
        { success: false, error: 'Document type is required' },
        { status: 400 }
      )
    }

    // Prepare Textract command
    const command = new AnalyzeDocumentCommand({
      Document: {
        S3Object: {
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Name: s3Key,
        },
      },
      FeatureTypes: ['TABLES', 'FORMS'],
    })

    // Execute Textract analysis
    const response = await textractClient.send(command)

    // Extract text from response
    const extractedText = extractTextFromBlocks(response.Blocks || [])
    const confidence = calculateAverageConfidence(response.Blocks || [])

    // Extract specific data based on document type
    const extractedData = extractSpecificData(extractedText, documentType)

    return NextResponse.json({
      success: true,
      data: {
        rawText: extractedText,
        confidence: confidence,
        documentType: documentType,
        extractedData: extractedData,
        blockCount: response.Blocks?.length || 0,
        processedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error extracting text:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to extract text from document',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Helper function to extract text from Textract blocks
 */
function extractTextFromBlocks(blocks: any[]): string {
  const textBlocks = blocks.filter(block => block.BlockType === 'LINE')
  return textBlocks.map(block => block.Text).join(' ')
}

/**
 * Helper function to calculate average confidence
 */
function calculateAverageConfidence(blocks: any[]): number {
  const textBlocks = blocks.filter(block => block.BlockType === 'LINE' && block.Confidence)
  if (textBlocks.length === 0) return 0
  
  const totalConfidence = textBlocks.reduce((sum, block) => sum + block.Confidence, 0)
  return Math.round((totalConfidence / textBlocks.length) * 100) / 100
}

/**
 * Helper function to extract specific data based on document type
 */
function extractSpecificData(text: string, documentType: string): any {
  const extractedData: any = {}

  switch (documentType) {
    case 'id-front':
    case 'id-back':
      // Extract BI number (Angolan ID format)
      const biMatch = text.match(/\b\d{9}[A-Z]{2}\d{3}\b/)
      if (biMatch) {
        extractedData.biNumber = biMatch[0]
      }

      // Extract name (common patterns)
      const namePatterns = [
        /Nome[:\s]+([A-Z\s]+)/i,
        /Name[:\s]+([A-Z\s]+)/i,
        /NOME[:\s]+([A-Z\s]+)/
      ]
      
      for (const pattern of namePatterns) {
        const nameMatch = text.match(pattern)
        if (nameMatch) {
          extractedData.fullName = nameMatch[1].trim()
          break
        }
      }

      // Extract date of birth
      const dobPatterns = [
        /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/,
        /\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/
      ]
      
      for (const pattern of dobPatterns) {
        const dobMatch = text.match(pattern)
        if (dobMatch) {
          extractedData.dateOfBirth = dobMatch[1]
          break
        }
      }
      break

    case 'proof-of-address':
      // Extract address information
      const addressMatch = text.match(/endereço[:\s]+(.+)/i)
      if (addressMatch) {
        extractedData.address = addressMatch[1].trim()
      }
      break

    default:
      // Generic extraction for other document types
      extractedData.rawText = text
      break
  }

  return extractedData
}
