import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  createRoom, joinRoom, leaveRoom, listRooms, startGame, getPlayerIdWithLowestCard,
  playCards, pickupPile, swapCards, getPrivateFor, getStateFor, getRoom
} from './game.js';

const app = express();
app.use(cors());
app.get('/', (_, res) => res.send('Skitgubbe server running'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connect', (socket) => {
  console.log('Client connected', socket.id);
  socket.join('lobby');

  socket.on('listRooms', () => {
    console.log('listRooms requested by', socket.id, listRooms());
    socket.emit('rooms', listRooms());
  });

  socket.on('createRoom', ({ name, playerName }) => {
    try {
      // 1. Create room
      const room = createRoom(name, socket.id);
  
      // 2. Add host as first player
      const player = joinRoom(room.id, socket.id, playerName || 'Player');
  
      // 3. Join socket.io room
      socket.join(room.id);
  
      // 4. Update lobby
      io.to('lobby').emit('rooms', listRooms());
  
      // 5. Send public state to all in room
      io.to(room.id).emit('state', getStateFor(room.id));
  
      // 6. Send private state to each player
      const state = getStateFor(room.id); // <--- use room.id here
      if (state && state.players) {
        for (const p of state.players) {
          const priv = getPrivateFor(room.id, p.id);
          if (priv) io.to(p.id).emit('privateState', priv);
        }
      }
  
      // 7. Notify host they joined
      socket.emit('roomJoined', { roomId: room.id, playerId: player.id });
  
    } catch (e) {
      socket.emit('errorMessage', e.message);
    }
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    try {
      const player = joinRoom(roomId, socket.id, playerName || 'Player');
      socket.join(roomId);
      io.to('lobby').emit('rooms', listRooms());
      io.to(roomId).emit('state', getStateFor(roomId));
      // send each player their private cards
      const state = getStateFor(roomId);
      if (state && state.players) {
        for (const p of state.players) {
          const priv = getPrivateFor(roomId, p.id);
          if (priv) io.to(p.id).emit('privateState', priv);
        }
      }
      console.log('Player joined room', roomId, player.id);
      socket.emit('roomJoined', { roomId, playerId: player.id  });
    } catch (e) {
      console.error('Error joining room:', e);
      socket.emit('errorMessage', e.message);
    }
  });

  socket.on('startGame', ({ roomId }) => {
    try {
      startGame(roomId);
      io.to('lobby').emit('rooms', listRooms());
      io.to(roomId).emit('state', getStateFor(roomId));
      const playerIdWithLowestCard = getPlayerIdWithLowestCard(roomId);
      // send each player their private cards
      const state = getStateFor(roomId, playerIdWithLowestCard);
      if (state && state.players) {
        for (const p of state.players) {
          const priv = getPrivateFor(roomId, p.id);
          if (priv) io.to(p.id).emit('privateState', priv);
        }
      }
    } catch (e) {
      socket.emit('errorMessage', e.message);
    }
  });

  socket.on('swap', ({ roomId, swaps }) => {
    try {
      swapCards(roomId, socket.id, swaps);
      io.to(roomId).emit('state', getStateFor(roomId));
      // send each player their private cards
      const state = getStateFor(roomId);
      if (state && state.players) {
        for (const p of state.players) {
          const priv = getPrivateFor(roomId, p.id);
          if (priv) io.to(p.id).emit('privateState', priv);
        }
      }
    } catch (e) {
      socket.emit('errorMessage', e.message);
    }
  });

  socket.on('playCards', ({ roomId, cards }) => {
    try {
      playCards(roomId, socket.id, cards);
      io.to(roomId).emit('state', getStateFor(roomId));
      // send each player their private cards
      const state = getStateFor(roomId);
      if (state && state.players) {
        for (const p of state.players) {
          const priv = getPrivateFor(roomId, p.id);
          if (priv) io.to(p.id).emit('privateState', priv);
        }
      }
      io.to('lobby').emit('rooms', listRooms());
    } catch (e) {
      socket.emit('errorMessage', e.message);
    }
  });

  socket.on('pickup', ({ roomId }) => {
    try {
      pickupPile(roomId, socket.id);
      io.to(roomId).emit('state', getStateFor(roomId));
      // send each player their private cards
      const state = getStateFor(roomId);
      if (state && state.players) {
        for (const p of state.players) {
          const priv = getPrivateFor(roomId, p.id);
          if (priv) io.to(p.id).emit('privateState', priv);
        }
      }
    } catch (e) {
      socket.emit('errorMessage', e.message);
    }
  });

  socket.on('leaveRoom', ({ roomId }) => {
    try {
      leaveRoom(roomId, socket.id);
      socket.leave(roomId);
      io.to('lobby').emit('rooms', listRooms());
      if (roomId) io.to(roomId).emit('state', getStateFor(roomId));
      // send each player their private cards
      const state = getStateFor(roomId);
      if (state && state.players) {
        for (const p of state.players) {
          const priv = getPrivateFor(roomId, p.id);
          if (priv) io.to(p.id).emit('privateState', priv);
        }
      }
    } catch (e) {
      socket.emit('errorMessage', e.message);
    }
  });

  socket.on('disconnect', () => {
    leaveRoom(null, socket.id);
    io.to('lobby').emit('rooms', listRooms());
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log('Skitgubbe server on :' + PORT));
