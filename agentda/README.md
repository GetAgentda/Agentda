# Agentda - AI-Powered Meeting Management Platform

Agentda is a modern, collaborative meeting management platform that leverages AI to make meetings more productive and efficient. It provides real-time collaboration, smart agenda building, and automated meeting summaries.

## 🌟 Features

### 1. Smart Meeting Management
- **AI-Assisted Agenda Creation**: Generate and optimize meeting agendas based on goals and topics
- **Real-time Collaboration**: Multiple participants can edit and view changes simultaneously
- **Voice-to-Text Input**: Hands-free creation of agenda items and notes
- **Drag-and-Drop Organization**: Easily reorder agenda items

### 2. Meeting Workspace
- **Real-time Chat**: Built-in team chat for pre-meeting discussions
- **File Attachments**: Support for PDFs, Excel files, and other documents
- **Action Item Tracking**: Assign and monitor tasks with status updates
- **Decision Logger**: Record and track important decisions made during meetings

### 3. AI Features
- **Smart Suggestions**: AI-powered agenda item recommendations
- **Automated Summaries**: Generate concise meeting summaries
- **Action Item Extraction**: Automatically identify and extract action items
- **Meeting Analytics**: Track meeting effectiveness and participation

### 4. Role-Based Access
- **Admin Controls**: Full control over organization settings
- **Member Access**: Collaborate and participate in meetings
- **Guest Access**: Limited view-only access for external participants

## 🚀 Getting Started

### Prerequisites
- Node.js v18 or later
- npm or yarn
- A Firebase account
- An OpenAI API key
- A Vercel account (for deployment)

### Local Development Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/agentda.git
   cd agentda
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file with the following:
   ```env
   # NextAuth.js
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Firebase Admin
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=your_client_email
   FIREBASE_PRIVATE_KEY=your_private_key

   # Firebase Client
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

   # OpenAI
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication (Google provider)
   - Enable Firestore
   - Enable Storage

2. **Deploy Firebase Rules**
   ```bash
   firebase login
   firebase init
   firebase deploy --only firestore:rules
   firebase deploy --only storage:rules
   ```

3. **Set Up Authentication**
   - Configure Google Sign-In in Firebase Console
   - Add authorized domains
   - Update security rules

### Production Deployment

1. **Deploy to Vercel**
   ```bash
   vercel
   ```

2. **Configure Environment Variables**
   - Add all environment variables in Vercel dashboard
   - Enable Production and Preview environments

3. **Final Steps**
   - Update `NEXTAUTH_URL` to production URL
   - Configure Firebase security rules
   - Test all functionality in production

## 🔒 Security Features

### Firebase Security Rules
- Role-based access control
- Data validation
- User authentication checks
- File upload restrictions

### Storage Rules
- Size limits on uploads
- File type restrictions
- User-specific access controls

## 🛠 Technical Stack

- **Frontend**: Next.js 13+, React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore, Storage, Authentication)
- **AI Integration**: OpenAI GPT-4
- **Real-time**: Firebase Realtime Database
- **Authentication**: NextAuth.js with Google provider
- **Deployment**: Vercel

## 📱 Component Structure

```
src/
├── app/                 # Next.js 13 app directory
├── components/         
│   ├── agenda/         # Agenda-related components
│   ├── meetings/       # Meeting components
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configs
└── types/              # TypeScript type definitions
```

## 🔄 State Management

- **Firebase Realtime**: Meeting data, messages, files
- **React State**: UI components and forms
- **Server State**: User sessions and authentication

## 📈 Performance Optimization

- Server-side rendering where appropriate
- Client-side data caching
- Optimized real-time updates
- Lazy loading of components

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

## 📚 API Documentation

### AI Endpoints
- `/api/ai/agenda`: Generate agenda suggestions
- `/api/ai/summarize`: Generate meeting summaries

### Meeting Endpoints
- `/api/meetings`: CRUD operations for meetings
- `/api/meetings/[id]/participants`: Manage participants

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Firebase team for real-time capabilities
- Next.js team for the framework
- All contributors and users

## 🆘 Support

For support, please:
1. Check the documentation
2. Search existing issues
3. Create a new issue if needed
4. Contact support team

---

Built with ❤️ by [Your Team Name] 