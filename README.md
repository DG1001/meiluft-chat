# Meiluft Chat

A real-time chat application built with Python, Flask, and Flask-SocketIO, featuring a modern macOS-inspired UI.

## Features

- Create and join chat rooms with unique three-word codes (e.g., apple.bear.cloud)
- Real-time messaging with a sleek, frosted-glass interface
- Random funny usernames (e.g., "Wacky Wombat", "Zippy Zucchini")
- Simple AI responses (prefix your message with "ai:" for a reply from "ChatGPT-Mini")
- Message history (up to 100 messages per room)

## How to Use

1. Create a Room: Click "Create New Room" to generate a unique three-word code.
2. Join a Room: Enter a room code (e.g., fox.river.star) and click "Join".
3. Chat: Send messages in real-time; use "ai: [your message]" for an AI reply.
4. Note: Rooms are removed when all users disconnect.

## Setup

1. Clone the repository.
2. Install dependencies: pip install -r requirements.txt
3. Run the app: python app.py
4. Open http://localhost:5000 in your browser.
