import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tundra');
    const profilesCollection = db.collection('profiles');

    // Get user profile
    const profile = await profilesCollection.findOne({ walletAddress });

    if (!profile) {
      // Return default profile if none exists
      return NextResponse.json({
        walletAddress,
        displayName: '',
        bio: '',
        favoriteGame: '',
        country: '',
        discord: '',
        steam: '',
        twitter: '',
        twitch: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      displayName,
      bio,
      favoriteGame,
      country,
      discord,
      steam,
      twitter,
      twitch
    } = body;

    // Validate required fields
    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    if (displayName.length > 50) {
      return NextResponse.json({ error: 'Display name must be 50 characters or less' }, { status: 400 });
    }

    if (bio && bio.length > 500) {
      return NextResponse.json({ error: 'Bio must be 500 characters or less' }, { status: 400 });
    }

    // Validate social media handles (optional)
    const socialValidation = {
      discord: /^[a-zA-Z0-9._-]{2,32}$/,
      steam: /^[a-zA-Z0-9._-]{2,32}$/,
      twitter: /^[a-zA-Z0-9._-]{1,15}$/,
      twitch: /^[a-zA-Z0-9._-]{4,25}$/
    };

    for (const [field, regex] of Object.entries(socialValidation)) {
      const value = body[field];
      if (value && !regex.test(value)) {
        return NextResponse.json({ 
          error: `Invalid ${field} handle format` 
        }, { status: 400 });
      }
    }

    const client = await clientPromise;
    const db = client.db('tundra');
    const profilesCollection = db.collection('profiles');

    const profileData = {
      walletAddress,
      displayName: displayName.trim(),
      bio: bio?.trim() || '',
      favoriteGame: favoriteGame || '',
      country: country || '',
      discord: discord || '',
      steam: steam || '',
      twitter: twitter || '',
      twitch: twitch || '',
      updatedAt: new Date()
    };

    // Upsert profile (update if exists, create if not)
    const result = await profilesCollection.updateOne(
      { walletAddress },
      { 
        $set: profileData,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    if (result.acknowledged) {
      return NextResponse.json({ 
        message: 'Profile updated successfully',
        profile: profileData
      });
    } else {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tundra');
    const profilesCollection = db.collection('profiles');

    const result = await profilesCollection.deleteOne({ walletAddress });

    if (result.deletedCount === 1) {
      return NextResponse.json({ message: 'Profile deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error deleting profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}