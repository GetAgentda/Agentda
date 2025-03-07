// File: functions/summaryGeneration.js
const { OpenAI } = require('openai');
const admin = require('firebase-admin');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Firestore reference
const db = admin.firestore();

/**
 * Generate meeting summary
 * @param {string} meetingId - The meeting ID
 * @returns {Promise<Object>} The generated summary
 */
exports.generateMeetingSummary = async (meetingId) => {
  try {
    // Get meeting data
    const meetingDoc = await db.collection('meetings').doc(meetingId).get();
    if (!meetingDoc.exists) {
      throw new Error('Meeting not found');
    }
    
    const meetingData = meetingDoc.data();
    
    // Prepare meeting content for summary generation
    const meetingContent = prepareMeetingContent(meetingData);
    
    // Generate the summary using AI
    const summary = await generateSummaryWithAI(meetingData, meetingContent);
    
    // Process the summary to extract structured data
    const processedSummary = processSummary(summary);
    
    // Update meeting with summary
    await db.collection('meetings').doc(meetingId).update({
      summary: processedSummary.fullSummary,
      actionItems: processedSummary.actionItems,
      decisions: processedSummary.decisions,
      unresolved: processedSummary.unresolved,
      summaryGenerated: true,
      summaryGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Create calendar events for action items with deadlines
    await createCalendarEventsForActionItems(meetingId, processedSummary.actionItems);
    
    return processedSummary;
  } catch (error) {
    console.error('Error generating meeting summary:', error);
    throw error;
  }
};

/**
 * Prepare meeting content for summary generation
 * @param {Object} meetingData - The meeting data
 * @returns {string} Formatted meeting content
 */
function prepareMeetingContent(meetingData) {
  let content = '';
  
  // Include agenda items
  if (meetingData.agenda && meetingData.agenda.length > 0) {
    content += 'AGENDA ITEMS:\n';
    meetingData.agenda.forEach((item, index) => {
      content += `${index + 1}. ${item.text || item.title}\n`;
      
      // Include comments on agenda items
      if (item.comments && item.comments.length > 0) {
        content += 'Discussion:\n';
        item.comments.forEach(comment => {
          content += `- ${comment.createdBy}: ${comment.text}\n`;
        });
      }
    });
    content += '\n';
  }
  
  // Include post-meeting notes provided by participants
  if (meetingData.meetingNotes) {
    content += 'MEETING NOTES:\n';
    content += meetingData.meetingNotes;
    content += '\n\n';
  }
  
  // Include manually tagged action items
  if (meetingData.manualActionItems && meetingData.manualActionItems.length > 0) {
    content += 'MANUALLY TAGGED ACTION ITEMS:\n';
    meetingData.manualActionItems.forEach(item => {
      content += `- ${item.text}`;
      if (item.assignee) content += ` (Owner: ${item.assignee})`;
      if (item.deadline) content += ` (Deadline: ${item.deadline})`;
      content += '\n';
    });
    content += '\n';
  }
  
  // Include chat messages
  if (meetingData.chatMessages && meetingData.chatMessages.length > 0) {
    content += 'CHAT MESSAGES:\n';
    meetingData.chatMessages.forEach(message => {
      content += `${message.sender}: ${message.text}\n`;
    });
  }
  
  return content;
}

/**
 * Generate summary using AI
 * @param {Object} meetingData - The meeting data
 * @param {string} meetingContent - Formatted meeting content
 * @returns {Promise<string>} Generated summary
 */
async function generateSummaryWithAI(meetingData, meetingContent) {
  // Prepare agenda items as JSON
  const agendaItemsJson = JSON.stringify(meetingData.agenda || []);
  
  // Construct the prompt
  const prompt = `
    You are an expert meeting facilitator generating a summary of a completed meeting. Your goal is to produce a clear, actionable summary.

    MEETING DETAILS:
    Title: ${meetingData.title}
    Date: ${meetingData.date}
    Time: ${meetingData.time}
    Participants: ${(meetingData.participants || []).map(p => p.email).join(', ')}

    ORIGINAL AGENDA:
    ${agendaItemsJson}

    MEETING CONTENT:
    ${meetingContent}

    Generate a comprehensive meeting summary with:

    1. Executive Summary (2-3 sentence overview)
    2. Key Decisions Made (what was decided and why)
    3. Action Items (with owner and deadline)
    4. Discussion Points (brief summary of main topics)
    5. Unresolved Items (issues requiring further discussion)

    Format action items with clear ownership and deadlines. 
    Use bullet points for skimmability.
    Be specific about responsibilities.
    Include only items explicitly discussed in the meeting.
    
    Format the summary in markdown for readability.
  `;
  
  // Call AI model
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { role: "system", content: "You are an expert meeting facilitator who creates clear, actionable meeting summaries." },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
  });
  
  return response.choices[0].message.content;
}

