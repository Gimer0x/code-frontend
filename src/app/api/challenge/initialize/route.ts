import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { lessonId, userId } = body;

    if (!lessonId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // For development, allow requests without session if userId is provided
    if (!session?.user?.id && !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, just return success
    // In the future, this would initialize a student's project for the lesson
    return NextResponse.json({
      success: true,
      message: 'Challenge initialized successfully',
      lessonId,
      userId
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to initialize challenge'
    }, { status: 500 });
  }
}