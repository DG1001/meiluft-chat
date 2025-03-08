# Meiluft Chat

A real-time chat application built with Python, Flask, and Flask-SocketIO, featuring a modern macOS-inspired UI.

## Features

- Create and join chat rooms with unique three-word codes (e.g., apple.bear.cloud)
- Real-time messaging with a sleek, frosted-glass interface
- Random funny usernames (e.g., "Wacky Wombat", "Zippy Zucchini")
- AI-powered responses using GPT-4o-mini:
  - For solo users: AI automatically responds to all messages
  - For group chats: Prefix your message with "ai:" to get a response from "AIWitMaster"
- Optional room illustrations generated with DALL-E 2
- Message history (up to 100 messages per room)

## How to Use

1. Create a Room: Click "Create New Room" to generate a unique three-word code.
2. Join a Room: Enter a room code (e.g., fox.river.star) and click "Join".
3. Chat: Send messages in real-time; use "ai: [your message]" in group chats for an AI reply.
4. Note: Rooms are removed when all users disconnect.

## Setup

1. Clone the repository.
2. Install dependencies: `pip install -r requirements.txt`
3. Create a `.env` file with your OpenAI API key: `OPENAI_API_KEY=your-key-here`
4. Run the app: 
   - Basic mode: `python app.py`
   - With image generation: `python app.py --generate-images`
5. Open http://localhost:5000 in your browser.
