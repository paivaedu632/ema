import { NextResponse } from 'next/server'
import { runDatabaseTests } from '@/lib/test-db-connection'

export async function GET() {
  try {
    const success = await runDatabaseTests()
    
    return NextResponse.json({
      success,
      message: success 
        ? 'Database connection and tests successful!' 
        : 'Database tests failed. Check console for details.',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Database test API error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Database test API failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
