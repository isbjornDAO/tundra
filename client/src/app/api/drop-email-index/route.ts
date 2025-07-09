import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { User } from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    console.log('Dropping email index...');
    
    // Get the underlying collection
    const collection = User.collection;
    
    // Drop the email index if it exists
    try {
      await collection.dropIndex('email_1');
      console.log('Successfully dropped email_1 index');
    } catch (error: any) {
      console.log('Email index may not exist:', error.message);
    }
    
    // Also try dropping any other email-related indexes
    try {
      await collection.dropIndex({ email: 1 });
      console.log('Successfully dropped email index');
    } catch (error: any) {
      console.log('Email index may not exist:', error.message);
    }
    
    // Remove email field from all existing documents
    const result = await collection.updateMany(
      {},
      { $unset: { email: "" } }
    );
    
    console.log('Removed email field from', result.modifiedCount, 'documents');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Email index dropped and field removed from all documents',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to drop email index' }, { status: 500 });
  }
}