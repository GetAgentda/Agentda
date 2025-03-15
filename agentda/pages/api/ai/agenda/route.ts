import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { AgendaItem } from '@/types';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validate request body schema
const requestSchema = z.object({
  goals: z.string().min(1),
  existingItems: z.array(z.object({
    title: z.string().min(1),
    duration: z.number().optional(),
  })).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const headersList = headers();
    const token = await getToken({ 
      req: {
        headers: Object.fromEntries(headersList.entries()),
        cookies: Object.fromEntries(
          request.cookies.getAll().map(c => [c.name, c.value])
        ),
      } as any
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Apply rate limiting
    const identifier = token.sub || token.email || 'anonymous';
    const { success, limit, remaining } = await rateLimit(identifier);
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
          }
        }
      );
    }

    // Validate request body
    const body = await request.json();
    const validationResult = requestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { goals, existingItems } = validationResult.data;

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured');
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 503 }
      );
    }

    const prompt = `Given the following meeting goals and any existing agenda items, suggest an improved agenda structure with estimated durations. Each item should include a clear title, description, and duration in minutes.

Meeting Goals:
${goals}

${existingItems?.length ? `Existing Agenda Items:
${existingItems.map((item) => `- ${item.title} (${item.duration || 'unspecified'} minutes)`).join('\n')}` : ''}

Please provide suggestions in the following format:
1. Title: [title]
   Description: [description]
   Duration: [duration in minutes]
2. ...`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional meeting facilitator helping to structure effective meeting agendas.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const suggestions = completion.choices[0].message.content;
    const items = parseAgendaSuggestions(suggestions || '');

    return NextResponse.json(
      {
        items,
        estimatedDuration: items.reduce((total, item) => total + (item.duration || 0), 0),
      },
      {
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        }
      }
    );
  } catch (error) {
    console.error('Error generating agenda suggestions:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: 'AI service error', message: error.message },
        { status: error.status || 500 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function parseAgendaSuggestions(text: string): Omit<AgendaItem, 'id' | 'createdAt' | 'updatedAt'>[] {
  const items: Omit<AgendaItem, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const itemRegex = /(\d+)\.\s+Title:\s+(.+?)\s+Description:\s+(.+?)\s+Duration:\s+(\d+)/gs;

  let match;
  let order = 0;
  while ((match = itemRegex.exec(text)) !== null) {
    items.push({
      title: match[2].trim(),
      description: match[3].trim(),
      duration: parseInt(match[4]),
      order: order++,
      status: 'pending',
    });
  }

  return items;
} 