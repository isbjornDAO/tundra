import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { ClanRequest } from '@/lib/models/ClanRequest';

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Delete all clan requests
    const deleteResult = await ClanRequest.deleteMany({});
    
    return NextResponse.json({ 
      message: 'All clan requests deleted successfully',
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('Error deleting clan requests:', error);
    return NextResponse.json({ error: 'Failed to delete clan requests' }, { status: 500 });
  }
}