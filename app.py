from flask import Flask, render_template, request, jsonify, session
from flask_socketio import SocketIO, emit, join_room, leave_room
import random
import json
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv
import os
import argparse
import base64
from io import BytesIO
from PIL import Image
import requests

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
load_dotenv()
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

socketio = SocketIO(app, cors_allowed_origins="*")

# Parse command-line argument for image generation
parser = argparse.ArgumentParser(description="Meiluft Chat with optional image generation")
parser.add_argument('--generate-images', action='store_true', help="Enable image generation for rooms")
args = parser.parse_args()
GENERATE_IMAGES = args.generate_images

# Funny names for users
funny_names = [
    "Silly Goose", "Wacky Wombat", "Crazy Cat", "Bubbly Bear", "Jolly Jellyfish",
    "Sassy Sloth", "Dizzy Dolphin", "Cheeky Monkey", "Nerdy Narwhal", "Funky Flamingo",
    "Quirky Quokka", "Zany Zebra", "Playful Penguin", "Dapper Duck", "Giggly Giraffe",
    "Mischievous Mongoose", "Bouncy Bunny", "Charming Chinchilla", "Radiant Raccoon", "Dizzy Dingo",
    "Peppy Panda", "Lively Lemur", "Goofy Gopher", "Ticklish Toad", "Whimsical Walrus",
    "Prancing Puma", "Snoozy Sparrow", "Jumpy Jaguar", "Kooky Koala", "Merry Meerkat",
    "Bizarre Badger", "Cuddly Coyote", "Fizzy Ferret", "Hoppy Hippo", "Puffy Puffin",
    "Snazzy Squirrel", "Twirly Turtle", "Vivid Vulture", "Wiggly Weasel", "Zippy Zucchini"
]

# Global rooms dictionary (ensure it persists)
if 'rooms' not in globals():
    rooms = {}

# Word list for three-word room codes
room_words = [
    "apple", "bear", "bird", "boat", "book", "cake", "cat", "cloud", "deer", "dog",
    "door", "duck", "eagle", "fish", "flower", "fox", "frog", "gate", "goat", "hat",
    "hill", "horse", "house", "key", "lake", "leaf", "lion", "moon", "mouse", "owl",
    "path", "pig", "rain", "river", "rock", "rose", "sand", "sheep", "sky", "snow",
    "star", "stone", "sun", "tree", "wave", "wind", "wolf", "wood", "zebra"
]

class ChatRoom:
    def __init__(self, room_id):
        self.id = room_id
        self.clients = set()
        self.messages = []
        self.assigned_names = set()
        self.ai_name = "AIWitMaster"
        if GENERATE_IMAGES:
            self.image_base64 = self.generate_room_image(room_id)
        else:
            self.image_base64 = None
    
    def add_client(self, sid, user_name=None):
        self.clients.add(sid)
        if not user_name:
            user_name = self.get_unique_funny_name()
        return user_name
    
    def remove_client(self, sid, user_name):
        self.clients.discard(sid)
        if user_name:
            self.assigned_names.discard(user_name)
    
    def add_message(self, content, sender):
        message = {
            'content': content,
            'sender': sender,
            'timestamp': datetime.now().isoformat()
        }
        self.messages.append(message)
        # Keep only last 100 messages
        if len(self.messages) > 100:
            self.messages.pop(0)
        return message
    
    def get_unique_funny_name(self):
        available_names = [name for name in funny_names if name not in self.assigned_names]
        if not available_names:
            return "Anonymous"
        name = random.choice(available_names)
        self.assigned_names.add(name)
        return name
    
    def get_ai_response(self, message_content, history):
        messages = [{'role': 'system', 'content': 'You are a friendly, witty AI assistant named AIWitMaster. Keep responses concise (under 50 words) and complete, avoiding cutoffs.'}]
        messages.extend(history)  # Include chat history
        messages.append({'role': 'user', 'content': message_content})
        response = openai_client.chat.completions.create(
            model='gpt-4o-mini',
            messages=messages,
            max_tokens=100,  # Reduced to enforce brevity
            temperature=0.7
        )
        return response.choices[0].message.content.strip()

    def handle_ai_response(self, message_content):
        num_clients = len(self.clients)
        history = [{'role': 'user' if msg['sender'] != self.ai_name else 'assistant', 
                    'content': msg['content']} for msg in self.messages[-5:]]  # Last 5 messages for context
        
        if num_clients == 1:  # Only one user: AI responds to everything
            return self.get_ai_response(message_content, history)
        elif message_content.startswith('ai:'):  # Multiple users: AI responds only if invoked
            return self.get_ai_response(message_content[3:].strip(), history)
        return None

    def generate_room_image(self, room_id):
        if not GENERATE_IMAGES:
            return None
        words = room_id.split('.')
        prompt = f"A whimsical illustration of {words[0]}, {words[1]}, and {words[2]}, in a fantasy style, vibrant colors, 256x256 resolution"
        response = openai_client.images.generate(
            model="dall-e-2",
            prompt=prompt,
            n=1,
            size="256x256"
        )
        image_url = response.data[0].url
        # Fetch and convert image to base64
        response = requests.get(image_url)
        image = Image.open(BytesIO(response.content))
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode('utf-8')

