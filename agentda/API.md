# Agentda API Documentation

## Authentication

All API routes except authentication endpoints require a valid Firebase ID token in the Authorization header:
```
Authorization: Bearer <firebase_id_token>
```

## API Endpoints

### Authentication

#### `POST /api/auth/login`
Authenticate a user with email and password.

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "photoURL": "string?",
    "organizationId": "string?"
  },
  "token": "string"
}
```

### Meetings

#### `GET /api/meetings`
Get all meetings for the authenticated user.

**Response:**
```json
{
  "meetings": [
    {
      "id": "string",
      "title": "string",
      "description": "string?",
      "date": "ISO8601 string",
      "duration": "number",
      "participants": ["string"],
      "createdBy": "string",
      "organizationId": "string",
      "status": "scheduled | in-progress | completed | cancelled",
      "hasAgenda": "boolean"
    }
  ]
}
```

#### `POST /api/meetings`
Create a new meeting.

**Request:**
```json
{
  "title": "string",
  "description": "string?",
  "date": "ISO8601 string",
  "duration": "number",
  "participants": ["string"],
  "organizationId": "string",
  "allowGuests": "boolean"
}
```

#### `GET /api/meetings/[id]`
Get a specific meeting by ID.

**Response:**
```json
{
  "id": "string",
  "title": "string",
  "description": "string?",
  "date": "ISO8601 string",
  "duration": "number",
  "participants": ["string"],
  "createdBy": "string",
  "organizationId": "string",
  "status": "scheduled | in-progress | completed | cancelled",
  "hasAgenda": "boolean"
}
```

### Agenda

#### `GET /api/meetings/[id]/agenda`
Get the agenda for a specific meeting.

**Response:**
```json
{
  "id": "string",
  "meetingId": "string",
  "items": [
    {
      "id": "string",
      "title": "string",
      "description": "string?",
      "duration": "number?",
      "order": "number",
      "status": "pending | in-progress | completed",
      "assignee": "string?",
      "notes": "string?"
    }
  ]
}
```

#### `POST /api/meetings/[id]/agenda/items`
Add a new agenda item.

**Request:**
```json
{
  "title": "string",
  "description": "string?",
  "duration": "number?",
  "assignee": "string?"
}
```

### AI Endpoints

#### `POST /api/ai/agenda`
Generate agenda suggestions.

**Request:**
```json
{
  "goals": ["string"],
  "existingItems": [
    {
      "title": "string",
      "description": "string?"
    }
  ]
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "title": "string",
      "description": "string",
      "duration": "number"
    }
  ],
  "totalDuration": "number"
}
```

#### `POST /api/ai/summarize`
Generate meeting summary.

**Request:**
```json
{
  "item": {
    "title": "string",
    "description": "string"
  },
  "notes": "string"
}
```

**Response:**
```json
{
  "summary": "string",
  "actionItems": [
    {
      "title": "string",
      "assignedTo": "string?"
    }
  ]
}
```

### Decisions

#### `GET /api/meetings/[id]/decisions`
Get all decisions for a meeting.

**Response:**
```json
{
  "decisions": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "madeBy": "string",
      "participants": ["string"],
      "status": "proposed | approved | rejected | deferred",
      "createdAt": "ISO8601 string"
    }
  ]
}
```

#### `POST /api/meetings/[id]/decisions`
Log a new decision.

**Request:**
```json
{
  "title": "string",
  "description": "string",
  "participants": ["string"],
  "status": "proposed | approved | rejected | deferred"
}
```

### Action Items

#### `GET /api/meetings/[id]/action-items`
Get all action items for a meeting.

**Response:**
```json
{
  "actionItems": [
    {
      "id": "string",
      "title": "string",
      "description": "string?",
      "assignedTo": "string",
      "dueDate": "ISO8601 string?",
      "status": "pending | in-progress | completed"
    }
  ]
}
```

#### `POST /api/meetings/[id]/action-items`
Create a new action item.

**Request:**
```json
{
  "title": "string",
  "description": "string?",
  "assignedTo": "string",
  "dueDate": "ISO8601 string?"
}
```

### Files

#### `POST /api/meetings/[id]/attachments`
Upload a file attachment.

**Request:**
```
Content-Type: multipart/form-data
file: File
```

**Response:**
```json
{
  "id": "string",
  "name": "string",
  "url": "string",
  "type": "string",
  "uploadedBy": "string",
  "timestamp": "ISO8601 string"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "string",
  "message": "string"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

API requests are limited to:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users
- 50 requests per day for AI endpoints

## Webhooks

Webhooks are available for the following events:
- Meeting status changes
- New decisions
- Action item updates
- File uploads

Configure webhooks in your organization settings. 