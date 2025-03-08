# Agentda MVP

Agentda is an AI-powered pre-meeting collaboration platform that uses serverless architecture for easy deployment via Vercel. Instead of traditional user registration, each workspace is accessible via a unique URL that expires after 15 days.

## Quick Start

1. Clone this repository
```bash
git clone https://github.com/yourusername/agentda.git
cd agentda
```

2. Install dependencies
```bash
npm install
```

3. Set up Supabase:
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the database setup SQL (provided in `supabase/schema.sql`)
   - Copy your project URL and anon key

4. Set up environment variables:
```bash
cp .env.example .env.local
```
Then fill in your Supabase credentials in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

5. Run development server:
```bash
npm run dev
```

6. Deploy to Vercel:
```bash
vercel deploy
```

## Features

- **URL-based Workspaces**: No login required
- **Real-time Collaboration**: Multiple users can edit agendas simultaneously
- **15-day Retention**: Workspaces automatically expire after 15 days
- **Clean UI**: Minimalist interface focused on productivity

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## Project Structure

```
agentda/
├── app/                    # Next.js app directory
├── components/            # React components
├── lib/                   # Utility functions and config
├── hooks/                # Custom React hooks
├── public/               # Static assets
├── types/                # TypeScript definitions
└── supabase/             # Database schema and config
```

## Environment Variables

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key

## Database Setup

1. Create a new Supabase project
2. Navigate to the SQL editor
3. Run the schema setup script from `supabase/schema.sql`
4. Enable real-time functionality for the `agenda_items` table

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run type checking
npm run type-check

# Run linting
npm run lint
```

## Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## API Routes

- `POST /api/workspace` - Create new workspace
- `GET /api/workspace/[id]` - Get workspace details
- `POST /api/workspace/[id]/agenda` - Create agenda item
- `PUT /api/workspace/[id]/agenda/[itemId]` - Update agenda item
- `DELETE /api/workspace/[id]/agenda/[itemId]` - Delete agenda item

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details