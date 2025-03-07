# Agentda Project Structure

Here's the file structure for the GitHub repository:

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

This structure follows a standard static site approach that Vercel can easily deploy. Each HTML page represents a step in the workflow, with corresponding JavaScript files for functionality.
