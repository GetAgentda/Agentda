# Deployment Guide for Agentda

This guide will walk you through deploying Agentda using Vercel and Supabase.

## Prerequisites

- GitHub account
- Vercel account (free tier is fine)
- Supabase account (free tier is fine)

## Step 1: Set Up Supabase

1. Create a new Supabase project:
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Click "New Project"
   - Enter project name (e.g., "agentda")
   - Choose a strong database password
   - Select the region closest to your users
   - Click "Create project"

2. Set up the database schema:
   - Go to the SQL Editor in your Supabase dashboard
   - Copy the contents of `supabase/schema.sql`
   - Paste into the SQL Editor and run the script
   - Verify that the tables are created in the Table Editor

3. Configure Row Level Security (RLS):
   - The schema.sql file includes the necessary RLS policies
   - Verify in the Authentication > Policies section
   - Each table should show the policies we created

4. Enable Real-time:
   - Go to Database > Replication
   - Enable real-time for the `agenda_items` table

5. Get your API credentials:
   - Go to Project Settings > API
   - Copy the "Project URL" and "anon/public" key
   - You'll need these for the next steps

## Step 2: Deploy to Vercel

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/agentda.git
   git push -u origin main
   ```

2. Connect to Vercel:
   - Go to [https://vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Select "Next.js" as the framework preset

3. Configure environment variables:
   In the Vercel project settings, add these environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Deploy:
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

## Step 3: Test the Deployment

1. Visit your deployed app
2. Test creating a new workspace
3. Add some agenda items
4. Verify real-time updates work
5. Check that workspace URLs can be shared
6. Confirm 15-day expiration is working

## Production Considerations

### Monitoring

- Set up error monitoring in Vercel
- Monitor Supabase database usage
- Watch for failed API calls

### Performance

- Enable Vercel Analytics for performance monitoring
- Monitor Supabase query performance
- Check real-time connection stability

### Security

- Regularly rotate Supabase keys
- Monitor for suspicious activity
- Keep dependencies updated

### Backup

- Enable Supabase daily backups
- Regularly test backup restoration
- Document recovery procedures

## Troubleshooting Common Issues

1. **Real-time not working:**
   - Check Supabase real-time configuration
   - Verify WebSocket connections
   - Check browser console for errors

2. **Database errors:**
   - Verify RLS policies
   - Check database connection limits
   - Monitor for deadlocks

3. **Deployment failures:**
   - Check build logs in Vercel
   - Verify environment variables
   - Check for dependency conflicts

## Maintenance

1. Regular updates:
   ```bash
   npm update
   npm audit fix
   ```

2. Database maintenance:
   - Monitor table sizes
   - Clean up expired workspaces
   - Optimize indexes

3. Monitoring setup:
   - Set up Vercel alerts
   - Configure Supabase monitoring
   - Set up uptime monitoring

## Custom Domain Setup (Optional)

1. Add your domain in Vercel:
   - Go to Project Settings > Domains
   - Add your domain
   - Follow DNS configuration instructions

2. Update environment variables:
   ```
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

3. Update deployment:
   - Redeploy after domain changes
   - Test all features on new domain

## Support

For issues with:
- Vercel: [Vercel Support](https://vercel.com/support)
- Supabase: [Supabase Support](https://supabase.com/support)
- Code issues: Open a GitHub issue