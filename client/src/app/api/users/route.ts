import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { User } from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    
    if (walletAddress) {
      const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() })
        .populate('clan', 'name tag description logo country region memberCount stats leader members');
      return NextResponse.json({ user });
    }
    
    // Return all users for admin view
    const users = await User.find({});
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const data = await request.json();
    const { walletAddress, username, displayName, email, country, avatar, bio } = data;
    
    // Validate required fields
    if (!walletAddress || !username || !displayName || !email || !country) {
      return NextResponse.json(
        { error: 'Wallet address, username, display name, email, and country are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ 
        error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' 
      }, { status: 400 });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { walletAddress: walletAddress.toLowerCase() },
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });
    
    if (existingUser) {
      if (existingUser.walletAddress === walletAddress.toLowerCase()) {
        return NextResponse.json({ error: 'Wallet address already registered' }, { status: 409 });
      }
      if (existingUser.username === username.toLowerCase()) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
      }
      if (existingUser.email === email.toLowerCase()) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
    }
    
    const newUser = new User({
      walletAddress: walletAddress.toLowerCase(),
      username: username.toLowerCase(),
      displayName,
      email: email.toLowerCase(),
      country,
      avatar,
      bio,
      stats: {
        totalTournaments: 0,
        wins: 0,
        totalPrizeMoney: 0,
        level: 1,
        xp: 0
      }
    });
    
    await newUser.save();
    
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const data = await request.json();
    const { walletAddress, displayName, email, avatar, bio } = data;
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }

      // Check if email is already taken by another user
      const existingEmail = await User.findOne({
        email: email.toLowerCase(),
        walletAddress: { $ne: walletAddress.toLowerCase() }
      });
      if (existingEmail) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
    }

    // Find and update user (exclude country, username, and walletAddress)
    const updateData: any = { updatedAt: new Date() };
    if (displayName !== undefined) updateData.displayName = displayName;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (avatar !== undefined) updateData.avatar = avatar;
    if (bio !== undefined) updateData.bio = bio;
    if (data.isClanLeader !== undefined) updateData.isClanLeader = data.isClanLeader;
    if (data.isTeam1Host !== undefined) updateData.isTeam1Host = data.isTeam1Host;

    const user = await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      updateData,
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}