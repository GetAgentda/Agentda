# Deployment Guide

This guide will walk you through deploying the Agentda application to Firebase and Vercel.

## Prerequisites

1. Node.js (v18 or later)
2. Firebase CLI (`npm install -g firebase-tools`)
3. Vercel CLI (`npm install -g vercel`)
4. Git

## Firebase Setup

1. **Install Firebase CLI and Login**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Initialize Firebase Project**
   ```bash
   firebase init
   ```
   Select the following options:
   - Firestore
   - Storage
   - Hosting (optional, if you want to host static files)

3. **Configure Firebase Environment**
   Create a `.env.local` file in the project root:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Deploy Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Deploy Storage Rules**
   ```bash
   firebase deploy --only storage:rules
   ```

## Vercel Deployment

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build the Application**
   ```bash
   npm run build
   ```

3. **Deploy to Vercel**
   ```bash
   vercel
   ```
   Follow the prompts to:
   - Link to your Vercel account
   - Select the project scope
   - Configure project settings

4. **Configure Environment Variables**
   In the Vercel dashboard:
   - Go to Project Settings > Environment Variables
   - Add all variables from `.env.local`

5. **Configure Build Settings**
   In the Vercel dashboard:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

## Post-Deployment Steps

1. **Verify Firebase Rules**
   - Test authentication flows
   - Verify data access restrictions
   - Check file upload permissions

2. **Test Application Features**
   - User authentication
   - Meeting creation and management
   - Real-time updates
   - File uploads
   - Chat functionality
   - Action items and decisions

3. **Monitor Performance**
   - Check Vercel Analytics
   - Monitor Firebase usage
   - Set up error tracking

## Security Considerations

1. **Firebase Security Rules**
   - Review and test all security rules
   - Ensure proper access control
   - Monitor rule violations

2. **Environment Variables**
   - Keep sensitive keys secure
   - Use different keys for development/production
   - Regularly rotate API keys

3. **Authentication**
   - Enable appropriate auth providers
   - Configure OAuth settings
   - Set up email verification

## Maintenance

1. **Regular Updates**
   ```bash
   # Update dependencies
   npm update
   
   # Deploy changes
   vercel --prod
   ```

2. **Backup Strategy**
   - Regular Firestore backups
   - Storage file backups
   - User data exports

3. **Monitoring**
   - Set up Firebase Analytics
   - Configure error reporting
   - Monitor resource usage

## Troubleshooting

1. **Common Issues**
   - Environment variable mismatches
   - Firebase rules conflicts
   - Build failures
   - Deployment errors

2. **Debugging Tools**
   - Firebase Console
   - Vercel Deployment Logs
   - Browser DevTools
   - Network monitoring

## Support

For additional support:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs) 