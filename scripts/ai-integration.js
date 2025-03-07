// File: src/services/aiService.js
import { triggerAIAgendaGeneration, generatePostMeetingSummary } from './meetingService';

/**
 * Enhanced AI agenda generation with client-side processing
 * @param {string} meetingId - The meeting ID
 * @param {Function} setLoading - Function to set loading state
 * @param {Function} setError - Function to set error state
 * @returns {Promise<Object>} Generated agenda data
 */
export const generateEnhancedAgenda = async (meetingId, setLoading, setError) => {
  try {
    setLoading(true);
    const result = await triggerAIAgendaGeneration(meetingId);
    
    if (result.agenda) {
      // Add client-side indicators and formatting
      result.agenda = result.agenda.map(item => {
        // Add emoji indicators based on category
        let emoji = '💬'; // Default for Discussion
        if (item.category === 'Decision') {
          emoji = '🔍';
        } else if (item.category === 'Action') {
          emoji = '✅';
        }
        
        return {
          ...item,
          displayTitle: `${emoji} ${item.title}`,
          expanded: true, // Default to expanded view
        };
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error generating enhanced agenda:', error);
    setError('Failed to generate agenda. Please try again.');
    throw error;
  } finally {
    setLoading(false);
  }
};

/**
 * Process and enhance AI-generated meeting summaries
 * @param {string} meetingId - The meeting ID
 * @param {Function} setLoading - Function to set loading state
 * @param {Function} setError - Function to set error state
 * @returns {Promise<Object>} Processed summary data
 */
export const generateEnhancedSummary = async (meetingId, setLoading, setError) => {
  try {
    setLoading(true);
    const summaryData = await generatePostMeetingSummary(meetingId);
    
    // Process action items to extract assignees and deadlines
    const actionItems = processActionItems(summaryData.actionItems);
    
    // Process key takeaways for better presentation
    const keyTakeaways = processKeyTakeaways(summaryData.keyTakeaways);
    
    return {
      ...summaryData,
      processedActionItems: actionItems,
      processedKeyTakeaways: keyTakeaways
    };
  } catch (error) {
    console.error('Error generating enhanced summary:', error);
    setError('Failed to generate meeting summary. Please try again.');
    throw error;
  } finally {
    setLoading(false);
  }
};

/**
 * Process action items to extract assignees and deadlines
 * @param {string} actionItemsText - Raw action items text
 * @returns {Array} Structured action items
 */
const processActionItems = (actionItemsText) => {
  if (!actionItemsText) return [];
  
  const lines = actionItemsText.split('\n');
  const actionItems = [];
  
  lines.forEach(line => {
    if (!line.trim() || !line.startsWith('-')) return;
    
    // Extract the action item text without the leading dash
    const text = line.trim().substring(1).trim();
    
    // Try to extract assignee (name followed by colon or name in parentheses)
    let assignee = null;
    const assigneeRegex = /\(([^)]+)\)|([A-Za-z\s]+):/;
    const assigneeMatch = text.match(assigneeRegex);
    
    if (assigneeMatch) {
      assignee = assigneeMatch[1] || assigneeMatch[2];
    }
    
    // Try to extract deadline (dates in various formats)
    let deadline = null;
    const deadlineRegex = /by\s+([A-Za-z]+\s+\d+|\d+\/\d+\/\d+|\d+-\d+-\d+)/i;
    const deadlineMatch = text.match(deadlineRegex);
    
    if (deadlineMatch) {
      deadline = deadlineMatch[1];
    }
    
    actionItems.push({
      text,
      assignee,
      deadline,
      completed: false
    });
  });
  
  return actionItems;
};

/**
 * Process key takeaways for better presentation
 * @param {string} keyTakeawaysText - Raw key takeaways text
 * @returns {Array} Structured key takeaways
 */
const processKeyTakeaways = (keyTakeawaysText) => {
  if (!keyTakeawaysText) return [];
  
  const lines = keyTakeawaysText.split('\n');
  const takeaways = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('-')) return;
    
    // Extract the takeaway text without the leading dash
    const text = trimmed.substring(1).trim();
    
    takeaways.push({
      text,
      category: categorizeTakeaway(text)
    });
  });
  
  return takeaways;
};

/**
 * Categorize a takeaway based on its content
 * @param {string} text - Takeaway text
 * @returns {string} Category label
 */
