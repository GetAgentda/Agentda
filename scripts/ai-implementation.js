// File: functions/aiService.js
const { OpenAI } = require('openai');
const admin = require('firebase-admin');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Firestore reference
const db = admin.firestore();

/**
 * Generate initial meeting agenda
 * @param {string} meetingId - The meeting ID
 * @returns {Promise<Object>} The generated agenda and recommendations
 */
exports.generateAgenda = async (meetingId) => {
  try {
    // Get meeting data
    const meetingDoc = await db.collection('meetings').doc(meetingId).get();
    if (!meetingDoc.exists) {
      throw new Error('Meeting not found');
    }
    
    const meetingData = meetingDoc.data();
    
    // Get previous meetings if any
    const previousMeetings = await getPreviousMeetingsData(meetingData);
    
    // Construct the prompt
    const prompt = constructAgendaGenerationPrompt(meetingData, previousMeetings);
    
    // Call AI model
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You are an expert meeting facilitator helping to create effective agendas." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    
    // Parse the response
    const responseContent = response.choices[0].message.content;
    const result = JSON.parse(responseContent);
    
    // Add IDs and metadata to agenda items
    if (result.agenda) {
      result.agenda = result.agenda.map(item => ({
        ...item,
        id: generateId(),
        createdBy: 'AI Assistant',
        createdAt: new Date().toISOString(),
        votes: 0,
        comments: []
      }));
    }
    
    return result;
  } catch (error) {
    console.error('Error generating agenda:', error);
    throw error;
  }
};

/**
 * Refine agenda based on participant input
 * @param {string} meetingId - The meeting ID
 * @returns {Promise<Object>} The refined agenda
 */
exports.refineAgenda = async (meetingId) => {
  try {
    // Get meeting data with current agenda
    const meetingDoc = await db.collection('meetings').doc(meetingId).get();
    if (!meetingDoc.exists) {
      throw new Error('Meeting not found');
    }
    
    const meetingData = meetingDoc.data();
    
    // Construct the prompt
    const prompt = constructAgendaRefinementPrompt(meetingData);
    
    // Call AI model
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You are an expert meeting facilitator helping to refine meeting agendas." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    
    // Parse the response
    const responseContent = response.choices[0].message.content;
    const result = JSON.parse(responseContent);
    
    // Preserve item IDs and metadata where possible
    if (result.agenda) {
      result.agenda = mergeWithOriginalAgenda(result.agenda, meetingData.agenda || []);
    }
    
    return result;
  } catch (error) {
    console.error('Error refining agenda:', error);
    throw error;
  }
};

/**
 * Assess if a meeting is necessary
 * @param {string} meetingId - The meeting ID
 * @returns {Promise<Object>} Meeting necessity assessment
 */
exports.assessMeetingNecessity = async (meetingId) => {
  try {
    // Get meeting data
    const meetingDoc = await db.collection('meetings').doc(meetingId).get();
    if (!meetingDoc.exists) {
      throw new Error('Meeting not found');
    }
    
    const meetingData = meetingDoc.data();
    
    // Construct the prompt
    const prompt = constructNecessityAssessmentPrompt(meetingData);
    
    // Call AI model
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You are an expert meeting efficiency consultant." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    
    // Parse the response
    const responseContent = response.choices[0].message.content;
    return JSON.parse(responseContent);
  } catch (error) {
    console.error('Error assessing meeting necessity:', error);
    throw error;
  }
};

/**
 * Generate post-meeting summary
 * @param {string} meetingId - The meeting ID
 * @returns {Promise<Object>} The meeting summary
 */
exports.generateMeetingSummary = async (meetingId) => {
  try {
    // Get meeting data
    const meetingDoc = await db.collection('meetings').doc(meetingId).get();
    if (!meetingDoc.exists) {
      throw new Error('Meeting not found');
    }
    
    const meetingData = meetingDoc.data();
    
    // Construct the prompt
    const prompt = constructSummaryGenerationPrompt(meetingData);
    
    // Call AI model
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You are an expert meeting facilitator helping to summarize meeting outcomes." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });
    
    // Extract action items and key takeaways
    const summaryText = response.choices[0].message.content;
    const actionItems = extractActionItems(summaryText);
    const keyTakeaways = extractKeyTakeaways(summaryText);
    
    return {
      fullSummary: summaryText,
      actionItems,
      keyTakeaways
    };
  } catch (error) {
    console.error('Error generating meeting summary:', error);
    throw error;
  }
};

