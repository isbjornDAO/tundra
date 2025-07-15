import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { ClanRequest } from '@/lib/models/ClanRequest';
import { User } from '@/lib/models/User';
import { validateWalletAddress, validateCountryCode, sanitizeInput, escapeRegex } from '@/lib/security-utils';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const walletAddressParam = searchParams.get('walletAddress');
    const statusParam = searchParams.get('status');
    const countryParam = searchParams.get('country');
    
    let query: any = {};
    
    // Validate status parameter
    if (statusParam) {
      const allowedStatuses = ['pending', 'approved', 'rejected'];
      const sanitizedStatus = sanitizeInput(statusParam);
      if (!allowedStatuses.includes(sanitizedStatus)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      query.status = sanitizedStatus;
    }
    
    // Validate country parameter
    if (countryParam) {
      const { isValid, country, error } = validateCountryCode(countryParam);
      if (!isValid) {
        return NextResponse.json({ error: `Invalid country: ${error}` }, { status: 400 });
      }
      query.country = country;
    }
    
    // If wallet address provided, check if user is admin to see all requests
    if (walletAddressParam) {
      const { isValid, address, error } = validateWalletAddress(walletAddressParam);
      if (!isValid) {
        return NextResponse.json({ error: `Invalid wallet address: ${error}` }, { status: 400 });
      }
      
      const user = await User.findOne({ walletAddress: address });
      
      if (user?.isAdmin) {
        // Admin can see requests assigned to them or all if super admin
        if (user.adminRegions && user.adminRegions.length > 0) {
          // Regional admin - only see requests from their regions
          const regionCountries = await getCountriesForRegions(user.adminRegions);
          query.country = { $in: regionCountries };
        }
        // Super admin sees all (no additional filters)
      } else {
        // Regular user can only see their own requests
        query.requestedBy = user._id;
      }
    }
    
    const requests = await ClanRequest.find(query)
      .populate('requestedBy', 'displayName username walletAddress')
      .populate('reviewedBy', 'displayName username')
      .populate('assignedHost', 'displayName username')
      .sort({ createdAt: -1 });
    
    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching clan requests:', error);
    return NextResponse.json({ error: 'Failed to fetch clan requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const requestBody = await request.json();
    console.log('Received clan request data:', requestBody);
    const sanitizedData = sanitizeInput(requestBody);
    const { walletAddress, clanName, clanTag, description, logo, country, region, locationProof } = sanitizedData;
    
    console.log('Parsed fields:', { walletAddress, clanName, clanTag, country, region });
    
    if (!walletAddress || !clanName || !clanTag || !country || !region) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          received: { walletAddress, clanName, clanTag, country, region },
          missing: {
            walletAddress: !walletAddress,
            clanName: !clanName,
            clanTag: !clanTag,
            country: !country,
            region: !region
          }
        },
        { status: 400 }
      );
    }
    
    // Validate wallet address
    const { isValid: walletValid, address: validatedWallet, error: walletError } = validateWalletAddress(walletAddress);
    if (!walletValid) {
      return NextResponse.json({ error: `Invalid wallet address: ${walletError}` }, { status: 400 });
    }
    
    // Validate country
    const { isValid: countryValid, country: validatedCountry, error: countryError } = validateCountryCode(country);
    if (!countryValid) {
      return NextResponse.json({ error: `Invalid country: ${countryError}` }, { status: 400 });
    }
    
    // Validate clan name and tag format
    if (clanName.length < 3 || clanName.length > 50) {
      return NextResponse.json({ error: 'Clan name must be 3-50 characters' }, { status: 400 });
    }
    
    if (clanTag.length < 2 || clanTag.length > 5) {
      return NextResponse.json({ error: 'Clan tag must be 2-5 characters' }, { status: 400 });
    }
    
    if (!/^[a-zA-Z0-9\s_-]+$/.test(clanName)) {
      return NextResponse.json({ error: 'Clan name contains invalid characters' }, { status: 400 });
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(clanTag)) {
      return NextResponse.json({ error: 'Clan tag contains invalid characters' }, { status: 400 });
    }
    
    // Find the requesting user
    const user = await User.findOne({ walletAddress: validatedWallet });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user already has a pending request
    const existingRequest = await ClanRequest.findOne({
      requestedBy: user._id,
      status: 'pending'
    });
    
    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending clan request' },
        { status: 409 }
      );
    }
    
    // Check if clan name or tag already exists
    const existingClanName = await ClanRequest.findOne({
      $or: [
        { clanName: { $regex: new RegExp(`^${escapeRegex(clanName)}$`, 'i') } },
        { clanTag: { $regex: new RegExp(`^${escapeRegex(clanTag)}$`, 'i') } }
      ],
      status: { $in: ['pending', 'approved'] }
    });
    
    if (existingClanName) {
      return NextResponse.json(
        { error: 'Clan name or tag already exists or is pending approval' },
        { status: 409 }
      );
    }
    
    // Find appropriate regional host for this country
    const regionalHost = await findRegionalHost(validatedCountry, region);
    console.log('Found regional host:', regionalHost);
    
    const clanRequest = new ClanRequest({
      requestedBy: user._id,
      clanName,
      clanTag,
      description,
      logo,
      country: validatedCountry,
      region,
      locationProof,
      assignedHost: regionalHost?._id || null // Allow null if no regional host found
    });
    
    await clanRequest.save();
    console.log('Clan request saved successfully:', clanRequest._id);
    
    const populatedRequest = await ClanRequest.findById(clanRequest._id)
      .populate('requestedBy', 'displayName username walletAddress')
      .populate('assignedHost', 'displayName username');
    
    console.log('Populated request:', populatedRequest);
    return NextResponse.json(populatedRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating clan request:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      return NextResponse.json({ 
        error: 'Validation failed', 
        validationErrors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to create clan request',
      details: error.message 
    }, { status: 500 });
  }
}

// Helper function to find regional host
async function findRegionalHost(country: string, region: string) {
  // First try to find a Team1 host specifically for this country
  let host = await User.findOne({
    $or: [
      { isTeam1Host: true },
      { isAdmin: true }
    ],
    adminRegions: { $in: [region] },
    country: country
  });
  
  // If no country-specific host, find any regional host
  if (!host) {
    host = await User.findOne({
      $or: [
        { isTeam1Host: true },
        { isAdmin: true }
      ],
      adminRegions: { $in: [region] }
    });
  }
  
  // If no regional host found, just find any Team1 host or admin
  if (!host) {
    host = await User.findOne({
      $or: [
        { isTeam1Host: true },
        { isAdmin: true }
      ]
    });
  }
  
  return host;
}

// Helper function to get countries for regions (this would need to be expanded)
async function getCountriesForRegions(regions: string[]) {
  // This is a simplified mapping - you'd want a proper country-region mapping
  const regionCountryMap: { [key: string]: string[] } = {
    'Oceania': ['New Zealand', 'Australia', 'Fiji', 'Papua New Guinea'],
    'North America': ['United States', 'Canada', 'Mexico'],
    'Europe West': ['United Kingdom', 'France', 'Germany', 'Spain'],
    // Add more mappings as needed
  };
  
  const countries: string[] = [];
  for (const region of regions) {
    if (regionCountryMap[region]) {
      countries.push(...regionCountryMap[region]);
    }
  }
  
  return countries;
}