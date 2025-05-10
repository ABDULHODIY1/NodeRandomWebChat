const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(express.static('public'));

// Track connected users and ready users separately
const onlineUsers = new Set(); // All connected users
const readyUsers = new Set(); // Users actively seeking matches

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  onlineUsers.add(socket.id); // Add to online users

  socket.on('ready', () => {
    readyUsers.add(socket.id); // Add to ready pool
    findRandomPartner(socket); // Attempt to pair
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id); // Remove from online users
    readyUsers.delete(socket.id); // Remove from ready pool
    io.emit('user-disconnected', socket.id); // Notify others
  });
});

function findRandomPartner(socket) {
  const available = Array.from(readyUsers).filter(id => id !== socket.id);
  
  if (!available.length) {
    socket.emit('no-partner'); // No partners available
    return;
  }

  const partnerId = available[Math.floor(Math.random() * available.length)];

  // Remove both users from ready pool to prevent immediate re-pairing
  readyUsers.delete(socket.id);
  readyUsers.delete(partnerId);

  // Notify both users about the match
  socket.emit('partner-found', partnerId);
  io.to(partnerId).emit('partner-found', socket.id);
}

// Handle WebRTC signaling
io.on('connection', (socket) => {
  socket.on('offer', (offer, partnerId) => {
    io.to(partnerId).emit('offer', offer, socket.id);
  });

  socket.on('answer', (answer, partnerId) => {
    io.to(partnerId).emit('answer', answer);
  });

  socket.on('candidate', (candidate, partnerId) => {
    io.to(partnerId).emit('candidate', candidate);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});