const express = require('express');
const http = require('http');
const { app, Server } = require('socket.io');

const serverApp = express();
const httpServer = http.createServer(serverApp);
const io = new Server(httpServer);

// Frontend papkani static sifatida yuklash
serverApp.use(express.static(__dirname + '/public'));

// Juftlash uchun kutayotgan userlar
const waitingUsers = new Set();

io.on('connection', (socket) => {
  console.log('Yangi user ulandi:', socket.id);

  // Foydalanuvchi tayyor ekanligini bildiradi
  socket.on('ready', () => {
    if (waitingUsers.size > 0) {
      const partnerId = Array.from(waitingUsers)[0];
      if (partnerId && partnerId !== socket.id) {
        waitingUsers.delete(partnerId);
        socket.partnerId = partnerId;
        io.to(partnerId).emit('partner-found', socket.id);
        socket.emit('partner-found', partnerId);
      } else {
        waitingUsers.add(socket.id);
      }
    } else {
      waitingUsers.add(socket.id);
    }
  });

  // Offer jo'natish
  socket.on('offer', (offer, partnerId) => {
    io.to(partnerId).emit('offer', offer, socket.id);
  });

  // Answer jo'natish
  socket.on('answer', (answer) => {
    if (socket.partnerId) {
      io.to(socket.partnerId).emit('answer', answer);
    }
  });

  // ICE candidate jo'natish
  socket.on('candidate', (candidate, partnerId) => {
    io.to(partnerId).emit('candidate', candidate);
  });

  // Chaqiruv tugaganligi haqida xabar
  socket.on('end-call', (partnerId) => {
    io.to(partnerId).emit('call-ended');
    waitingUsers.add(partnerId);
  });

  // Ulanish uzilganda
  socket.on('disconnect', () => {
    console.log('User uzildi:', socket.id);
    waitingUsers.delete(socket.id);
    if (socket.partnerId) {
      io.to(socket.partnerId).emit('call-ended');
      waitingUsers.add(socket.partnerId);
    }
  });
});

// Port sozlamalari
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});