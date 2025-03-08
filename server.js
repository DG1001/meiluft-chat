const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Funny names for users
const funnyNames = [
  "Silly Goose", "Wacky Wombat", "Crazy Cat", "Bubbly Bear",
  "Jolly Jellyfish", "Sassy Sloth", "Dizzy Dolphin", "Cheeky Monkey",
  "Nerdy Narwhal", "Funky Flamingo", "Quirky Quokka", "Zany Zebra",
  "Playful Penguin", "Dapper Duck", "Giggly Giraffe", "Mischievous Mongoose",
  "Bouncy Bunny", "Charming Chinchilla", "Radiant Raccoon", "Dizzy Dingo"
];

// Store rooms and messages
const rooms = {};

class ChatRoom {
  constructor(roomId) {
    this.id = roomId;
    this.clients = new Set();
    this.messages = [];
    this.assignedNames = new Set();
    this.aiName = "ChatGPT-Mini";
  }
  
  addClient(socketId, userName = null) {
    this.clients.add(socketId);
    if (!userName) {
      userName = this.getUniqueFunnyName();
    }
    return userName;
  }
  
  removeClient(socketId, userName) {
    this.clients.delete(socketId);
    if (userName) {
      this.assignedNames.delete(userName);
    }
  }
  
  addMessage(content, sender) {
    const message = {
      content,
      sender,
      timestamp: new Date().toISOString()
    };
    this.messages.push(message);
    // Keep only last 100 messages
    if (this.messages.length > 100) {
      this.messages.shift();
    }
    return message;
  }
  
  getUniqueFunnyName() {
    const availableNames = funnyNames.filter(name => !this.assignedNames.has(name));
    if (availableNames.length === 0) {
      return "Anonymous";
    }
    const name = availableNames[Math.floor(Math.random() * availableNames.length)];
    this.assignedNames.add(name);
    return name;
  }
  
  handleAiResponse(messageContent) {
    if (messageContent.startsWith('ai:')) {
      return `I received your message: "${messageContent.substring(3).trim()}"`;
    }
    return null;
  }
}

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Socket.io events
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Store user names for this socket
  const userNames = {};
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    // Find and remove client from any rooms
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.clients.has(socket.id)) {
        const userName = userNames[roomId];
        room.removeClient(socket.id, userName);
        if (room.clients.size === 0) {  // If room is empty, remove it
          delete rooms[roomId];
        }
        break;
      }
    }
  });
  
  socket.on('create', () => {
    let roomId = generateRoomId();
    while (rooms[roomId]) {  // Ensure unique room ID
      roomId = generateRoomId();
    }
    
    const room = new ChatRoom(roomId);
    rooms[roomId] = room;
    
    const userName = room.addClient(socket.id);
    socket.join(roomId);
    
    // Store user name
    userNames[roomId] = userName;
    
    socket.emit('created', { type: 'created', roomId, userName });
  });
  
  socket.on('join', (data) => {
    const roomId = data.roomId;
    if (rooms[roomId]) {
      const room = rooms[roomId];
      const userName = room.addClient(socket.id);
      socket.join(roomId);
      
      // Store user name
      userNames[roomId] = userName;
      
      // Send chat history
      if (room.messages.length > 0) {
        socket.emit('history', { type: 'history', messages: room.messages });
      }
      
      socket.emit('joined', { type: 'joined', roomId, userName });
    } else {
      socket.emit('error', { type: 'error', message: 'Room not found' });
    }
  });
  
  socket.on('message', (data) => {
    // Find which room this socket is in
    let roomId = null;
    for (const id in rooms) {
      if (rooms[id].clients.has(socket.id)) {
        roomId = id;
        break;
      }
    }
    
    if (roomId) {
      const room = rooms[roomId];
      const userName = userNames[roomId] || "Anonymous";
      
      const content = data.content || '';
      const message = room.addMessage(content, userName);
      
      // Broadcast to others in the room
      socket.to(roomId).emit('message', {
        type: 'message',
        content,
        sender: userName
      });
      
      // Check for AI response
      const aiResponse = room.handleAiResponse(content);
      if (aiResponse) {
        const aiMessage = room.addMessage(aiResponse, room.aiName);
        io.to(roomId).emit('message', {
          type: 'message',
          content: aiResponse,
          sender: room.aiName
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
