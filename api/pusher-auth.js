import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

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
    const { socket_id, channel_name, userId } = req.body;
    
    // In a real app, you would validate the user here
    const presenceData = {
      user_id: userId,
      user_info: {
        name: userId // You could look up the actual name from a database
      }
    };
    
    try {
      const auth = pusher.authorizeChannel(socket_id, channel_name, presenceData);
      res.status(200).json(auth);
    } catch (error) {
      console.error('Error authorizing channel:', error);
      res.status(500).json({ error: 'Error authorizing channel' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