/**
 * Process summary to extract structured data
 * @param {string} summary - Generated summary text
 * @returns {Object} Processed summary with structured data
 */
function processSummary(summary) {
  // Extract action items
  const actionItems = extractActionItems(summary);
  
  // Extract decisions
  const decisions = extractDecisions(summary);
  
  // Extract unresolved items
  const unresolved = extractUnresolvedItems(summary);
  
  return {
    fullSummary: summary,
    actionItems,
    decisions,
    unresolved
  };
}

/**
 * Extract action items from summary
 * @param {string} summary - Summary text
 * @returns {Array} Extracted action items
 */
function extractActionItems(summary) {
  const actionItems = [];
  
  // Find the action items section
  const actionItemsRegex = /##\s*Action\s*Items([\s\S]*?)(?=##|$)/i;
  const match = summary.match(actionItemsRegex);
  
  if (match && match[1]) {
    const actionItemsSection = match[1].trim();
    
    // Extract individual action items
    // Looking for patterns like:
    // * **Item text** Owner: Person Deadline: Date
    // * **Item text** **Owner:** Person **Deadline:** Date
    const actionItemPattern = /[\*\-]\s+(?:\*\*)?(.+?)(?:\*\*)?(?:\s+(?:\*\*)?Owner(?:\*\*)?\s*:?\s*([^*\n]+))?(?:\s+(?:\*\*)?Deadline(?:\*\*)?\s*:?\s*([^*\n]+))?/gi;
    
    let itemMatch;
    while ((itemMatch = actionItemPattern.exec(actionItemsSection)) !== null) {
      const text = itemMatch[1].trim();
      const owner = itemMatch[2] ? itemMatch[2].trim() : null;
      const deadline = itemMatch[3] ? itemMatch[3].trim() : null;
      
      actionItems.push({
        text,
        owner,
        deadline,
        completed: false,
        id: generateId()
      });
    }
  }
  
  return actionItems;
}

/**
 * Extract decisions from summary
 * @param {string} summary - Summary text
 * @returns {Array} Extracted decisions
 */
function extractDecisions(summary) {
  const decisions = [];
  
  // Find the decisions section
  const decisionsRegex = /##\s*Key\s*Decisions(?:\s*Made)?([\s\S]*?)(?=##|$)/i;
  const match = summary.match(decisionsRegex);
  
  if (match && match[1]) {
    const decisionsSection = match[1].trim();
    
    // Extract individual decisions
    // Looking for patterns like:
    // * Decision text
    // * **Decision text**
    const decisionPattern = /[\*\-]\s+(?:\*\*)?([^*]+?)(?:\*\*)?(?:\s+(?:\*\*)?Rationale(?:\*\*)?\s*:?\s*([^*\n]+))?/gi;
    
    let decisionMatch;
    while ((decisionMatch = decisionPattern.exec(decisionsSection)) !== null) {
      const text = decisionMatch[1].trim();
      const rationale = decisionMatch[2] ? decisionMatch[2].trim() : null;
      
      decisions.push({
        text,
        rationale,
        id: generateId()
      });
    }
  }
  
  return decisions;
}

/**
 * Extract unresolved items from summary
 * @param {string} summary - Summary text
 * @returns {Array} Extracted unresolved items
 */
function extractUnresolvedItems(summary) {
  const unresolved = [];
  
  // Find the unresolved items section
  const unresolvedRegex = /##\s*Unresolved\s*Items([\s\S]*?)(?=##|$)/i;
  const match = summary.match(unresolvedRegex);
  
  if (match && match[1]) {
    const unresolvedSection = match[1].trim();
    
    // Extract individual unresolved items
    // Looking for patterns like:
    // * Unresolved item text
    // * **Unresolved item text**
    const unresolvedPattern = /[\*\-]\s+(?:\*\*)?([^*]+?)(?:\*\*)?/gi;
    
    let unresolvedMatch;
    while ((unresolvedMatch = unresolvedPattern.exec(unresolvedSection)) !== null) {
      const text = unresolvedMatch[1].trim();
      
      unresolved.push({
        text,
        id: generateId()
      });
    }
  }
  
  return unresolved;
}

/**
 * Create calendar events for action items with deadlines
 * @param {string} meetingId - Meeting ID
 * @param {Array} actionItems - Extracted action items
 */
