import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Message } from '@/lib/models/Message';
import { User } from '@/lib/models/User';
import { Clan } from '@/lib/models/Clan';

export async function GET(
  request: NextRequest,
  { params }: { params: { clanId: string } }
) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }
    
    // Verify user is member of this clan
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (!user || !user.clan || user.clan.toString() !== params.clanId) {
      return NextResponse.json({ error: 'Unauthorized: Not a member of this clan' }, { status: 403 });
    }
    
    // Fetch messages with sender details
    const messages = await Message.find({ clan: params.clanId })
      .populate('sender', 'displayName username walletAddress avatar')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);
    
    // Reverse to show oldest first
    const reversedMessages = messages.reverse();
    
    return NextResponse.json({ messages: reversedMessages });
  } catch (error) {
    console.error('Error fetching clan messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { clanId: string } }
) {
  try {
    await connectToDatabase();
    
    const data = await request.json();
    const { content, walletAddress, messageType = 'text', replyTo } = data;
    
    if (!content || !walletAddress) {
      return NextResponse.json({ error: 'Content and wallet address required' }, { status: 400 });
    }
    
    if (content.trim().length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }
    
    if (content.length > 1000) {
      return NextResponse.json({ error: 'Message too long (max 1000 characters)' }, { status: 400 });
    }
    
    // Verify user is member of this clan
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (!user || !user.clan || user.clan.toString() !== params.clanId) {
      return NextResponse.json({ error: 'Unauthorized: Not a member of this clan' }, { status: 403 });
    }
    
    // Verify clan exists
    const clan = await Clan.findById(params.clanId);
    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 });
    }
    
    // Create message
    const message = new Message({
      content: content.trim(),
      sender: user._id,
      clan: params.clanId,
      messageType,
      replyTo: replyTo || undefined
    });
    
    await message.save();
    
    // Populate sender details for response
    await message.populate('sender', 'displayName username walletAddress avatar');
    if (replyTo) {
      await message.populate('replyTo');
    }
    
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Error sending clan message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}