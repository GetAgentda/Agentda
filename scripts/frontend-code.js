// File: src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CreateMeetingPage from './pages/CreateMeetingPage';
import MeetingPage from './pages/MeetingPage';
import PostMeetingPage from './pages/PostMeetingPage';
import { MeetingProvider } from './context/MeetingContext';
import './App.css';

function App() {
  return (
    <MeetingProvider>
      <Router>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreateMeetingPage />} />
            <Route path="/meeting/:meetingId" element={<MeetingPage />} />
            <Route path="/post-meeting/:meetingId" element={<PostMeetingPage />} />
          </Routes>
        </div>
      </Router>
    </MeetingProvider>
  );
}

export default App;

// File: src/context/MeetingContext.js
import React, { createContext, useState, useEffect } from 'react';
import { getDoc, onSnapshot } from 'firebase/firestore';
import { getMeeting, updateMeeting } from '../services/meetingService';

export const MeetingContext = createContext();

export const MeetingProvider = ({ children }) => {
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState([]);

  const fetchMeeting = async (meetingId) => {
    try {
      setLoading(true);
      const meetingData = await getMeeting(meetingId);
      setCurrentMeeting(meetingData);
      setParticipants(meetingData.participants || []);
    } catch (err) {
      setError('Failed to load meeting data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMeeting = (meetingId) => {
    return onSnapshot(
      getMeetingRef(meetingId),
      (snapshot) => {
        const data = snapshot.data();
        setCurrentMeeting(data);
        setParticipants(data.participants || []);
      },
      (err) => {
        console.error('Error subscribing to meeting updates:', err);
        setError('Failed to get live updates');
      }
    );
  };

  const submitAgendaItem = async (meetingId, item) => {
    try {
      if (!currentMeeting) return;
      
      const updatedAgenda = [...(currentMeeting.agenda || []), item];
      await updateMeeting(meetingId, { agenda: updatedAgenda });
    } catch (err) {
      setError('Failed to add agenda item');
      console.error(err);
    }
  };

  const generateAIAgenda = async (meetingId) => {
    try {
      setLoading(true);
      await triggerAIAgendaGeneration(meetingId);
    } catch (err) {
      setError('Failed to generate AI agenda');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentMeeting,
    loading,
    error,
    participants,
    fetchMeeting,
    subscribeToMeeting,
    submitAgendaItem,
    generateAIAgenda,
  };

  return (
    <MeetingContext.Provider value={value}>
      {children}
    </MeetingContext.Provider>
  );
};

// File: src/pages/CreateMeetingPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMeeting } from '../services/meetingService';

const CreateMeetingPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    description: '',
    attendees: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Format attendees as array
      const attendeesArray = formData.attendees
        .split(',')
        .map((email) => email.trim())
        .filter((email) => email !== '');

      const meetingData = {
        title: formData.title,
        date: formData.date,
        time: formData.time,
        description: formData.description,
        participants: attendeesArray.map(email => ({
          email,
          hasResponded: false
        })),
        createdAt: new Date(),
        agenda: [],
        status: 'draft'
      };

      const meetingId = await createMeeting(meetingData);
      navigate(`/meeting/${meetingId}`);
    } catch (err) {
      setError('Failed to create meeting');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="create-meeting-container">
      <h1>Create New Meeting</h1>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Meeting Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Weekly Team Sync"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="time">Time</label>
            <input
              type="time"
              id="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (Optional)</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Brief description of the meeting purpose"
            rows="3"
          />
        </div>

        <div className="form-group">
          <label htmlFor="attendees">Attendees (comma-separated emails)</label>
          <textarea
            id="attendees"
            name="attendees"
            value={formData.attendees}
            onChange={handleChange}
            placeholder="john@example.com, jane@example.com"
            required
            rows="2"
          />
        </div>

        <button type="submit" className="primary-button" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Meeting'}
        </button>
      </form>
    </div>
  );
};

export default CreateMeetingPage;

// File: src/pages/MeetingPage.js
import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MeetingContext } from '../context/MeetingContext';
import MarkdownEditor from '../components/MarkdownEditor';
import ParticipantStatus from '../components/ParticipantStatus';
import AIGenerateButton from '../components/AIGenerateButton';
import AgendaItem from '../components/AgendaItem';
import { updateMeetingParticipant } from '../services/meetingService';