const categorizeTakeaway = (text) => {
  const lowercaseText = text.toLowerCase();
  
  if (
    lowercaseText.includes('decide') ||
    lowercaseText.includes('decision') ||
    lowercaseText.includes('agreed') ||
    lowercaseText.includes('agreement') ||
    lowercaseText.includes('will be') ||
    lowercaseText.includes('will not be')
  ) {
    return 'decision';
  }
  
  if (
    lowercaseText.includes('next step') ||
    lowercaseText.includes('follow up') ||
    lowercaseText.includes('will follow') ||
    lowercaseText.includes('will be done')
  ) {
    return 'next-step';
  }
  
  if (
    lowercaseText.includes('concern') ||
    lowercaseText.includes('issue') ||
    lowercaseText.includes('problem') ||
    lowercaseText.includes('challenge') ||
    lowercaseText.includes('risk')
  ) {
    return 'concern';
  }
  
  if (
    lowercaseText.includes('idea') ||
    lowercaseText.includes('suggestion') ||
    lowercaseText.includes('propose') ||
    lowercaseText.includes('consider')
  ) {
    return 'idea';
  }
  
  return 'general';
};

// File: src/components/AIAgendaGenerator.js
import React, { useState } from 'react';
import { generateEnhancedAgenda } from '../services/aiService';