def generate_room_id():
    return '.'.join(random.choice(room_words) for _ in range(3))

# Routes
@app.route('/')
def index():
    return render_template('index.html')

# Socket events
@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")
    # Find and remove client from any rooms
    for room_id, room in rooms.items():
        if request.sid in room.clients:
            user_name = next((name for name in room.assigned_names if name in session.get('user_names', {}).values()), None)
            room.remove_client(request.sid, user_name)
            if not room.clients:  # If room is empty, remove it
                rooms.pop(room_id, None)
            print(f"Room '{room_id}' removed. Remaining rooms: {list(rooms.keys())}")
            break
    print(f"Rooms after disconnect: {list(rooms.keys())}")

@socketio.on('create')
def handle_create():
    room_id = generate_room_id()
    while room_id in rooms:  # Ensure unique room ID
        room_id = generate_room_id()
    
    room = ChatRoom(room_id)
    rooms[room_id] = room
    
    user_name = room.add_client(request.sid)
    join_room(room_id)
    
    # Store user name in session
    if 'user_names' not in session:
        session['user_names'] = {}
    session['user_names'][room_id] = user_name
    
    emit('created', {'type': 'created', 'roomId': room_id, 'userName': user_name,
                     'imageBase64': room.image_base64 if GENERATE_IMAGES else None})
    print(f"Room created successfully: '{room_id}'")
    print(f"Rooms after creation: {list(rooms.keys())}")

@socketio.on('join')
def handle_join(data):
    room_id = data.get('roomId')
    if room_id:
        room_id = room_id.lower().strip()  # Normalize to lowercase and strip
    print(f"Received join request: raw data = {data}, normalized room_id = '{room_id}'")
    print(f"Available rooms: {list(rooms.keys())}")
    if room_id in rooms:
        room = rooms[room_id]
        user_name = room.add_client(request.sid)
        join_room(room_id)
        print(f"Join successful: '{room_id}' with user '{user_name}'")
        
        # Store user name in session
        if 'user_names' not in session:
            session['user_names'] = {}
        session['user_names'][room_id] = user_name
        
        # Send chat history
        if room.messages:
            emit('history', {'type': 'history', 'messages': room.messages})
        
        emit('joined', {'type': 'joined', 'roomId': room_id, 'userName': user_name,
                        'imageBase64': room.image_base64 if GENERATE_IMAGES else None})
    else:
        emit('error', {'type': 'error', 'message': f"Room '{room_id}' not found"})

@socketio.on('message')
def handle_message(data):
    room_id = next((room_id for room_id, room in rooms.items() if request.sid in room.clients), None)
    if room_id:
        room = rooms[room_id]
        user_name = session.get('user_names', {}).get(room_id)
        if not user_name:
            user_name = "Anonymous"
        
        content = data.get('content', '')
        message = room.add_message(content, user_name)
        
        # Broadcast to others in the room
        emit('message', {
            'type': 'message',
            'content': content,
            'sender': user_name
        }, room=room_id, skip_sid=request.sid)
        
        # Check for AI response
        ai_response = room.handle_ai_response(content)
        if ai_response:
            ai_message = room.add_message(ai_response, room.ai_name)
            emit('message', {
                'type': 'message',
                'content': ai_response,
                'sender': room.ai_name
            }, room=room_id)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=False)