/**
 * Get consensus data for agenda items
 * @param {string} meetingId - The meeting ID
 * @returns {Promise<Array>} Consensus scores for agenda items
 */
exports.analyzeConsensus = async (meetingId) => {
  try {
    // Get meeting data
    const meetingDoc = await db.collection('meetings').doc(meetingId).get();
    if (!meetingDoc.exists) {
      throw new Error('Meeting not found');
    }
    
    const meetingData = meetingDoc.data();
    const agenda = meetingData.agenda || [];
    
    // Calculate consensus based on votes and comments
    const consensusData = agenda.map(item => {
      const votes = item.votes || 0;
      const comments = item.comments || [];
      const sentiment = analyzeSentiment(comments);
      
      // Simple consensus algorithm
      let consensusScore = 50; // Neutral starting point
      
      // Adjust based on votes
      consensusScore += Math.min(votes * 5, 30); // Max 30 points from votes
      
      // Adjust based on sentiment
      consensusScore += sentiment * 20; // Max 20 points from sentiment
      
      return {
        itemId: item.id,
        title: item.title || item.text,
        consensusScore: Math.min(Math.max(consensusScore, 0), 100), // Clamp between 0-100
        hasDisagreement: sentiment < 0
      };
    });
    
    return consensusData;
  } catch (error) {
    console.error('Error analyzing consensus:', error);
    throw error;
  }
};

// Helper functions

/**
 * Construct prompt for agenda generation
 */
function constructAgendaGenerationPrompt(meetingData, previousMeetings) {
  const participantCount = meetingData.participants?.length || 0;
  
  return `
    You are an expert meeting facilitator helping to create an effective agenda.

    MEETING CONTEXT:
    Title: ${meetingData.title}
    Description: ${meetingData.description || 'No description provided'}
    Date: ${meetingData.date}
    Time: ${meetingData.time}
    Duration: ${meetingData.duration || 60} minutes
    Participants: ${participantCount} people

    PREVIOUS RELATED MEETINGS:
    ${previousMeetings || 'No previous meeting data available'}

    Based on this information:
    1. Determine if this meeting is necessary or if the objectives could be achieved through other means.
    2. If a meeting is necessary, generate a structured agenda with appropriate time allocations.
    3. Categorize items as [Discussion], [Decision], or [Action] points.
    4. Suggest the optimal meeting duration.

    Format your response as JSON:
    {
      "meetingNecessary": true/false,
      "recommendation": "explanation with rationale",
      "suggestedDuration": minutes,
      "agenda": [
        {
          "category": "Discussion/Decision/Action",
          "title": "item title",
          "description": "brief description",
          "timeAllocation": minutes,
          "owner": "suggested item owner or null"
        }
      ]
    }
  `;
}

/**
 * Construct prompt for agenda refinement
 */
function constructAgendaRefinementPrompt(meetingData) {
  const currentAgenda = JSON.stringify(meetingData.agenda || []);
  
  // Extract participant suggestions from agenda items and comments
  const suggestions = extractParticipantSuggestions(meetingData);
  
  return `
    You are refining a meeting agenda based on participant input.

    CURRENT AGENDA:
    ${currentAgenda}

    PARTICIPANT SUGGESTIONS:
    ${JSON.stringify(suggestions)}

    MEETING CONSTRAINTS:
    Total Duration: ${meetingData.suggestedDuration || 60} minutes
    Required Topics: ${extractRequiredTopics(meetingData)}

    Please optimize this agenda by:
    1. Integrating valuable participant suggestions
    2. Removing redundant or low-value items
    3. Adjusting time allocations realistically
    4. Indicating consensus levels for each item
    5. Prioritizing items by importance and urgency

    Return the refined agenda as JSON:
    {
      "agenda": [
        {
          "category": "Discussion/Decision/Action",
          "title": "item title",
          "description": "brief description",
          "timeAllocation": minutes,
          "consensusLevel": 0-100,
          "priority": "High/Medium/Low",
          "owner": "item owner or null"
        }
      ],
      "totalTime": sum_of_allocations,
      "notIncluded": [
        {
          "title": "suggested but excluded item",
          "reason": "reason for exclusion"
        }
      ]
    }
  `;
}

/**
 * Construct prompt for meeting necessity assessment
 */
