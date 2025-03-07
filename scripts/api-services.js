// File: src/services/meetingService.js
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion 
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const functions = getFunctions(app);

// Create a new meeting
export const createMeeting = async (meetingData) => {
  try {
    const createMeetingFunction = httpsCallable(functions, 'createMeeting');
    const result = await createMeetingFunction(meetingData);
    return result.data.meetingId;
  } catch (error) {
    console.error('Error creating meeting:', error);
    throw error;
  }
};

// Get meeting data
export const getMeeting = async (meetingId) => {
  try {
    const getMeetingFunction = httpsCallable(functions, 'getMeeting');
    const result = await getMeetingFunction({ meetingId });
    return result.data;
  } catch (error) {
    console.error('Error getting meeting:', error);
    throw error;
  }
};

// Get reference to meeting document (for live updates)
export const getMeetingRef = (meetingId) => {
  return doc(db, 'meetings', meetingId);
};

// Update meeting
export const updateMeeting = async (meetingId, updates) => {
  try {
    const updateMeetingFunction = httpsCallable(functions, 'updateMeeting');
    await updateMeetingFunction({ meetingId, updates });
  } catch (error) {
    console.error('Error updating meeting:', error);
    throw error;
  }
};

// Update participant status
export const updateMeetingParticipant = async (meetingId, email, updates) => {
  try {
    const updateParticipantFunction = httpsCallable(functions, 'updateParticipant');
    await updateParticipantFunction({ meetingId, email, updates });
  } catch (error) {
    console.error('Error updating participant:', error);
    throw error;
  }
};

// Add an agenda item
export const submitAgendaItem = async (meetingId, item) => {
  try {
    const meetingRef = doc(db, 'meetings', meetingId);
    await updateDoc(meetingRef, {
      agenda: arrayUnion(item)
    });
  } catch (error) {
    console.error('Error adding agenda item:', error);
    throw error;
  }
};

// Update an agenda item
export const updateAgendaItem = async (meetingId, itemId, updates) => {
  try {
    const meetingRef = doc(db, 'meetings', meetingId);
    const meetingDoc = await getDoc(meetingRef);
    
    if (!meetingDoc.exists()) {
      throw new Error('Meeting not found');
    }
    
    const meetingData = meetingDoc.data();
    const agenda = meetingData.agenda || [];
    
    // Find and update the specific agenda item
    const updatedAgenda = agenda.map(item => {
      if (item.id === itemId) {
        return { ...item, ...updates };
      }
      return item;
    });
    
    await updateDoc(meetingRef, { agenda: updatedAgenda });
  } catch (error) {
    console.error('Error updating agenda item:', error);
    throw error;
  }
};

// Add a comment to an agenda item
export const addCommentToAgendaItem = async (meetingId, itemId, comment) => {
  try {
    const meetingRef = doc(db, 'meetings', meetingId);
    const meetingDoc = await getDoc(meetingRef);
    
    if (!meetingDoc.exists()) {
      throw new Error('Meeting not found');
    }
    
    const meetingData = meetingDoc.data();
    const agenda = meetingData.agenda || [];
    
    // Find the specific agenda item and add the comment
    const updatedAgenda = agenda.map(item => {
      if (item.id === itemId) {
        const comments = item.comments || [];
        return { 
          ...item, 
          comments: [...comments, comment]
        };
      }
      return item;
    });
    
    await updateDoc(meetingRef, { agenda: updatedAgenda });
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

// Trigger AI agenda generation
export const triggerAIAgendaGeneration = async (meetingId) => {
  try {
    const generateAgendaFunction = httpsCallable(functions, 'generateAgenda');
    const result = await generateAgendaFunction({ meetingId });
    return result.data;
  } catch (error) {
    console.error('Error generating agenda:', error);
    throw error;
  }
};

// Generate post-meeting summary
export const generatePostMeetingSummary = async (meetingId) => {
  try {
    const generateSummaryFunction = httpsCallable(functions, 'generatePostMeetingSummary');
    const result = await generateSummaryFunction({ meetingId });
    return result.data;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
};

// File: src/services/calendarService.js
// This service will handle integration with Google Calendar, Microsoft Outlook, etc.

// Google Calendar integration
export const getGoogleCalendarEvents = async (authToken, timeMin, timeMax) => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch Google Calendar events');
    }
    
    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    throw error;
  }
};

