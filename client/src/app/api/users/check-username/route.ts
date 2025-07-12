import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { User } from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    console.log('Checking username:', username, 'Length:', username.length, 'Regex test:', usernameRegex.test(username));
    
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ 
        available: false, 
        error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' 
      }, { status: 400 });
    }
    
    // Check if username exists (case-insensitive)
    const existingUser = await User.findOne({ 
      username: username.toLowerCase() 
    });
    
    console.log('Username check for:', username.toLowerCase(), 'exists:', !!existingUser);
    
    return NextResponse.json({ 
      available: !existingUser,
      username: username.toLowerCase()
    });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json({ error: 'Failed to check username availability' }, { status: 500 });
  }
}