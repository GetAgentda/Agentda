# Agentda

Agentda is an AI-powered meeting planning and agenda collaboration tool that helps teams schedule more effective meetings with clear agendas, collaborative input, and meaningful outcomes.

## Features

- **Smart Meeting Scheduling**: Find optimal times that work for all participants
- **Collaborative Agenda Building**: Create and refine agendas together before the meeting
- **AI-Powered Suggestions**: Get intelligent recommendations for agenda items and meeting structure
- **Consensus Tracking**: Visualize team alignment on agenda topics
- **Action Item Capture**: Automatically track decisions and next steps

## Getting Started

### Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/agentda.git
cd agentda
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Deployment on Vercel

1. Push this repository to GitHub
2. Connect your GitHub repository to Vercel
3. Deploy with default settings

## Project Structure

```
agentda/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── styles/
│   │   ├── variables.css
│   │   └── global.css
│   ├── pages/
│   │   ├── HomePage.html
│   │   ├── MeetingSetupPage.html
│   │   ├── SchedulingPage.html
│   │   └── AgendaPage.html
│   ├── js/
│   │   ├── main.js
│   │   ├── meeting-setup.js
│   │   ├── scheduling.js
│   │   └── agenda.js
│   └── assets/
│       └── placeholder.svg
├── .gitignore
├── package.json
├── README.md
└── vercel.json
```

## Integrations

Agentda is designed to integrate with popular calendar and collaboration tools:

- Google Calendar
- Microsoft Outlook/Teams
- Slack
- Zoom

## Future Development

This project currently implements the frontend of Agentda. For a full production version, you'll need to add:

1. User authentication
2. Backend API for data persistence
3. Real-time collaboration functionality
4. Calendar integration

## License

This project is licensed under the MIT License - see the LICENSE file for details.
