// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + '/public')); // Frontend fayllar joylashgan katalog

const waitingUsers = new Set();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('ready', () => {
    if (waitingUsers.size > 0) {
      // Set dan birinchi elementni olamiz
      const partnerId = Array.from(waitingUsers)[0];
      
      if (partnerId && partnerId !== socket.id) {
        waitingUsers.delete(partnerId);
        socket.partnerId = partnerId;
        io.to(partnerId).emit('partner-found', socket.id);
        socket.emit('partner-found', partnerId);
      } else {
        // O'zidan tashqari user yo'q bo'lsa, o'zini kutishga qo'sh
        waitingUsers.add(socket.id);
      }
    } else {
      waitingUsers.add(socket.id);
    }
  });

  socket.on('offer', (offer, partnerId) => {
    io.to(partnerId).emit('offer', offer, socket.id);
  });

  socket.on('answer', (answer) => {
    io.to(socket.partnerId).emit('answer', answer);
  });

  socket.on('candidate', (candidate, partnerId) => {
    io.to(partnerId).emit('candidate', candidate);
  });

  socket.on('end-call', (partnerId) => {
    io.to(partnerId).emit('call-ended');
    waitingUsers.add(partnerId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    waitingUsers.delete(socket.id);
    if (socket.partnerId) {
      io.to(socket.partnerId).emit('call-ended');
      waitingUsers.add(socket.partnerId);
    }
  });
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