async function createCalendarEventsForActionItems(meetingId, actionItems) {
  // This would integrate with calendar services like Google Calendar or Outlook
  // For MVP, this is a placeholder for future implementation
  
  // Example implementation would:
  // 1. For each action item with a deadline
  // 2. Create a calendar event on the assignee's calendar
  // 3. Include the meeting context and action item description
  
  console.log('Would create calendar events for:', actionItems.filter(item => item.deadline));
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// File: functions/summaryDistribution.js
/**
 * Distribute meeting summary to participants
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Object>} Distribution results
 */
exports.distributeSummary = async (meetingId) => {
  try {
    // Get meeting data with summary
    const meetingDoc = await db.collection('meetings').doc(meetingId).get();
    if (!meetingDoc.exists) {
      throw new Error('Meeting not found');
    }
    
    const meetingData = meetingDoc.data();
    
    if (!meetingData.summary) {
      throw new Error('Meeting summary not found');
    }
    
    // Prepare different formats of summary
    const summaryFormats = prepareSummaryFormats(meetingData);
    
    // Send summary to participants
    const emailResults = await sendSummaryEmails(meetingData, summaryFormats.email);
    
    // If integrations exist, send to those channels
    let slackResult = null;
    if (meetingData.integrations && meetingData.integrations.slack) {
      slackResult = await postToSlack(meetingData, summaryFormats.slack);
    }
    
    // Update meeting with distribution status
    await db.collection('meetings').doc(meetingId).update({
      summaryDistributed: true,
      summaryDistributedAt: admin.firestore.FieldValue.serverTimestamp(),
      distributionResults: {
        email: emailResults,
        slack: slackResult
      }
    });
    
    return {
      success: true,
      emailResults,
      slackResult
    };
  } catch (error) {
    console.error('Error distributing meeting summary:', error);
    throw error;
  }
};

/**
 * Prepare different formats of summary for distribution
 * @param {Object} meetingData - Meeting data
 * @returns {Object} Formatted summaries
 */
function prepareSummaryFormats(meetingData) {
  // Original markdown summary
  const markdownSummary = meetingData.summary;
  
  // Convert to HTML for email
  const emailHtml = convertMarkdownToHtml(markdownSummary);
  
  // Simplify for Slack
  const slackText = simplifyForSlack(markdownSummary);
  
  return {
    markdown: markdownSummary,
    email: emailHtml,
    slack: slackText
  };
}

/**
 * Convert markdown to HTML
 * @param {string} markdown - Markdown text
 * @returns {string} HTML
 */
function convertMarkdownToHtml(markdown) {
  // In a real implementation, use a library like marked or remark
  // This is a simple example
  let html = markdown
    .replace(/# (.*?)\n/g, '<h1>$1</h1>')
    .replace(/## (.*?)\n/g, '<h2>$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n\* (.*?)\n/g, '<ul><li>$1</li></ul>');
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${html}
    </div>
  `;
}

/**
 * Simplify markdown for Slack
 * @param {string} markdown - Markdown text
 * @returns {string} Simplified text for Slack
 */
function simplifyForSlack(markdown) {
  // Simplify markdown for Slack which has its own formatting
  return markdown
    .replace(/# (.*?)\n/g, '*$1*\n')
    .replace(/## (.*?)\n/g, '*$1*\n')
    .replace(/\n\n/g, '\n');
}

/**
 * Send summary emails to participants
 * @param {Object} meetingData - Meeting data
 * @param {string} emailHtml - HTML content for email
 * @returns {Promise<Object>} Email sending results
 */
async function sendSummaryEmails(meetingData, emailHtml) {
  // In a real implementation, use a service like SendGrid, Mailgun, etc.
  // This is a placeholder
  
  const participants = meetingData.participants || [];
  const emailResults = {
    sent: [],
    failed: []
  };
  
  // Mock sending emails
  for (const participant of participants) {
    try {
      console.log(`Would send email to ${participant.email}`);
      emailResults.sent.push(participant.email);
    } catch (error) {
      console.error(`Error sending email to ${participant.email}:`, error);
      emailResults.failed.push(participant.email);
    }
  }
  
  return emailResults;
}

/**
 * Post summary to Slack
 * @param {Object} meetingData - Meeting data
 * @param {string} slackText - Formatted text for Slack
 * @returns {Promise<Object>} Slack posting result
 */
async function postToSlack(meetingData, slackText) {
  // In a real implementation, use Slack API
  // This is a placeholder
  
  console.log(`Would post to Slack channel: ${meetingData.integrations.slack.channel}`);
  
  return {
    success: true,
    channel: meetingData.integrations.slack.channel
  };
}

module.exports = {
  ...exports
};