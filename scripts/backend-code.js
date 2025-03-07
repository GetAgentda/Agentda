// File: functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { OpenAIApi, Configuration } = require('openai');
const cors = require('cors')({ origin: true });
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Create Meeting
exports.createMeeting = functions.https.onCall(async (data, context) => {
  try {
    // Generate unique meeting ID
    const meetingId = uuidv4().substring(0, 8);
    
    // Create meeting document
    const meetingRef = db.collection('meetings').doc(meetingId);
    await meetingRef.set({
      ...data,
      id: meetingId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'draft',
      meetingNecessary: true
    });
    
    // Send invitation emails if emails are provided
    if (data.participants && data.participants.length > 0) {
      await sendInvitationEmails(meetingId, data);
    }
    
    return { success: true, meetingId };
  } catch (error) {
    console.error('Error creating meeting:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create meeting', error);
  }
});

// Get Meeting
exports.getMeeting = functions.https.onCall(async (data, context) => {
  try {
    const { meetingId } = data;
    const meetingDoc = await db.collection('meetings').doc(meetingId).get();
    
    if (!meetingDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Meeting not found');
    }
    
    return meetingDoc.data();
  } catch (error) {
    console.error('Error getting meeting:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get meeting', error);
  }
});

// Update Meeting
exports.updateMeeting = functions.https.onCall(async (data, context) => {
  try {
    const { meetingId, updates } = data;
    const meetingRef = db.collection('meetings').doc(meetingId);
    
    await meetingRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating meeting:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update meeting', error);
  }
});

