import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Clan } from '@/lib/models/Clan';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get raw clan data without population
    const clansRaw = await Clan.find({});
    console.log('Debug - Raw clans count:', clansRaw.length);
    
    // Get clan count
    const count = await Clan.countDocuments();
    console.log('Debug - Clan count:', count);
    
    // Try to get clans with populate
    const clansPopulated = await Clan.find({})
      .populate('leader')
      .populate('members')
      .exec();
    
    return NextResponse.json({
      count,
      rawClans: clansRaw,
      populatedClans: clansPopulated,
      firstRaw: clansRaw[0] || null,
      firstPopulated: clansPopulated[0] || null
    });
  } catch (error) {
    console.error('Debug clans error:', error);
    return NextResponse.json({ 
      error: 'Failed to debug clans',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}