import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // For mobile, we just need to acknowledge the logout
    // The actual session clearing happens on the client side
    console.log('Mobile logout request received');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mobile logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}