const MeetingPage = () => {
  const { meetingId } = useParams();
  const { 
    currentMeeting, 
    loading, 
    error, 
    participants,
    fetchMeeting, 
    subscribeToMeeting, 
    generateAIAgenda 
  } = useContext(MeetingContext);
  const [participantEmail, setParticipantEmail] = useState('');
  const [isIdentified, setIsIdentified] = useState(false);
  const [newAgendaItem, setNewAgendaItem] = useState('');

  useEffect(() => {
    // Check if user has already identified themselves in localStorage
    const storedEmail = localStorage.getItem(`meeting_${meetingId}_email`);
    if (storedEmail) {
      setParticipantEmail(storedEmail);
      setIsIdentified(true);
    }
    
    fetchMeeting(meetingId);
    const unsubscribe = subscribeToMeeting(meetingId);
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [meetingId]);

  const handleIdentify = () => {
    if (participantEmail.trim() === '') return;
    
    // Save to localStorage for future visits
    localStorage.setItem(`meeting_${meetingId}_email`, participantEmail);
    setIsIdentified(true);
    
    // Mark participant as responded
    updateMeetingParticipant(meetingId, participantEmail, { hasResponded: true });
  };

  const handleAddAgendaItem = async () => {
    if (newAgendaItem.trim() === '') return;
    
    const agendaItem = {
      id: Date.now().toString(),
      text: newAgendaItem,
      createdBy: participantEmail,
      votes: 0,
      createdAt: new Date(),
      comments: []
    };
    
    await submitAgendaItem(meetingId, agendaItem);
    setNewAgendaItem('');
  };

  const handleGenerateAI = () => {
    generateAIAgenda(meetingId);
  };

  if (loading && !currentMeeting) {
    return <div className="loading">Loading meeting data...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  if (!currentMeeting) {
    return <div className="error-container">Meeting not found</div>;
  }

  // If user hasn't identified themselves yet
  if (!isIdentified) {
    return (
      <div className="identify-container">
        <h2>Join the meeting planning</h2>
        <p>Please enter your email to contribute to the agenda:</p>
        <div className="email-input-container">
          <input
            type="email"
            value={participantEmail}
            onChange={(e) => setParticipantEmail(e.target.value)}
            placeholder="Your email"
          />
          <button onClick={handleIdentify}>Join</button>
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-page">
      <header className="meeting-header">
        <h1>{currentMeeting.title}</h1>
        <div className="meeting-info">
          <p>{new Date(currentMeeting.date).toLocaleDateString()} at {currentMeeting.time}</p>
          <p className="description">{currentMeeting.description}</p>
        </div>
      </header>

      <div className="meeting-body">
        <div className="sidebar">
          <ParticipantStatus participants={participants} />
          
          <div className="meeting-actions">
            <AIGenerateButton onClick={handleGenerateAI} loading={loading} />
            <button className="share-button">
              Copy Meeting URL
            </button>
            {currentMeeting.status === 'finalized' && (
              <Link to={`/post-meeting/${meetingId}`} className="button">
                Go to Post-Meeting
              </Link>
            )}
          </div>
        </div>

        <div className="agenda-container">
          <h2>Meeting Agenda</h2>
          
          {currentMeeting.meetingNecessary === false && (
            <div className="ai-recommendation">
              <h3>AI Recommendation: Meeting Not Necessary</h3>
              <p>{currentMeeting.meetingRecommendation}</p>
            </div>
          )}
          
          <div className="agenda-items">
            {currentMeeting.agenda && currentMeeting.agenda.length > 0 ? (
              currentMeeting.agenda.map((item) => (
                <AgendaItem 
                  key={item.id} 
                  item={item} 
                  meetingId={meetingId}
                  userEmail={participantEmail}
                />
              ))
            ) : (
              <p className="no-items">No agenda items yet. Add one below or use AI to generate.</p>
            )}
          </div>
          
          <div className="add-item">
            <MarkdownEditor
              value={newAgendaItem}
              onChange={setNewAgendaItem}
              placeholder="Add a new agenda item..."
            />
            <button onClick={handleAddAgendaItem}>Add Item</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingPage;

// File: src/components/MarkdownEditor.js
import React from 'react';
import ReactMarkdown from 'react-markdown';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';

const MarkdownEditor = ({ value, onChange, placeholder }) => {
  return (
    <div className="markdown-editor">
      <SimpleMDE
        value={value}
        onChange={onChange}
        options={{
          placeholder: placeholder,
          spellChecker: true,
          toolbar: [
            'bold', 
            'italic', 
            'heading', 
            '|', 
            'unordered-list', 
            'ordered-list', 
            '|', 
            'guide'
          ],
        }}
      />
    </div>
  );
};

export default MarkdownEditor;

// File: src/components/AgendaItem.js
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { updateAgendaItem, addCommentToAgendaItem } from '../services/meetingService';

const AgendaItem = ({ item, meetingId, userEmail }) => {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');

  const handleVote = async () => {
    await updateAgendaItem(meetingId, item.id, {
      votes: item.votes + 1
    });
  };

  const handleAddComment = async () => {
    if (newComment.trim() === '') return;
    
    const comment = {
      id: Date.now().toString(),
      text: newComment,
      createdBy: userEmail,
      createdAt: new Date()
    };
    
    await addCommentToAgendaItem(meetingId, item.id, comment);
    setNewComment('');
  };

  return (
    <div className="agenda-item">
      <div className="item-header">
        <div className="vote-section">
          <button className="vote-button" onClick={handleVote}>
            <span className="vote-count">{item.votes}</span>
            <span className="vote-icon">▲</span>
          </button>
        </div>
        
        <div className="item-content">
          <ReactMarkdown>{item.text}</ReactMarkdown>
          <div className="item-meta">
            Added by {item.createdBy} | {new Date(item.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
      
      <div className="item-actions">
        <button 
          className="comments-toggle" 
          onClick={() => setShowComments(!showComments)}
        >
          {item.comments?.length || 0} comments
        </button>
      </div>
      
      {showComments && (
        <div className="comments-section">
          {item.comments && item.comments.length > 0 ? (
            <div className="comments-list">
              {item.comments.map(comment => (
                <div key={comment.id} className="comment">
                  <div className="comment-text">{comment.text}</div>
                  <div className="comment-meta">
                    {comment.createdBy} | {new Date(comment.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-comments">No comments yet</p>
          )}
          
          <div className="add-comment">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
            />
            <button onClick={handleAddComment}>Comment</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaItem;

// File: src/components/ParticipantStatus.js
import React, { useState } from 'react';

const ParticipantStatus = ({ participants }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const respondedCount = participants.filter(p => p.hasResponded).length;
  const totalCount = participants.length;
  
  return (
    <div className="participant-status">
      <div className="status-summary" onClick={() => setIsOpen(!isOpen)}>
        <h3>Participants ({respondedCount}/{totalCount} responded)</h3>
        <span className={isOpen ? 'arrow-up' : 'arrow-down'}>▼</span>
      </div>
      
      {isOpen && (
        <div className="participants-list">
          {participants.map((participant, index) => (
            <div key={index} className="participant-item">
              <span className="participant-email">{participant.email}</span>
              <span className={`status-indicator ${participant.hasResponded ? 'responded' : 'pending'}`}>
                {participant.hasResponded ? 'Responded' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParticipantStatus;

// File: src/components/AIGenerateButton.js
import React from 'react';

const AIGenerateButton = ({ onClick, loading }) => {
  return (
    <button 
      className="ai-generate-button" 
      onClick={onClick}
      disabled={loading}
    >
      {loading ? 'AI Processing...' : 'Generate AI Agenda'}
    </button>
  );
};

export default AIGenerateButton;

// File: src/pages/PostMeetingPage.js
import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { MeetingContext } from '../context/MeetingContext';
import { updateMeeting } from '../services/meetingService';
import MarkdownEditor from '../components/MarkdownEditor';

const PostMeetingPage = () => {
  const { meetingId } = useParams();
  const { currentMeeting, loading, error, fetchMeeting } = useContext(MeetingContext);
  const [actionItems, setActionItems] = useState('');
  const [keyTakeaways, setKeyTakeaways] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  useEffect(() => {
    fetchMeeting(meetingId);
  }, [meetingId]);
  
  useEffect(() => {
    if (currentMeeting) {
      setActionItems(currentMeeting.actionItems || '');
      setKeyTakeaways(currentMeeting.keyTakeaways || '');
    }
  }, [currentMeeting]);
  
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      await updateMeeting(meetingId, {
        actionItems,
        keyTakeaways,
        status: 'completed'
      });
      setSaveSuccess(true);
    } catch (err) {
      console.error('Error saving post-meeting data:', err);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleGenerateAI = async () => {
    setIsSaving(true);
    
    try {
      // Call AI service to generate action items and takeaways
      await generatePostMeetingSummary(meetingId);
      
      // Refresh meeting data
      await fetchMeeting(meetingId);
    } catch (err) {
      console.error('Error generating AI summary:', err);
    } finally {
      setIsSaving(false);
    }
  };
  
  if (loading && !currentMeeting) {
    return <div className="loading">Loading meeting data...</div>;
  }
  
  if (error) {
    return <div className="error-container">{error}</div>;
  }
  
  if (!currentMeeting) {
    return <div className="error-container">Meeting not found</div>;
  }
  
  return (
    <div className="post-meeting-page">
      <header className="meeting-header">
        <h1>Post-Meeting Summary: {currentMeeting.title}</h1>
        <div className="meeting-info">
          <p>{new Date(currentMeeting.date).toLocaleDateString()} at {currentMeeting.time}</p>
        </div>
      </header>
      
      <div className="post-meeting-content">
        <div className="original-agenda">
          <h2>Original Agenda</h2>
          <div className="agenda-items">
            {currentMeeting.agenda && currentMeeting.agenda.map((item) => (
              <div key={item.id} className="agenda-item-readonly">
                <div className="item-votes">{item.votes} votes</div>
                <div className="item-text">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="post-meeting-inputs">
          <h2>Meeting Outcomes</h2>
          
          <div className="input-section">
            <h3>Action Items</h3>
            <MarkdownEditor
              value={actionItems}
              onChange={setActionItems}
              placeholder="List action items from the meeting..."
            />
          </div>
          
          <div className="input-section">
            <h3>Key Takeaways</h3>
            <MarkdownEditor
              value={keyTakeaways}
              onChange={setKeyTakeaways}
              placeholder="Summarize key decisions and important points..."
            />
          </div>
          
          <div className="button-group">
            <button 
              className="ai-generate-button"
              onClick={handleGenerateAI}
              disabled={isSaving}
            >
              AI Assist
            </button>
            
            <button 
              className="save-button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save & Share'}
            </button>
          </div>
          
          {saveSuccess && (
            <div className="success-message">
              Meeting summary saved successfully!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostMeetingPage;
