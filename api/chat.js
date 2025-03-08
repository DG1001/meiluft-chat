import Pusher from 'pusher';

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

const funnyNames = [
  "Silly Goose", "Wacky Wombat", "Crazy Cat", "Bubbly Bear",
  "Jolly Jellyfish", "Sassy Sloth", "Dizzy Dolphin", "Cheeky Monkey",
  "Nerdy Narwhal", "Funky Flamingo", "Quirky Quokka", "Zany Zebra",
  "Playful Penguin", "Dapper Duck", "Giggly Giraffe", "Mischievous Mongoose",
  "Bouncy Bunny", "Charming Chinchilla", "Radiant Raccoon", "Dizzy Dingo"
];

// In-memory storage (Note: this will reset on each function invocation)
// For production, use a database like MongoDB, Fauna, or Supabase
const rooms = new Map();
const userNames = new Map();

class ChatRoom {
  constructor(id) {
    this.id = id;
    this.messages = [];
    this.assignedNames = new Set();
    this.aiName = "ChatGPT-Mini";
  }

  addMessage(message) {
    this.messages.push(message);
    // Keep only last 100 messages
    if (this.messages.length > 100) {
      this.messages.shift();
    }
  }

  getUniqueFunnyName() {
    const availableNames = funnyNames.filter(name => !this.assignedNames.has(name));
    if (availableNames.length === 0) {
      return "Anonymous"; // Fallback if all names are used
    }
    const name = availableNames[Math.floor(Math.random() * availableNames.length)];
    this.assignedNames.add(name);
    return name;
  }

  handleAIResponse(messageContent) {
    if (messageContent.startsWith('ai:')) {
      return `AI (${this.aiName}): I received your message: "${messageContent.slice(3).trim()}"`;
    }
    return null;
  }
}

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const data = req.body;
      
      if (data.type === 'create') {
        const roomId = generateRoomId();
        if (!rooms.has(roomId)) {
          rooms.set(roomId, new ChatRoom(roomId));
        }
        const room = rooms.get(roomId);
        const userName = room.getUniqueFunnyName();
        userNames.set(data.userId, userName);
        
        // Use a public channel instead of presence channel
        await pusher.trigger(`room-${roomId}`, 'room-created', {
          roomId,
          userName
        });
        
        res.status(200).json({ 
          type: 'created', 
          roomId, 
          userName 
        });
      }
      else if (data.type === 'join') {
        const room = rooms.get(data.roomId);
        if (room) {
          const userName = room.getUniqueFunnyName();
          userNames.set(data.userId, userName);
          
          // Send chat history through the response
          res.status(200).json({ 
            type: 'joined', 
            roomId: data.roomId, 
            userName,
            messages: room.messages
          });
        } else {
          res.status(404).json({ type: 'error', message: 'Room not found' });
        }
      }
      else if (data.type === 'message') {
        const room = rooms.get(data.roomId);
        if (room) {
          const userName = userNames.get(data.userId) || 'Anonymous';
          
          const messageData = {
            content: data.content,
            sender: userName,
            timestamp: new Date().toISOString()
          };
          
          room.addMessage(messageData);
          
          // Broadcast the message to all clients in the room
          await pusher.trigger(`room-${data.roomId}`, 'new-message', messageData);
          
          // Check for AI response
          const aiResponse = room.handleAIResponse(data.content);
          if (aiResponse) {
            const aiMessageData = {
              content: aiResponse,
              sender: room.aiName,
              timestamp: new Date().toISOString()
            };
            room.addMessage(aiMessageData);
            await pusher.trigger(`room-${data.roomId}`, 'new-message', aiMessageData);
          }
          
          res.status(200).json({ success: true });
        } else {
          res.status(404).json({ type: 'error', message: 'Room not found' });
        }
      }
      else {
        res.status(400).json({ type: 'error', message: 'Invalid request type' });
      }
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({ type: 'error', message: 'Server error: ' + error.message });
    }
  } else {
    res.status(405).json({ type: 'error', message: 'Method not allowed' });
  }
}