export const createGoogleCalendarEvent = async (authToken, eventData) => {
  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to create Google Calendar event');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw error;
  }
};

// Microsoft Graph API integration for Outlook/Teams
export const getMicrosoftCalendarEvents = async (authToken, startDateTime, endDateTime) => {
  try {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${startDateTime}&endDateTime=${endDateTime}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch Microsoft Calendar events');
    }
    
    const data = await response.json();
    return data.value;
  } catch (error) {
    console.error('Error fetching Microsoft Calendar events:', error);
    throw error;
  }
};

export const createMicrosoftCalendarEvent = async (authToken, eventData) => {
  try {
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/me/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to create Microsoft Calendar event');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating Microsoft Calendar event:', error);
    throw error;
  }
};

// Generic calendar integration adapter
export const CalendarAdapter = {
  google: {
    getEvents: getGoogleCalendarEvents,
    createEvent: createGoogleCalendarEvent,
    formatEventForAgentda: (googleEvent) => ({
      title: googleEvent.summary,
      description: googleEvent.description,
      date: googleEvent.start.date || googleEvent.start.dateTime.split('T')[0],
      time: googleEvent.start.dateTime ? googleEvent.start.dateTime.split('T')[1].substring(0, 5) : '00:00',
      participants: googleEvent.attendees?.map(a => ({ email: a.email, hasResponded: false })) || []
    })
  },
  microsoft: {
    getEvents: getMicrosoftCalendarEvents,
    createEvent: createMicrosoftCalendarEvent,
    formatEventForAgentda: (msEvent) => ({
      title: msEvent.subject,
      description: msEvent.bodyPreview,
      date: msEvent.start.dateTime.split('T')[0],
      time: msEvent.start.dateTime.split('T')[1].substring(0, 5),
      participants: msEvent.attendees?.map(a => ({ email: a.emailAddress.address, hasResponded: false })) || []
    })
  }
};