function constructNecessityAssessmentPrompt(meetingData) {
  const agendaItems = JSON.stringify(meetingData.agenda || []);
  
  // Extract participant feedback
  const participantFeedback = [];
  (meetingData.participants || []).forEach(participant => {
    const feedbackItems = [];
    
    // Check if participant has commented on agenda items
    (meetingData.agenda || []).forEach(item => {
      (item.comments || []).forEach(comment => {
        if (comment.createdBy === participant.email) {
          feedbackItems.push(`Comment on "${item.title || item.text}": ${comment.text}`);
        }
      });
    });
    
    if (feedbackItems.length > 0) {
      participantFeedback.push({
        name: participant.email,
        feedback: feedbackItems
      });
    } else {
      participantFeedback.push({
        name: participant.email,
        feedback: participant.hasResponded ? "Viewed agenda but no comments" : "Has not responded"
      });
    }
  });
  
  return `
    Evaluate whether this meeting is necessary based on the following information:

    MEETING CONTEXT:
    Title: ${meetingData.title}
    Description: ${meetingData.description || 'No description provided'}
    Current Agenda Items: ${agendaItems}
    Participant Feedback: ${JSON.stringify(participantFeedback)}

    Determine if this meeting should proceed by analyzing:
    1. Whether there are decisions that require synchronous discussion
    2. If there's sufficient preparation or information for a productive meeting
    3. Whether the agenda items could be handled asynchronously
    4. The level of agreement already showing in participant feedback

    Provide your assessment as JSON:
    {
      "meetingNecessary": true/false,
      "recommendation": "detailed explanation with specific rationale",
      "alternativeSuggestion": "if meeting is unnecessary, suggest alternative approach",
      "keyConsensusPoints": ["list of items with clear agreement"],
      "keyDecisionPoints": ["list of items requiring discussion"]
    }
  `;
}

/**
 * Construct prompt for summary generation
 */
function constructSummaryGenerationPrompt(meetingData) {
  const originalAgenda = JSON.stringify(meetingData.agenda || []);
  
  // In a real implementation, we'd have actual meeting notes
  // Since this is post-meeting without live transcription, 
  // we're assuming user input has been collected elsewhere
  const meetingNotes = meetingData.meetingNotes || 'No meeting notes provided';
  
  return `
    Generate a summary of meeting outcomes based on the agenda and participant contributions.

    ORIGINAL AGENDA:
    ${originalAgenda}

    MEETING OUTCOMES:
    ${meetingNotes}

    Create a comprehensive meeting summary with:
    1. Key decisions made
    2. Action items with owners and deadlines
    3. Main discussion points and conclusions
    4. Unresolved issues requiring follow-up
    5. Links to relevant documents or resources

    Format as markdown with clear sections for decisions, actions, and discussion points.
  `;
}

/**
 * Get data from previous related meetings
 */
async function getPreviousMeetingsData(currentMeeting) {
  try {
    // Find meetings with similar titles
    const titleWords = currentMeeting.title.toLowerCase().split(/\s+/);
    const significantWords = titleWords.filter(word => word.length > 3);
    
    if (significantWords.length === 0) return null;
    
    // Query for similar meetings
    const meetingsRef = db.collection('meetings');
    const query = meetingsRef
      .where('status', '==', 'completed')
      .orderBy('date', 'desc')
      .limit(3);
    
    const querySnapshot = await query.get();
    if (querySnapshot.empty) return null;
    
    // Extract relevant data from previous meetings
    let previousData = '';
    
    querySnapshot.forEach(doc => {
      const meeting = doc.data();
      const meetingTitle = meeting.title.toLowerCase();
      
      // Check if this meeting is related
      const isRelated = significantWords.some(word => meetingTitle.includes(word));
      
      if (isRelated && meeting.id !== currentMeeting.id) {
        previousData += `Meeting: ${meeting.title} (${meeting.date})\n`;
        
        if (meeting.agenda && meeting.agenda.length > 0) {
          previousData += 'Agenda items:\n';
          meeting.agenda.forEach(item => {
            previousData += `- ${item.title || item.text}\n`;
          });
        }
        
        if (meeting.actionItems) {
          previousData += 'Action items:\n';
          previousData += `${meeting.actionItems}\n`;
        }
        
        if (meeting.keyTakeaways) {
          previousData += 'Key takeaways:\n';
          previousData += `${meeting.keyTakeaways}\n`;
        }
        
        previousData += '\n';
      }
    });
    
    return previousData || null;
  } catch (error) {
    console.error('Error getting previous meetings:', error);
    return null;
  }
}

/**
 * Extract participant suggestions from meeting data
 */
