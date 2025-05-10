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

// Track users actively seeking matches
const readyUsers = new Set();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle readiness signal
  socket.on('ready', () => {
    readyUsers.add(socket.id); // Add to ready pool
    findPartner(socket); // Attempt to pair
  });

  // Handle WebRTC signaling
  socket.on('offer', (offer, partnerId) => {
    io.to(partnerId).emit('offer', offer, socket.id);
  });

  socket.on('answer', (answer, partnerId) => {
    io.to(partnerId).emit('answer', answer);
  });

  socket.on('candidate', (candidate, partnerId) => {
    io.to(partnerId).emit('candidate', candidate);
  });

  // Handle ending calls
  socket.on('end-call', (partnerId) => {
    if (partnerId) {
      io.to(partnerId).emit('call-ended'); // Notify partner
      readyUsers.delete(partnerId); // Remove from ready pool
    }
    readyUsers.delete(socket.id); // Remove self from ready pool
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    readyUsers.delete(socket.id); // Remove from ready pool
    io.emit('user-disconnected', socket.id); // Notify others
  });
});

function findPartner(socket) {
  const available = Array.from(readyUsers).filter(id => id !== socket.id);

  if (!available.length) {
    socket.emit('no-partner'); // No partners available
    return;
  }

  const partnerId = available[Math.floor(Math.random() * available.length)];

  // Remove both from ready pool to prevent immediate re-pairing
  readyUsers.delete(socket.id);
  readyUsers.delete(partnerId);

  // Notify both users about the match
  socket.emit('partner-found', partnerId);
  io.to(partnerId).emit('partner-found', socket.id);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});