// File: src/components/AgendaEditor.js
import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { updateMeeting } from '../services/meetingService';
import TextareaAutosize from 'react-textarea-autosize';
import '../styles/AgendaEditor.css';

const AgendaEditor = ({ meetingId, agenda, participants, currentUser }) => {
  const [items, setItems] = useState(agenda || []);
  const [activeEditors, setActiveEditors] = useState({});
  const [lastSaved, setLastSaved] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [showAITip, setShowAITip] = useState(false);
  const [aiTip, setAiTip] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  
  // Mock active user data - this would come from a real-time service
  const mockActiveUsers = useRef({});
  
  const saveTimeoutRef = useRef(null);
  
  // Initialize expanded state for all items
  useEffect(() => {
    if (agenda) {
      const expanded = {};
      agenda.forEach(item => {
        expanded[item.id] = true;
      });
      setExpandedItems(expanded);
      setItems(agenda);
    }
  }, [agenda]);
  
  // Mock real-time collaboration updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate users randomly editing different items
      const activeUsers = {};
      
      participants.forEach(participant => {
        if (participant.email !== currentUser && Math.random() > 0.7) {
          const randomItemIndex = Math.floor(Math.random() * items.length);
          if (items[randomItemIndex]) {
            activeUsers[items[randomItemIndex].id] = {
              email: participant.email,
              name: participant.email.split('@')[0],
              timestamp: new Date()
            };
          }
        }
      });
      
      mockActiveUsers.current = activeUsers;
      setActiveEditors({...activeUsers});
    }, 5000);
    
    return () => clearInterval(interval);
  }, [items, participants, currentUser]);
  
  // Simulate AI tips
  useEffect(() => {
    const tipInterval = setInterval(() => {
      if (items.length > 0 && Math.random() > 0.7) {
        const tips = [
          "Consider adding a time allocation for each agenda item",
          "Adding a clear decision point could help drive consensus",
          "This agenda item might need an owner assigned",
          "Consider breaking this topic into smaller discussion points",
          "You might want to prioritize this item higher in the agenda"
        ];
        
        setAiTip(tips[Math.floor(Math.random() * tips.length)]);
        setShowAITip(true);
        
        // Hide tip after 10 seconds
        setTimeout(() => {
          setShowAITip(false);
        }, 10000);
      }
    }, 15000);
    
    return () => clearInterval(tipInterval);
  }, [items]);
  
  // Save changes
  const saveChanges = async () => {
    try {
      setSaving(true);
      await updateMeeting(meetingId, {
        agenda: items
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving agenda:', error);
    } finally {
      setSaving(false);
    }
  };
  
  // Debounced save on changes
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveChanges();
    }, 2000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [items]);
  
  // Handle item text change
  const handleItemChange = (id, field, value) => {
    const updatedItems = items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    
    setItems(updatedItems);
  };
  
  // Add new item
  const addItem = () => {
    const newItem = {
      id: `item-${Date.now()}`,
      text: '',
      category: 'Discussion',
      createdBy: currentUser,
      createdAt: new Date().toISOString(),
      votes: 0,
      comments: []
    };
    
    setItems([...items, newItem]);
    setExpandedItems({...expandedItems, [newItem.id]: true});
  };
  
  // Remove item
  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };
  
  // Handle drag end for reordering
  const onDragEnd = (result) => {
    if (!result.destination) return;
    
    const reordered = Array.from(items);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    
    setItems(reordered);
  };
  
  // Toggle item expanded state
  const toggleExpanded = (id) => {
    setExpandedItems({
      ...expandedItems,
      [id]: !expandedItems[id]
    });
  };
  
  // Get user's first name
  const getFirstName = (email) => {
    return email.split('@')[0];
  };
  
  return (
    <div className="agenda-editor">
      <div className="editor-header">
        <h2>Meeting Agenda</h2>
        <div className="save-status">
          {saving ? (
            <span className="saving">Saving...</span>
          ) : (
            <span className="saved">Last saved: {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>
      </div>
      
      {showAITip && (
        <div className="ai-tip">
          <div className="ai-tip-icon">💡</div>
          <div className="ai-tip-text">{aiTip}</div>
          <button className="ai-tip-close" onClick={() => setShowAITip(false)}>×</button>
        </div>
      )}
      
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="agenda-items">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="agenda-items-container"
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`agenda-item ${snapshot.isDragging ? 'dragging' : ''}`}
                    >
                      <div className="item-header">
                        <div 
                          {...provided.dragHandleProps}
                          className="drag-handle"
                        >
                          ☰
                        </div>
                        
                        <div className="item-category">
                          <select
                            value={item.category || 'Discussion'}
                            onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
                          >
                            <option value="Discussion">💬 Discussion</option>
                            <option value="Decision">🔍 Decision</option>
                            <option value="Action">✅ Action</option>
                          </select>
                        </div>
                        
                        <div 
                          className="expand-toggle"
                          onClick={() => toggleExpanded(item.id)}
                        >
                          {expandedItems[item.id] ? '▼' : '►'}
                        </div>
                        
                        <button
                          className="remove-button"
                          onClick={() => removeItem(item.id)}
                        >
                          ×
                        </button>
                      </div>
                      
                      {expandedItems[item.id] && (
                        <div className="item-body">
                          <TextareaAutosize
                            value={item.text}
                            onChange={(e) => handleItemChange(item.id, 'text', e.target.value)}
                            placeholder="Enter agenda item..."
                            minRows={1}
                            className="item-text-input"
                          />
                          
                          <div className="item-meta">
                            <div className="item-creator">
                              Added by {getFirstName(item.createdBy)}
                            </div>
                            
                            <div className="time-allocation">
                              <label>Time:</label>
                              <input
                                type="number"
                                min="1"
                                max="60"
                                value={item.timeAllocation || ''}
                                onChange={(e) => handleItemChange(item.id, 'timeAllocation', parseInt(e.target.value))}
                                placeholder="mins"
                              />
                              min
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {activeEditors[item.id] && (
                        <div className="active-editor">
                          {getFirstName(activeEditors[item.id].email)} is editing...
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      <button className="add-item-button" onClick={addItem}>
        + Add Agenda Item
      </button>
    </div>
  );
};

export default AgendaEditor;

// File: src/components/CollaborationPanel.js
import React from 'react';
import '../styles/CollaborationPanel.css';

const CollaborationPanel = ({ participants, meetingId }) => {
  // Calculate response rate
  const responseCount = participants.filter(p => p.hasResponded).length;
  const responseRate = participants.length > 0 
    ? Math.round((responseCount / participants.length) * 100) 
    : 0;
  
  // Get active users (this would come from a real-time service)
  const activeUsers = participants
    .filter(p => p.isActive)
    .map(p => p.email);
  
  // Generate meeting link
  const meetingLink = `${window.location.origin}/meeting/${meetingId}`;
  
  const copyLink = () => {
    navigator.clipboard.writeText(meetingLink)
      .then(() => {
        // Show feedback
        document.querySelector('.copy-feedback').classList.add('show');
        setTimeout(() => {
          document.querySelector('.copy-feedback').classList.remove('show');
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };
  
  return (
    <div className="collaboration-panel">
      <div className="collaboration-header">
        <h3>Collaboration</h3>
      </div>
      
      <div className="share-section">
        <h4>Share</h4>
        <div className="share-link">
          <input 
            type="text" 
            value={meetingLink} 
            readOnly 
          />
          <button onClick={copyLink}>Copy</button>
          <span className="copy-feedback">Copied!</span>
        </div>
      </div>
      
      <div className="participants-section">
        <h4>Participants ({responseCount}/{participants.length})</h4>
        
        <div className="response-rate">
          <div className="rate-label">Response Rate:</div>
          <div className="progress-bar">
            <div 
              className="progress" 
              style={{width: `${responseRate}%`}}
            ></div>
          </div>
          <div className="rate-percentage">{responseRate}%</div>
        </div>
        
        <div className="participants-list">
          {participants.map((participant, index) => (
            <div 
              key={index} 
              className={`participant ${participant.hasResponded ? 'responded' : ''} ${activeUsers.includes(participant.email) ? 'active' : ''}`}
            >
              <div className="participant-avatar">
                {participant.email.charAt(0).toUpperCase()}
              </div>
              <div className="participant-info">
                <div className="participant-name">
                  {participant.email.split('@')[0]}
                </div>
                <div className="participant-email">
                  {participant.email}
                </div>
              </div>
              <div className="participant-status">
                {activeUsers.includes(participant.email) && (
                  <span className="status-active">Active</span>
                )}
                {participant.hasResponded ? (
                  <span className="status-responded">Responded</span>
                ) : (
                  <span className="status-pending">Pending</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="reminder-section">
        <button className="reminder-button">
          Send Reminder to Non-Responders
        </button>
      </div>
    </div>
  );
};

export default CollaborationPanel;

// File: src/components/MeetingSummary.js
import React, { useState } from 'react';
import { generateEnhancedSummary } from '../services/aiService';
import AIChat from './AIChat';
import '../styles/MeetingSummary.css';

const MeetingSummary = ({ meetingId, agenda }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionItems, setActionItems] = useState([]);
  const [keyTakeaways, setKeyTakeaways] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  
  const handleGenerateSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const summary = await generateEnhancedSummary(meetingId, setLoading, setError);
      
      setActionItems(summary.processedActionItems || []);
      setKeyTakeaways(summary.processedKeyTakeaways || []);
      setShowSummary(true);
    } catch (err) {
      console.error('Error generating summary:', err);
      setError('Failed to generate summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateActionItems = (items) => {
    setActionItems([...actionItems, ...items]);
  };
  
  const handleUpdateKeyTakeaways = (takeaways) => {
    setKeyTakeaways([...keyTakeaways, ...takeaways]);
  };
  
  const renderSummaryContent = () => {
    if (!showSummary) {
      return (
        <div className="summary-placeholder">
          <p>After your meeting, generate a summary with action items and key takeaways.</p>
          <button 
            className="generate-button"
            onClick={handleGenerateSummary}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Summary'}
          </button>
        </div>
      );
    }
    
    return (
      <div className="summary-content">
        <div className="summary-section">
          <h3>Action Items</h3>
          {actionItems.length > 0 ? (
            <div className="action-items">
              {actionItems.map((item, index) => (
                <div key={index} className="action-item">
                  <input 
                    type="checkbox" 
                    id={`action-${index}`}
                    checked={item.completed}
                    onChange={() => {
                      const updated = [...actionItems];
                      updated[index].completed = !updated[index].completed;
                      setActionItems(updated);
                    }}
                  />
                  <label htmlFor={`action-${index}`}>
                    <div className="action-text">{item.text}</div>
                    <div className="action-meta">
                      {item.assignee && <span className="assignee">{item.assignee}</span>}
                      {item.deadline && <span className="deadline">by {item.deadline}</span>}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-list">No action items yet.</p>
          )}
        </div>
        
        <div className="summary-section">
          <h3>Key Takeaways</h3>
          {keyTakeaways.length > 0 ? (
            <div className="key-takeaways">
              {keyTakeaways.map((item, index) => (
                <div key={index} className={`takeaway-item ${item.category}`}>
                  {item.text}
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-list">No key takeaways yet.</p>
          )}
        </div>
        
        <div className="chat-section">
          <AIChat 
            meetingId={meetingId}
            agendaItems={agenda}
            onUpdateActionItems={handleUpdateActionItems}
            onUpdateKeyTakeaways={handleUpdateKeyTakeaways}
          />
        </div>
        
        <div className="summary-actions">
          <button className="share-summary">Share Summary</button>
          <button className="export-summary">Export to Calendar</button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="meeting-summary">
      <div className="summary-header">
        <h2>Meeting Summary</h2>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {renderSummaryContent()}
    </div>
  );
};

export default MeetingSummary;

// File: src/components/MobileToolbar.js
import React, { useState } from 'react';
import '../styles/MobileToolbar.css';

const MobileToolbar = ({ onViewChange }) => {
  const [activeView, setActiveView] = useState('agenda');
  
  const handleViewChange = (view) => {
    setActiveView(view);
    onViewChange(view);
  };
  
  return (
    <div className="mobile-toolbar">
      <button 
        className={`toolbar-button ${activeView === 'agenda' ? 'active' : ''}`}
        onClick={() => handleViewChange('agenda')}
      >
        <span className="icon">📝</span>
        <span className="label">Agenda</span>
      </button>
      
      <button 
        className={`toolbar-button ${activeView === 'participants' ? 'active' : ''}`}
        onClick={() => handleViewChange('participants')}
      >
        <span className="icon">👥</span>
        <span className="label">People</span>
      </button>
      
      <button 
        className={`toolbar-button ${activeView === 'ai' ? 'active' : ''}`}
        onClick={() => handleViewChange('ai')}
      >
        <span className="icon">🤖</span>
        <span className="label">AI</span>
      </button>
      
      <button 
        className={`toolbar-button ${activeView === 'summary' ? 'active' : ''}`}
        onClick={() => handleViewChange('summary')}
      >
        <span className="icon">✅</span>
        <span className="label">Summary</span>
      </button>
    </div>
  );
};

export default MobileToolbar;
