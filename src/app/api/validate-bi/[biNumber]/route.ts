import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ biNumber: string }> }
) {
  try {
    const { biNumber } = await params

    // Validate that biNumber is provided
    if (!biNumber) {
      return NextResponse.json(
        { error: 'BI number is required' },
        { status: 400 }
      )
    }

    // Make request to Angola API
    const response = await fetch(
      `https://angolaapi.onrender.com/api/v1/validate/bi/${biNumber}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    // Return the same status code as the Angola API
    if (response.status === 200) {
      // Valid BI
      return NextResponse.json({ valid: true }, { status: 200 })
    } else if (response.status === 400) {
      // Invalid BI
      return NextResponse.json({ valid: false }, { status: 400 })
    } else {
      // Other errors
      return NextResponse.json(
        { error: 'Validation service unavailable' },
        { status: 503 }
      )
    }
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
