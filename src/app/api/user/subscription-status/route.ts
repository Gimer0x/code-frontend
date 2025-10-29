import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // For now, return a mock response to avoid 404 errors
    // This will be replaced with actual user data once authentication is working
    return NextResponse.json({
      success: true,
      hasActiveSubscription: false,
      isPremium: false,
      subscriptionStatus: 'INACTIVE',
      subscriptionPlan: 'FREE'
    });

  } catch (error) {
    return NextResponse.json({
      success: true,
      hasActiveSubscription: false,
      isPremium: false,
      subscriptionStatus: 'INACTIVE',
      subscriptionPlan: 'FREE'
    });
  }
}