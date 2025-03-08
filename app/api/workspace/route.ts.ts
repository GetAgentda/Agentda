import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { addDays } from 'date-fns';

export async function POST() {
  try {
    const workspaceId = nanoid(21);
    const expiresAt = addDays(new Date(), 15);

    const { error } = await supabase
      .from('workspaces')
      .insert([
        {
          id: workspaceId,
          expires_at: expiresAt.toISOString(),
        },
      ]);

    if (error) {
      console.error('Error creating workspace:', error);
      return NextResponse.json(
        { error: 'Failed to create workspace' },
        { status: 500 }
      );
    }

    return NextResponse.json({ workspaceId }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error creating workspace:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}