function extractParticipantSuggestions(meetingData) {
  const suggestions = [];
  
  // Process agenda items added by participants
  (meetingData.agenda || []).forEach(item => {
    if (item.createdBy !== 'AI Assistant') {
      suggestions.push({
        participant: item.createdBy,
        suggestion: item.title || item.text,
        votes: item.votes || 0
      });
    }
  });
  
  // Process comments that look like suggestions
  (meetingData.agenda || []).forEach(item => {
    (item.comments || []).forEach(comment => {
      const lowercaseText = comment.text.toLowerCase();
      if (
        lowercaseText.includes('suggest') ||
        lowercaseText.includes('would like to') ||
        lowercaseText.includes('should discuss') ||
        lowercaseText.includes('can we add') ||
        lowercaseText.includes('let\'s talk about')
      ) {
        suggestions.push({
          participant: comment.createdBy,
          suggestion: comment.text,
          context: `Comment on: ${item.title || item.text}`,
          votes: 0
        });
      }
    });
  });
  
  return suggestions;
}

/**
 * Extract required topics from meeting data
 */
function extractRequiredTopics(meetingData) {
  // In a real implementation, this would look for topics marked as required
  // For now, we'll consider high-voted items or items with certain keywords as required
  const requiredTopics = [];
  
  (meetingData.agenda || []).forEach(item => {
    // High vote count suggests importance
    if ((item.votes || 0) >= 2) {
      requiredTopics.push(item.title || item.text);
      return;
    }
    
    // Look for keywords indicating required topics
    const lowercaseText = (item.title || item.text).toLowerCase();
    if (
      lowercaseText.includes('required') ||
      lowercaseText.includes('mandatory') ||
      lowercaseText.includes('must') ||
      lowercaseText.includes('important')
    ) {
      requiredTopics.push(item.title || item.text);
    }
  });
  
  return JSON.stringify(requiredTopics);
}

/**
 * Merge refined agenda with original to preserve IDs and metadata
 */
function mergeWithOriginalAgenda(refinedAgenda, originalAgenda) {
  return refinedAgenda.map(refinedItem => {
    // Look for matching item in original agenda
    const originalItem = originalAgenda.find(original => 
      (original.title && original.title === refinedItem.title) || 
      (original.text && original.text === refinedItem.title)
    );
    
    if (originalItem) {
      // Preserve original ID and metadata
      return {
        ...refinedItem,
        id: originalItem.id,
        createdBy: originalItem.createdBy,
        createdAt: originalItem.createdAt,
        votes: originalItem.votes || 0,
        comments: originalItem.comments || []
      };
    } else {
      // New item
      return {
        ...refinedItem,
        id: generateId(),
        createdBy: 'AI Assistant',
        createdAt: new Date().toISOString(),
        votes: 0,
        comments: []
      };
    }
  });
}

/**
 * Generate a unique ID
 */
function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Extract action items from meeting summary text
 */
function extractActionItems(summaryText) {
  // Look for the action items section
  const actionItemsRegex = /## Action Items\s+([\s\S]*?)(?=##|$)/;
  const match = summaryText.match(actionItemsRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return '';
}

/**
 * Extract key takeaways from meeting summary text
 */
function extractKeyTakeaways(summaryText) {
  // Look for key takeaways or decisions section
  const keyTakeawaysRegex = /## (?:Key Takeaways|Decisions|Key Points)\s+([\s\S]*?)(?=##|$)/;
  const match = summaryText.match(keyTakeawaysRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return '';
}

/**
 * Analyze sentiment in comments
 * Returns a value between -1 (negative) and 1 (positive)
 */
function analyzeSentiment(comments) {
  if (!comments || comments.length === 0) {
    return 0;
  }
  
  // Simple keyword-based sentiment analysis
  // In a real implementation, this would use a proper NLP service
  const positiveKeywords = [
    'agree', 'good', 'great', 'yes', 'support', 'like', 'approve',
    'excellent', 'perfect', 'awesome', '👍', '+1'
  ];
  
  const negativeKeywords = [
    'disagree', 'bad', 'no', 'don\'t', 'oppose', 'dislike', 'reject',
    'poor', 'waste', 'unnecessary', '👎', '-1'
  ];
  
  let positiveScore = 0;
  let negativeScore = 0;
  
  comments.forEach(comment => {
    const text = comment.text.toLowerCase();
    
    positiveKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        positiveScore++;
      }
    });
    
    negativeKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        negativeScore++;
      }
    });
  });
  
  if (positiveScore === 0 && negativeScore === 0) {
    return 0;
  }
  
  return (positiveScore - negativeScore) / (positiveScore + negativeScore);
}

module.exports = exports;