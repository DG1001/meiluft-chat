import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const funnyNames = [
  "Silly Goose", "Wacky Wombat", "Crazy Cat", "Bubbly Bear",
  "Jolly Jellyfish", "Sassy Sloth", "Dizzy Dolphin", "Cheeky Monkey",
  "Nerdy Narwhal", "Funky Flamingo", "Quirky Quokka", "Zany Zebra",
  "Playful Penguin", "Dapper Duck", "Giggly Giraffe", "Mischievous Mongoose",
  "Bouncy Bunny", "Charming Chinchilla", "Radiant Raccoon", "Dizzy Dingo"
];

class ChatRoom {
  constructor(id) {
    this.id = id;
    this.clients = new Set();
    this.messages = [];
    this.assignedNames = new Set(); // Track assigned names
    this.aiName = "ChatGPT-Mini"; // AI agent name
  }

  addClient(ws) {
    this.clients.add(ws);
    ws.roomId = this.id;
    ws.userName = this.getUniqueFunnyName(); // Assign a unique funny name
    // Send chat history to new client
    if (this.messages.length > 0) {
      ws.send(JSON.stringify({
        type: 'history',
        messages: this.messages
      }));
    }
  }

  removeClient(ws) {
    this.clients.delete(ws);
    this.assignedNames.delete(ws.userName); // Remove name when client leaves
  }

  addMessage(message) {
    this.messages.push(message);
    // Keep only last 100 messages
    if (this.messages.length > 100) {
      this.messages.shift();
    }
  }

  broadcast(message, sender) {
    this.clients.forEach(client => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
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

  handleAIResponse(messageContent, sender) {
    if (messageContent.startsWith('ai:')) {
      const response = `AI (${this.aiName}): I received your message: "${messageContent.slice(3).trim()}"`;
      this.broadcast({
        type: 'message',
        content: response,
        sender: this.aiName
      }, sender);
    }
  }
}

const rooms = new Map();

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

const server = createServer(); // Create a standard HTTP server
const wss = new WebSocketServer({ noServer: true }); // Initialize WebSocket server

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'create') {
        const roomId = generateRoomId();
        const room = new ChatRoom(roomId);
        rooms.set(roomId, room);
        room.addClient(ws);
        ws.send(JSON.stringify({ type: 'created', roomId, userName: ws.userName }));
      }
      else if (data.type === 'join') {
        const room = rooms.get(data.roomId);
        if (room) {
          room.addClient(ws);
          ws.send(JSON.stringify({ type: 'joined', roomId: data.roomId, userName: ws.userName }));
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        }
      }
      else if (data.type === 'message') {
        const room = rooms.get(ws.roomId);
        if (room) {
          const messageData = {
            content: data.content,
            sender: ws.userName, // Use the user's funny name
            timestamp: new Date().toISOString()
          };
          room.addMessage(messageData);
          room.broadcast({
            type: 'message',
            content: data.content,
            sender: ws.userName // Send the user's funny name
          }, ws);
          room.handleAIResponse(data.content, ws); // Check for AI response
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    const room = rooms.get(ws.roomId);
    if (room) {
      room.removeClient(ws);
    }
  });
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});


export default (req, res) => {
    if (req.url === '/api/chat') {
        // Vercel handles the upgrade, so we just need to attach our WebSocket server
        if (!server.listening) {
            server.listen(0, '127.0.0.1', () => { // Listen on a random port, Vercel handles the actual external port
                console.log(`Server listening for upgrades on a random port`);
            });
        }
        // Do nothing here, the 'upgrade' event will handle the WebSocket connection
        res.status(200).send('WebSocket endpoint ready');
    } else {
        res.status(404).send('Not Found');
    }
};
