import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const response = await fetch(`${process.env.FASTAPI_URL}/v1/account/unlink-provider`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.detail || 'Failed to unlink provider' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error unlinking provider:', error)
    return NextResponse.json(
      { error: 'Failed to unlink provider' },
      { status: 500 }
    )
  }
}