// Export a meeting to calendar
export const exportMeetingToCalendar = async (meeting, calendarType, authToken) => {
  try {
    // Format meeting data for the specified calendar type
    let eventData;
    
    switch (calendarType) {
      case 'google':
        eventData = {
          summary: meeting.title,
          description: `${meeting.description}\n\nAgenda:\n${meeting.agenda?.map(item => `- ${item.text}`).join('\n')}`,
          start: {
            dateTime: `${meeting.date}T${meeting.time}:00`,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: `${meeting.date}T${getEndTime(meeting.time, meeting.suggestedDuration || 30)}:00`,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          attendees: meeting.participants?.map(p => ({ email: p.email })) || []
        };
        return await createGoogleCalendarEvent(authToken, eventData);
        
      case 'microsoft':
        eventData = {
          subject: meeting.title,
          body: {
            contentType: 'text',
            content: `${meeting.description}\n\nAgenda:\n${meeting.agenda?.map(item => `- ${item.text}`).join('\n')}`
          },
          start: {
            dateTime: `${meeting.date}T${meeting.time}:00`,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: `${meeting.date}T${getEndTime(meeting.time, meeting.suggestedDuration || 30)}:00`,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          attendees: meeting.participants?.map(p => ({
            emailAddress: { address: p.email },
            type: 'required'
          })) || []
        };
        return await createMicrosoftCalendarEvent(authToken, eventData);
        
      default:
        throw new Error(`Unsupported calendar type: ${calendarType}`);
    }
  } catch (error) {
    console.error('Error exporting meeting to calendar:', error);
    throw error;
  }
};

// Helper function to calculate end time
function getEndTime(startTime, durationMinutes) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  return `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
}

// File: src/services/authService.js
// This service will handle authentication for calendar integrations

// Google OAuth
export const initiateGoogleAuth = () => {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const redirectUri = `${window.location.origin}/auth/google/callback`;
  const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar');
  
  const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
  
  // Open auth window
  window.location.href = authUrl;
};

export const handleGoogleAuthCallback = async (code) => {
  try {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.REACT_APP_GOOGLE_CLIENT_SECRET;
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to retrieve Google token');
    }
    
    const tokenData = await tokenResponse.json();
    
    // Store tokens securely (this is a simplified example)
    localStorage.setItem('google_access_token', tokenData.access_token);
    localStorage.setItem('google_refresh_token', tokenData.refresh_token);
    localStorage.setItem('google_token_expiry', Date.now() + tokenData.expires_in * 1000);
    
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    };
  } catch (error) {
    console.error('Error handling Google auth callback:', error);
    throw error;
  }
};

// Microsoft OAuth
export const initiateMicrosoftAuth = () => {
  const clientId = process.env.REACT_APP_MICROSOFT_CLIENT_ID;
  const redirectUri = `${window.location.origin}/auth/microsoft/callback`;
  const scope = encodeURIComponent('Calendars.ReadWrite');
  
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
  
  // Open auth window
  window.location.href = authUrl;
};

export const handleMicrosoftAuthCallback = async (code) => {
  try {
    const clientId = process.env.REACT_APP_MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.REACT_APP_MICROSOFT_CLIENT_SECRET;
    const redirectUri = `${window.location.origin}/auth/microsoft/callback`;
    
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to retrieve Microsoft token');
    }
    
    const tokenData = await tokenResponse.json();
    
    // Store tokens securely (this is a simplified example)
    localStorage.setItem('microsoft_access_token', tokenData.access_token);
    localStorage.setItem('microsoft_refresh_token', tokenData.refresh_token);
    localStorage.setItem('microsoft_token_expiry', Date.now() + tokenData.expires_in * 1000);
    
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    };
  } catch (error) {
    console.error('Error handling Microsoft auth callback:', error);
    throw error;
  }
};

// Check token validity and refresh if needed
export const getValidToken = async (provider) => {
  try {
    const accessToken = localStorage.getItem(`${provider}_access_token`);
    const refreshToken = localStorage.getItem(`${provider}_refresh_token`);
    const tokenExpiry = localStorage.getItem(`${provider}_token_expiry`);
    
    if (!accessToken || !refreshToken) {
      return null;
    }
    
    // If token is still valid, return it
    if (tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
      return accessToken;
    }
    
    // Otherwise, refresh the token
    let refreshUrl, clientId, clientSecret;
    
    if (provider === 'google') {
      refreshUrl = 'https://oauth2.googleapis.com/token';
      clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      clientSecret = process.env.REACT_APP_GOOGLE_CLIENT_SECRET;
    } else if (provider === 'microsoft') {
      refreshUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      clientId = process.env.REACT_APP_MICROSOFT_CLIENT_ID;
      clientSecret = process.env.REACT_APP_MICROSOFT_CLIENT_SECRET;
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to refresh ${provider} token`);
    }
    
    const tokenData = await response.json();
    
    // Update stored tokens
    localStorage.setItem(`${provider}_access_token`, tokenData.access_token);
    localStorage.setItem(`${provider}_token_expiry`, Date.now() + tokenData.expires_in * 1000);
    
    return tokenData.access_token;
  } catch (error) {
    console.error(`Error getting valid ${provider} token:`, error);
    
    // Clear token data on error
    localStorage.removeItem(`${provider}_access_token`);
    localStorage.removeItem(`${provider}_refresh_token`);
    localStorage.removeItem(`${provider}_token_expiry`);
    
    return null;
  }
};
