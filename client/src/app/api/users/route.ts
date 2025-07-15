import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { User } from '@/lib/models/User';
import { validateWalletAddress, validateUsername, validateCountryCode, sanitizeInput } from '@/lib/security-utils';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const walletAddressParam = searchParams.get('walletAddress');
    
    if (walletAddressParam) {
      // Validate wallet address
      const { isValid, address, error } = validateWalletAddress(walletAddressParam);
      if (!isValid) {
        return NextResponse.json({ error: `Invalid wallet address: ${error}` }, { status: 400 });
      }
      
      const user = await User.findOne({ 
        walletAddress: address
      });
      
      // Try to populate clan if it exists
      if (user && user.clan) {
        try {
          await user.populate({
            path: 'clan',
            select: 'name tag description logo country region memberCount stats leader members',
            populate: {
              path: 'members leader',
              select: 'username displayName walletAddress country'
            }
          });
        } catch (error) {
          console.error('Error populating clan:', error);
          // Continue without clan data if population fails
        }
      }
      
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
    
    const requestBody = await request.json();
    const sanitizedData = sanitizeInput(requestBody);
    const { walletAddress, username, displayName, email, country, avatar, bio } = sanitizedData;
    
    // Validate required fields
    if (!walletAddress || !username || !country) {
      return NextResponse.json(
        { error: 'Wallet address, username, and country are required' },
        { status: 400 }
      );
    }
    
    // Validate wallet address
    const { isValid: walletValid, address: validatedWallet, error: walletError } = validateWalletAddress(walletAddress);
    if (!walletValid) {
      return NextResponse.json({ error: `Invalid wallet address: ${walletError}` }, { status: 400 });
    }
    
    // Validate username
    const { isValid: usernameValid, username: validatedUsername, error: usernameError } = validateUsername(username);
    if (!usernameValid) {
      return NextResponse.json({ error: `Invalid username: ${usernameError}` }, { status: 400 });
    }
    
    // Validate country
    const { isValid: countryValid, country: validatedCountry, error: countryError } = validateCountryCode(country);
    if (!countryValid) {
      return NextResponse.json({ error: `Invalid country: ${countryError}` }, { status: 400 });
    }
    
    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
    }
    
    // Check if user already exists
    const existingUserByWallet = await User.findOne({ 
      walletAddress: validatedWallet
    });
    const existingUserByUsername = await User.findOne({ username: validatedUsername });
    
    
    // If wallet exists but has no username or invalid username, update the existing record
    const hasValidUsername = existingUserByWallet?.username && 
                            existingUserByWallet.username.trim() !== '' && 
                            existingUserByWallet.username !== null && 
                            existingUserByWallet.username !== undefined;
    
    if (existingUserByWallet && !hasValidUsername) {
      
      // Check if the username we want to add is taken by someone else
      if (existingUserByUsername && existingUserByUsername.walletAddress !== validatedWallet) {
        return NextResponse.json({ error: 'Username is already taken. Please choose a different username.' }, { status: 409 });
      }
      
      // Update the existing user record
      const updateData: any = {
        username: validatedUsername,
        displayName: displayName || validatedUsername,
        email: email ? email.toLowerCase() : undefined,
        country: validatedCountry,
        avatar: avatar || '',
        bio: bio || '',
        updatedAt: new Date()
      };
      
      const updatedUser = await User.findOneAndUpdate(
        { walletAddress: validatedWallet },
        updateData,
        { new: true }
      );
      
      return NextResponse.json(updatedUser, { status: 201 });
    }
    
    // Check for conflicts when creating a new user
    if (existingUserByWallet && hasValidUsername) {
      return NextResponse.json({ error: 'This wallet is already connected to another account. Try connecting with a different wallet.' }, { status: 409 });
    }
    if (existingUserByUsername) {
      return NextResponse.json({ error: 'Username is already taken. Please choose a different username.' }, { status: 409 });
    }
    
    const userData: any = {
      walletAddress: validatedWallet,
      username: validatedUsername,
      displayName: displayName || validatedUsername,
      email: email ? email.toLowerCase() : undefined,
      country: validatedCountry,
      avatar: avatar || '',
      bio: bio || '',
      stats: {
        totalTournaments: 0,
        wins: 0,
        totalPrizeMoney: 0,
        level: 1,
        xp: 0
      }
    };

    let newUser;
    try {
      newUser = new User(userData);
      await newUser.save();
    } catch (saveError: any) {
      // Handle duplicate key errors more specifically
      if (saveError.code === 11000) {
        const duplicateField = saveError.keyValue;
        
        if (duplicateField.username) {
          return NextResponse.json({ error: 'This username was just taken by someone else. Please choose a different username.' }, { status: 409 });
        } else if (duplicateField.walletAddress) {
          return NextResponse.json({ error: 'This wallet address is already in use.' }, { status: 409 });
        } else {
          return NextResponse.json({ error: 'Account information already exists.' }, { status: 409 });
        }
      }
      throw saveError; // Re-throw if it's not a duplicate key error
    }
    
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('E11000') || error.message.includes('duplicate key')) {
        // Parse which field caused the duplicate key error
        if (error.message.includes('walletAddress')) {
          return NextResponse.json({ error: 'Wallet address already exists in our system' }, { status: 409 });
        } else if (error.message.includes('username')) {
          return NextResponse.json({ error: 'Username already exists in our system' }, { status: 409 });
        } else {
          return NextResponse.json({ error: 'Duplicate data detected - wallet or username already exists' }, { status: 409 });
        }
      }
      if (error.message.includes('validation failed')) {
        return NextResponse.json({ error: `Validation error: ${error.message}` }, { status: 400 });
      }
    }
    
    return NextResponse.json({ error: `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const requestBody = await request.json();
    const sanitizedData = sanitizeInput(requestBody);
    const { walletAddress, displayName, email, avatar, bio } = sanitizedData;
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Validate wallet address
    const { isValid: walletValid, address: validatedWallet, error: walletError } = validateWalletAddress(walletAddress);
    if (!walletValid) {
      return NextResponse.json({ error: `Invalid wallet address: ${walletError}` }, { status: 400 });
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
        walletAddress: { $ne: validatedWallet }
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
    if (data.stats !== undefined) updateData.stats = data.stats;

    const user = await User.findOneAndUpdate(
      { walletAddress: validatedWallet },
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