// Update Participant Status
exports.updateParticipant = functions.https.onCall(async (data, context) => {
  try {
    const { meetingId, email, updates } = data;
    const meetingRef = db.collection('meetings').doc(meetingId);
    
    // Get current meeting data
    const meetingDoc = await meetingRef.get();
    if (!meetingDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Meeting not found');
    }
    
    const meetingData = meetingDoc.data();
    const participants = meetingData.participants || [];
    
    // Find and update participant
    const updatedParticipants = participants.map(p => {
      if (p.email.toLowerCase() === email.toLowerCase()) {
        return { ...p, ...updates };
      }
      return p;
    });
    
    // Update meeting document
    await meetingRef.update({
      participants: updatedParticipants,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating participant:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update participant', error);
  }
});

// AI Agenda Generation
exports.generateAgenda = functions.https.onCall(async (data, context) => {
  try {
    const { meetingId } = data;
    const meetingRef = db.collection('meetings').doc(meetingId);
    
    // Get current meeting data
    const meetingDoc = await meetingRef.get();
    if (!meetingDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Meeting not found');
    }
    
    const meetingData = meetingDoc.data();
    
    // Prepare context for AI
    const promptData = {
      title: meetingData.title,
      description: meetingData.description,
      date: meetingData.date,
      time: meetingData.time,
      participantCount: meetingData.participants?.length || 0,
      existingAgendaItems: meetingData.agenda || [],
    };
    
    // Call OpenAI API
    const aiResult = await generateAIAgenda(promptData);
    
    // Update meeting with AI results
    await meetingRef.update({
      agenda: aiResult.agenda,
      meetingNecessary: aiResult.meetingNecessary,
      meetingRecommendation: aiResult.recommendation,
      suggestedDuration: aiResult.suggestedDuration,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      aiGenerated: true
    });
    
    return { 
      success: true,
      agenda: aiResult.agenda,
      meetingNecessary: aiResult.meetingNecessary,
      recommendation: aiResult.recommendation
    };
  } catch (error) {
    console.error('Error generating agenda:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate agenda', error);
  }
});

// Generate Post-Meeting Summary
exports.generatePostMeetingSummary = functions.https.onCall(async (data, context) => {
  try {
    const { meetingId } = data;
    const meetingRef = db.collection('meetings').doc(meetingId);
    
    // Get current meeting data
    const meetingDoc = await meetingRef.get();
    if (!meetingDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Meeting not found');
    }
    
    const meetingData = meetingDoc.data();
    
    // Prepare context for AI
    const promptData = {
      title: meetingData.title,
      description: meetingData.description,
      agenda: meetingData.agenda || [],
    };
    
    // Call OpenAI API for post-meeting summary
    const aiResult = await generatePostMeetingSummary(promptData);
    
    // Update meeting with AI results
    await meetingRef.update({
      actionItems: aiResult.actionItems,
      keyTakeaways: aiResult.keyTakeaways,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { 
      success: true,
      actionItems: aiResult.actionItems,
      keyTakeaways: aiResult.keyTakeaways
    };
  } catch (error) {
    console.error('Error generating post-meeting summary:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate summary', error);
  }
});

// Helper Functions
async function sendInvitationEmails(meetingId, meetingData) {
  // Create a nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  
  const meetingUrl = `${process.env.APP_URL}/meeting/${meetingId}`;
  
  // Send emails to all participants
  const emailPromises = meetingData.participants.map(participant => {
    const mailOptions = {
      from: `"Agentda" <${process.env.EMAIL_USER}>`,
      to: participant.email,
      subject: `Meeting Invitation: ${meetingData.title}`,
      html: `
        <h2>You've been invited to collaborate on a meeting agenda</h2>
        <p><strong>Meeting:</strong> ${meetingData.title}</p>
        <p><strong>Date:</strong> ${meetingData.date} at ${meetingData.time}</p>
        <p><strong>Description:</strong> ${meetingData.description || 'No description provided'}</p>
        <p>Please contribute to the meeting agenda by suggesting topics, providing feedback, and voting on items:</p>
        <p><a href="${meetingUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Open Meeting</a></p>
        <p>No login required - just click the link and start collaborating!</p>
      `
    };
    
    return transporter.sendMail(mailOptions);
  });
  
  await Promise.all(emailPromises);
}

async function generateAIAgenda(promptData) {
  const { title, description, existingAgendaItems } = promptData;
  
  // Format existing agenda items for the prompt
  const existingItemsText = existingAgendaItems.length > 0
    ? existingAgendaItems.map(item => `- ${item.text} (added by ${item.createdBy})`).join('\n')
    : 'No agenda items yet.';
  
  // Create the prompt for OpenAI
  const prompt = `
    Generate a comprehensive meeting agenda for the following meeting:
    
    Title: ${title}
    Description: ${description || 'No description provided'}
    
    Current agenda items suggested by participants:
    ${existingItemsText}
    
    Based on the meeting title, description, and any existing agenda items:
    
    1. Determine if a meeting is actually necessary or if the objectives could be achieved through other means.
    2. If a meeting is necessary, suggest a complete agenda with well-structured topics.
    3. If a meeting is NOT necessary, explain why and suggest alternatives.
    4. Suggest an appropriate meeting duration.
    
    Please format your response as JSON with the following structure:
    {
      "meetingNecessary": true/false,
      "recommendation": "explanation of your recommendation",
      "suggestedDuration": "recommended meeting length in minutes",
      "agenda": [
        {"text": "agenda item 1", "createdBy": "AI Assistant"},
        {"text": "agenda item 2", "createdBy": "AI Assistant"}
      ]
    }
  `;
  
  // Call OpenAI API
  const response = await openai.createCompletion({
    model: "gpt-3.5-turbo-instruct",
    prompt: prompt,
    max_tokens: 1000,
    temperature: 0.7,
  });
  
  try {
    // Parse the JSON response
    const responseText = response.data.choices[0].text.trim();
    
    // Handle potential parsing issues
    let jsonStart = responseText.indexOf('{');
    let jsonEnd = responseText.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Invalid JSON response from AI');
    }
    
    const jsonString = responseText.substring(jsonStart, jsonEnd);
    const result = JSON.parse(jsonString);
    
    // Add IDs to agenda items
    if (result.agenda) {
      result.agenda = result.agenda.map(item => ({
        ...item,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        votes: 0,
        comments: []
      }));
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    console.log('AI response:', response.data.choices[0].text);
    
    // Return a fallback response
    return {
      meetingNecessary: true,
      recommendation: "I recommend proceeding with the meeting based on the provided information.",
      suggestedDuration: "30",
      agenda: [
        {
          id: uuidv4(),
          text: "Discuss meeting objectives and goals",
          createdBy: "AI Assistant",
          createdAt: new Date().toISOString(),
          votes: 0,
          comments: []
        },
        {
          id: uuidv4(),
          text: "Review action items and next steps",
          createdBy: "AI Assistant",
          createdAt: new Date().toISOString(),
          votes: 0,
          comments: []
        }
      ]
    };
  }
}

async function generatePostMeetingSummary(promptData) {
  const { title, description, agenda } = promptData;
  
  // Format agenda items for the prompt
  const agendaText = agenda.length > 0
    ? agenda.map(item => `- ${item.text}`).join('\n')
    : 'No agenda items were recorded.';
  
  // Create the prompt for OpenAI
  const prompt = `
    Generate a post-meeting summary for the following meeting:
    
    Title: ${title}
    Description: ${description || 'No description provided'}
    
    Agenda items discussed:
    ${agendaText}
    
    Based on the meeting title, description, and agenda items, please:
    
    1. Generate likely action items that would have resulted from this meeting.
    2. Create a concise summary of key takeaways.
    
    Format your response as JSON with this structure:
    {
      "actionItems": "- Action item 1\\n- Action item 2\\n- Action item 3",
      "keyTakeaways": "Key insights and decisions from the meeting."
    }
  `;
  
  // Call OpenAI API
  const response = await openai.createCompletion({
    model: "gpt-3.5-turbo-instruct",
    prompt: prompt,
    max_tokens: 1000,
    temperature: 0.7,
  });
  
  try {
    // Parse the JSON response
    const responseText = response.data.choices[0].text.trim();
    
    // Handle potential parsing issues
    let jsonStart = responseText.indexOf('{');
    let jsonEnd = responseText.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Invalid JSON response from AI');
    }
    
    const jsonString = responseText.substring(jsonStart, jsonEnd);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing AI response:', error);
    console.log('AI response:', response.data.choices[0].text);
    
    // Return a fallback response
    return {
      actionItems: "- Follow up with team members on progress\n- Schedule next meeting\n- Share meeting notes with stakeholders",
      keyTakeaways: "The team discussed the main agenda items and agreed on next steps."
    };
  }
}

// File: functions/firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /meetings/{meetingId} {
      // Anyone can read meeting data
      allow read: if true;
      
      // Only cloud functions can create/update meetings
      allow create, update, delete: if false;
    }
  }
}