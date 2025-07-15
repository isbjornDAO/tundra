import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { User } from '@/lib/models/User';

/**
 * Authentication middleware for API routes
 * Verifies user authentication and authorization
 */

export interface AuthenticatedUser {
  _id: string;
  walletAddress: string;
  username?: string;
  displayName?: string;
  isAdmin: boolean;
  isTeam1Host: boolean;
  isClanLeader: boolean;
  adminRegions: string[];
  region?: string;
}

export interface AuthContext {
  user: AuthenticatedUser;
  isAdmin: boolean;
  isTeam1Host: boolean;
  isSuperAdmin: boolean;
  isRegionalAdmin: boolean;
}

/**
 * Extract wallet address from Authorization header
 * Format: "Bearer wallet_address" or "Wallet wallet_address"
 */
function extractWalletFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  const [scheme, address] = authHeader.split(' ');
  if (!scheme || !address) return null;
  
  if (scheme.toLowerCase() === 'bearer' || scheme.toLowerCase() === 'wallet') {
    return address.toLowerCase();
  }
  
  return null;
}

/**
 * Get wallet address from request (header preferred, fallback to body/query)
 * This is a transitional function until proper auth is implemented
 */
async function getWalletAddress(request: NextRequest): Promise<string | null> {
  // First try to get from Authorization header (preferred)
  const headerWallet = extractWalletFromHeader(request);
  if (headerWallet) {
    return headerWallet;
  }
  
  // Fallback to request body/query (less secure)
  try {
    if (request.method === 'GET') {
      const { searchParams } = new URL(request.url);
      const walletAddress = searchParams.get('walletAddress');
      return walletAddress?.toLowerCase() || null;
    } else {
      const body = await request.json();
      return body.walletAddress?.toLowerCase() || null;
    }
  } catch {
    return null;
  }
}

/**
 * Authenticate user with wallet-based authentication
 */
export async function authenticateUser(request: NextRequest): Promise<AuthContext | null> {
  try {
    await connectToDatabase();
    
    const walletAddress = await getWalletAddress(request);
    if (!walletAddress) {
      return null;
    }
    
    const user = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    }).select('-__v');
    
    if (!user) {
      return null;
    }
    
    const authUser: AuthenticatedUser = {
      _id: user._id.toString(),
      walletAddress: user.walletAddress,
      username: user.username,
      displayName: user.displayName,
      isAdmin: user.isAdmin || false,
      isTeam1Host: user.isTeam1Host || false,
      isClanLeader: user.isClanLeader || false,
      adminRegions: user.adminRegions || [],
      region: user.region,
    };
    
    return {
      user: authUser,
      isAdmin: authUser.isAdmin,
      isTeam1Host: authUser.isTeam1Host,
      isSuperAdmin: authUser.isAdmin && authUser.adminRegions.length === 0,
      isRegionalAdmin: authUser.isAdmin && authUser.adminRegions.length > 0,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Require authentication middleware
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext | NextResponse> {
  const auth = await authenticateUser(request);
  
  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required. Please provide valid wallet address.' },
      { status: 401 }
    );
  }
  
  return auth;
}

/**
 * Require admin privileges
 */
export async function requireAdmin(request: NextRequest): Promise<AuthContext | NextResponse> {
  const auth = await requireAuth(request);
  
  if (auth instanceof NextResponse) {
    return auth; // Authentication failed
  }
  
  if (!auth.isAdmin) {
    return NextResponse.json(
      { error: 'Admin privileges required.' },
      { status: 403 }
    );
  }
  
  return auth;
}

/**
 * Require Team1 host privileges
 */
export async function requireTeam1Host(request: NextRequest): Promise<AuthContext | NextResponse> {
  const auth = await requireAuth(request);
  
  if (auth instanceof NextResponse) {
    return auth; // Authentication failed
  }
  
  if (!auth.isTeam1Host) {
    return NextResponse.json(
      { error: 'Team1 host privileges required.' },
      { status: 403 }
    );
  }
  
  return auth;
}

/**
 * Require super admin privileges (admin with no regional restrictions)
 */
export async function requireSuperAdmin(request: NextRequest): Promise<AuthContext | NextResponse> {
  const auth = await requireAdmin(request);
  
  if (auth instanceof NextResponse) {
    return auth; // Authentication or admin check failed
  }
  
  if (!auth.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Super admin privileges required.' },
      { status: 403 }
    );
  }
  
  return auth;
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Create a 403 Forbidden response
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}