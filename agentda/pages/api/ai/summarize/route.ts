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
  item: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
  }),
  notes: z.string().min(1),
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

    const { item, notes } = validationResult.data;

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured');
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 503 }
      );
    }

    const prompt = `Given the following agenda item and discussion notes, provide a concise summary and extract key action items.

Agenda Item: ${item.title}
Description: ${item.description || 'N/A'}
Discussion Notes:
${notes}

Please provide:
1. A brief summary of the discussion
2. A list of action items in the format:
   - [action item] (assigned to: [name])`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional meeting facilitator helping to summarize discussions and identify action items.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    const { summary, actionItems } = parseSummaryResponse(response || '');

    return NextResponse.json(
      { summary, actionItems },
      {
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        }
      }
    );
  } catch (error) {
    console.error('Error generating summary:', error);
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

function parseSummaryResponse(text: string): { summary: string; actionItems: string[] } {
  const parts = text.split(/\d+\./g).filter(Boolean);
  
  if (parts.length < 2) {
    return {
      summary: text.trim(),
      actionItems: [],
    };
  }

  const summary = parts[0].trim();
  const actionItemsText = parts[1].trim();
  const actionItems = actionItemsText
    .split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(line => line.trim().substring(1).trim());

  return {
    summary,
    actionItems,
  };
} 