import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Clan } from '@/lib/models/Clan';
import { User } from '@/lib/models/User';

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Delete all clans
    const deleteResult = await Clan.deleteMany({});
    
    // Update all users to remove clan references
    await User.updateMany(
      { clan: { $exists: true } },
      { 
        $unset: { clan: "" },
        $set: { isClanLeader: false }
      }
    );
    
    return NextResponse.json({ 
      message: 'All clans deleted successfully',
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('Error deleting clans:', error);
    return NextResponse.json({ error: 'Failed to delete clans' }, { status: 500 });
  }
}