const AIAgendaGenerator = ({ meetingId, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [focusAreas, setFocusAreas] = useState([]);
  const [timeConstraint, setTimeConstraint] = useState('');

  const handleGenerateClick = async () => {
    try {
      setError(null);
      
      // Enhanced context for the AI
      const enhancedContext = {
        focusAreas: focusAreas.filter(area => area.trim() !== ''),
        timeConstraint: timeConstraint || null
      };
      
      const result = await generateEnhancedAgenda(meetingId, setLoading, setError, enhancedContext);
      
      if (onComplete) {
        onComplete(result);
      }
    } catch (err) {
      console.error('Error in agenda generation:', err);
    }
  };

  const handleAddFocusArea = () => {
    setFocusAreas([...focusAreas, '']);
  };

  const handleUpdateFocusArea = (index, value) => {
    const updatedAreas = [...focusAreas];
    updatedAreas[index] = value;
    setFocusAreas(updatedAreas);
  };

  const handleRemoveFocusArea = (index) => {
    const updatedAreas = [...focusAreas];
    updatedAreas.splice(index, 1);
    setFocusAreas(updatedAreas);
  };

  return (
    <div className="ai-agenda-generator">
      <div className="generator-header">
        <h3>AI Agenda Generation</h3>
        <button 
          className={`advanced-toggle ${showAdvanced ? 'active' : ''}`}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
        </button>
      </div>
      
      {showAdvanced && (
        <div className="advanced-options">
          <div className="focus-areas">
            <label>Focus Areas (Optional)</label>
            {focusAreas.map((area, index) => (
              <div key={index} className="focus-area-input">
                <input
                  type="text"
                  value={area}
                  onChange={(e) => handleUpdateFocusArea(index, e.target.value)}
                  placeholder="e.g., Project timeline, Budget concerns"
                />
                <button 
                  className="remove-button"
                  onClick={() => handleRemoveFocusArea(index)}
                >
                  ✕
                </button>
              </div>
            ))}
            <button 
              className="add-focus-area" 
              onClick={handleAddFocusArea}
            >
              + Add Focus Area
            </button>
          </div>
          
          <div className="time-constraint">
            <label>Time Constraint (Optional)</label>
            <select 
              value={timeConstraint} 
              onChange={(e) => setTimeConstraint(e.target.value)}
            >
              <option value="">No specific constraint</option>
              <option value="15">Keep it under 15 minutes</option>
              <option value="30">Keep it under 30 minutes</option>
              <option value="45">Keep it under 45 minutes</option>
              <option value="60">Keep it under 1 hour</option>
              <option value="90">Keep it under 1.5 hours</option>
            </select>
          </div>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      
      <button
        className="generate-button"
        onClick={handleGenerateClick}
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Generate AI Agenda'}
      </button>
      
      <div className="generator-help">
        <p>AI will analyze your meeting title, description, and participant input to suggest a structured agenda.</p>
      </div>
    </div>
  );
};

export default AIAgendaGenerator;

// File: src/components/ConsensusTracker.js
import React from 'react';

const ConsensusTracker = ({ agendaItems }) => {
  // Filter items with consensus data
  const itemsWithConsensus = agendaItems.filter(item => 
    item.consensusLevel !== undefined || item.votes > 0
  );
  
  // No items with consensus data
  if (itemsWithConsensus.length === 0) {
    return (
      <div className="consensus-tracker">
        <h3>Alignment Tracker</h3>
        <p className="no-data">No consensus data available yet. As participants suggest and vote on agenda items, alignment will be tracked here.</p>
      </div>
    );
  }
  
  return (
    <div className="consensus-tracker">
      <h3>Alignment Tracker</h3>
      
      <div className="consensus-items">
        {itemsWithConsensus.map(item => {
          // Calculate consensus percentage
          const consensusPercent = item.consensusLevel !== undefined 
            ? item.consensusLevel 
            : Math.min(item.votes * 10, 100); // Simple calculation based on votes
          
          // Determine color based on consensus level
          let consensusColor = '#4caf50'; // Green for high consensus
          if (consensusPercent < 30) {
            consensusColor = '#f44336'; // Red for low consensus
          } else if (consensusPercent < 70) {
            consensusColor = '#ff9800'; // Orange for medium consensus
          }
          
          return (
            <div key={item.id} className="consensus-item">
              <div className="item-title">
                {item.title || item.text}
              </div>
              
              <div className="consensus-bar-container">
                <div 
                  className="consensus-bar" 
                  style={{ 
                    width: `${consensusPercent}%`,
                    backgroundColor: consensusColor
                  }}
                />
              </div>
              
              <div className="consensus-percentage">
                {consensusPercent}%
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="consensus-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#f44336' }}></span>
          <span>Needs Discussion</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#ff9800' }}></span>
          <span>Some Agreement</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#4caf50' }}></span>
          <span>Strong Agreement</span>
        </div>
      </div>
    </div>
  );
};

export default ConsensusTracker;

// File: src/components/AIChat.js
import React, { useState, useRef, useEffect } from 'react';

const AIChat = ({ meetingId, agendaItems, onUpdateActionItems, onUpdateKeyTakeaways }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "I'm here to help you capture action items and key takeaways from your meeting. What would you like to record?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage = { role: 'user', content: input };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call AI service to process the message
      const response = await processAIChatMessage(meetingId, input, messages, agendaItems);
      
      // Add assistant response
      setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: response.message }]);
      
      // If the AI identified action items or takeaways, update them
      if (response.actionItems && response.actionItems.length > 0) {
        onUpdateActionItems(response.actionItems);
      }
      
      if (response.keyTakeaways && response.keyTakeaways.length > 0) {
        onUpdateKeyTakeaways(response.keyTakeaways);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      setMessages(prevMessages => [
        ...prevMessages, 
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Mock function to process AI chat messages
  // In a real implementation, this would call the backend
  const processAIChatMessage = async (meetingId, message, messageHistory, agendaItems) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple logic to detect action items
    const actionItemRegex = /(?:action item|task|to-do|todo):\s*(.*)/gi;
    const actionItems = [];
    let match;
    
    while ((match = actionItemRegex.exec(message)) !== null) {
      actionItems.push({
        text: match[1],
        assignee: null,
        deadline: null,
        completed: false
      });
    }
    
    // Simple logic to detect key takeaways
    const takeawayRegex = /(?:takeaway|key point|decision|conclusion):\s*(.*)/gi;
    const keyTakeaways = [];
    
    while ((match = takeawayRegex.exec(message)) !== null) {
      keyTakeaways.push({
        text: match[1],
        category: 'general'
      });
    }
    
    // Generate a response
    let responseMessage;
    
    if (actionItems.length > 0 || keyTakeaways.length > 0) {
      responseMessage = "I've recorded the following:\n\n";
      
      if (actionItems.length > 0) {
        responseMessage += "Action Items:\n";
        actionItems.forEach(item => {
          responseMessage += `- ${item.text}\n`;
        });
        responseMessage += "\n";
      }
      
      if (keyTakeaways.length > 0) {
        responseMessage += "Key Takeaways:\n";
        keyTakeaways.forEach(item => {
          responseMessage += `- ${item.text}\n`;
        });
        responseMessage += "\n";
      }
      
      responseMessage += "Would you like to add anything else?";
    } else {
      // Generic responses if no specific items detected
      const responseOptions = [
        "Got it. What else would you like to record from the meeting?",
        "That's noted. Any action items or decisions you'd like to capture?",
        "I understand. Are there any specific assignments or deadlines to record?",
        "Thanks for sharing. Would you like to capture any key decisions made during the meeting?",
        "Noted. Who should be responsible for any follow-up actions?"
      ];
      
      responseMessage = responseOptions[Math.floor(Math.random() * responseOptions.length)];
    }
    
    return {
      message: responseMessage,
      actionItems,
      keyTakeaways
    };
  };

  return (
    <div className="ai-chat">
      <div className="chat-header">
        <h3>Meeting Summary Assistant</h3>
      </div>
      
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-content">{message.content}</div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-content loading">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Record action items, decisions, or key takeaways..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
      
      <div className="chat-help">
        <p>
          <strong>Tips:</strong> Try phrases like "Action item: Design team to finalize mockups by Friday" 
          or "Takeaway: Budget increase approved for Q2"
        </p>
      </div>
    </div>
  );
};

export default AIChat;
