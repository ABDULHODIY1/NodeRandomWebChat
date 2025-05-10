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

// Online foydalanuvchilarni saqlash uchun set
const onlineUsers = new Set();

io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`);
  onlineUsers.add(socket.id);

  // Foydalanuvchiga random partner topish
  function findRandomPartner() {
    const availableUsers = Array.from(onlineUsers).filter(id => id !== socket.id);
    if (availableUsers.length === 0) {
      socket.emit('no-partner');
      return;
    }
    const partnerId = availableUsers[Math.floor(Math.random() * availableUsers.length)];
    socket.emit('partner-found', partnerId);
    io.to(partnerId).emit('partner-found', socket.id);
  }

  // Foydalanuvchi "ready" holatga kelganda
  socket.on('ready', () => {
    findRandomPartner();
  });

  // Offer yuborilganda
  socket.on('offer', (offer, partnerId) => {
    io.to(partnerId).emit('offer', offer, socket.id);
  });

  // Answer yuborilganda
  socket.on('answer', (answer, partnerId) => {
    io.to(partnerId).emit('answer', answer);
  });

  // Candidate yuborilganda
  socket.on('candidate', (candidate, partnerId) => {
    io.to(partnerId).emit('candidate', candidate);
  });

  // Foydalanuvchi aloqani to'xtatganda
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    onlineUsers.delete(socket.id);
    io.emit('user-disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});