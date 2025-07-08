import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { ClanRequest } from '@/lib/models/ClanRequest';
import { User } from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const status = searchParams.get('status');
    const country = searchParams.get('country');
    
    let query: any = {};
    
    if (status) query.status = status;
    if (country) query.country = country;
    
    // If wallet address provided, check if user is admin to see all requests
    if (walletAddress) {
      const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
      
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
    
    const data = await request.json();
    console.log('Received clan request data:', data);
    const { walletAddress, clanName, clanTag, description, logo, country, region, locationProof } = data;
    
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
    
    // Find the requesting user
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
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
        { clanName: clanName },
        { clanTag: clanTag }
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
    const regionalHost = await findRegionalHost(country, region);
    console.log('Found regional host:', regionalHost);
    
    const clanRequest = new ClanRequest({
      requestedBy: user._id,
      clanName,
      clanTag,
      description,
      logo,
      country,
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