# Chat App for Vercel

This is a chat application designed to run on Vercel using serverless functions.

## Setup Instructions

1. Create a Pusher account at https://pusher.com/ and create a new app
2. Copy `.env.example` to `.env` and fill in your Pusher credentials
3. Update the Pusher key and cluster in `index.html` (replace 'YOUR_PUSHER_KEY' and 'YOUR_PUSHER_CLUSTER')
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

## Troubleshooting

If you encounter a 403 error:
- Make sure your Pusher credentials are correct
- Check that you've updated the Pusher key and cluster in index.html
- Verify that your Pusher app has client events enabled in the Pusher dashboard

## How It Works

This application uses:
- Vercel serverless functions for the backend API
- Pusher for real-time communication
- Public channels instead of presence channels to avoid authentication issues
