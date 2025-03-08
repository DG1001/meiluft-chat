# Chat App for Vercel

This is a chat application designed to run on Vercel using serverless functions.

## Setup Instructions

1. Create a Pusher account at https://pusher.com/ and create a new app
2. Copy `.env.example` to `.env` and fill in your Pusher credentials
3. Update the Pusher key and cluster in `index.html`
4. Deploy to Vercel:
   ```
   vercel
   ```

## Development

To run locally:

```
npm install
npm run dev
```

## How It Works

This application uses:
- Vercel serverless functions for the backend API
- Pusher for real-time communication
- Vite for frontend development

The chat functionality is implemented in `/api/chat.js` as a serverless function.
