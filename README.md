# WhatsApp API with Baileys and MySQL Session Storage

A REST API for managing multiple WhatsApp sessions using Baileys with MySQL-based session storage.

## Features

- Multiple user session management
- MySQL-based session storage for production use
- QR code generation and scanning
- Session status tracking and events
- Message sending (text and media)
- Webhook notifications for session events
- RESTful API design
- Type-safe implementation with TypeScript

## Architecture

The project follows a modular architecture with separation of concerns:

- **Core** - Core domain logic 
  - **Sessions** - Session management and factories
  - **Events** - Event management for session updates
  - **Types** - Type definitions
- **Services** - Business logic and operations
- **Controllers** - HTTP request handlers
- **Routes** - API endpoint definitions
- **Middleware** - Request processing middleware
- **Config** - Application configuration
- **Utils** - Utility functions

## Prerequisites

- Node.js (v14+)
- MySQL (v5.7+)
- npm or yarn

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd baileys-api-rest
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file with your MySQL credentials and other settings.

4. Build the project:
   ```
   npm run build
   ```

5. Start the server:
   ```
   npm start
   ```

## API Endpoints

### Session Management

- `POST /api/sessions` - Create a new WhatsApp session
- `GET /api/sessions/:sessionId` - Get session information
- `GET /api/sessions/:sessionId/qr` - Get session QR code
- `DELETE /api/sessions/:sessionId` - Stop and remove a session
- `GET /api/users/:userId/sessions` - Get all sessions for a user
- `GET /api/admin/sessions` - Get all sessions (admin only)

### Messaging

- `POST /api/sessions/:sessionId/messages/text` - Send a text message
- `POST /api/sessions/:sessionId/messages/media` - Send a media message

### Webhooks

- `POST /api/sessions/:sessionId/webhook` - Register a webhook URL
- `DELETE /api/sessions/:sessionId/webhook` - Unregister a webhook

## Usage Example

### Creating a Session

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"userId": "user123"}'
```

### Sending a Message

```bash
curl -X POST http://localhost:3000/api/sessions/SESSION_ID/messages/text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to": "5551234567",
    "text": "Hello from the WhatsApp API!"
  }'
```

## Session Lifecycle

1. **Creation**: A new session is created with status `STARTING`
2. **QR Code**: QR code is generated with status `SCANNING_QR`
3. **Connection**: Once scanned, status changes to `CONNECTED`
4. **Usage**: The session can be used to send messages
5. **Disconnection**: If disconnected, status changes to `DISCONNECTED`
6. **Stopping**: When explicitly stopped, status changes to `STOPPED`

## Development

Start the development server with hot reloading:

```
npm run dev
```

## License

MIT


# CURRENT PROGRESS

- Webhook to receive text messages
- Endpoint to send text messages
- Endpoint to send media messages
- Session restoration
- QR endpoint

