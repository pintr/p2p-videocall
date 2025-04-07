import 'dotenv/config';
import express from "express";
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from "http";
import { Server } from "socket.io";
import { IIceServer } from "./models/IIceServer.js";
import { IPayload } from './models/IPayload.js';
import { Room } from './models/Room.js';
import { User } from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment detection
const isProd = process.env.NODE_ENV === 'prod';
console.log(`Running in ${isProd ? 'production' : 'development'} mode`);

// App init
const app = express();
const server = createServer(app);
const io = new Server(server);

const rooms = new Map<string, Room>();

// Set and retrieve ICE server configuration
let iceServers: IIceServer[];

fetch(`https://signallingtest.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_KEY}`)
  .then(async (response: Response) => {
    iceServers = await response.json() as IIceServer[];
  });

// Serve static files in production
if (isProd) {
  app.use(express.static(path.join(__dirname, './public')));
  app.get('/', (_req: any, res: { sendFile: (arg0: string) => void; }) => {
    res.sendFile(path.join(__dirname, './public/index.html'));
  });
}

// Handle new client connection
io.on('connection', (socket) => {
  let sockedId = socket.id;
  console.log('User connected:', socket.id);

  /**
   * Logs a message on the server and emits it to the connected socket client.
   * 
   * @param {string} roomId - The ID of the room where the log should be emitted
   * @param {...string[]} args - Variable number of string arguments to be logged
   * @returns {void}
   * 
   * @emits log - Emits the log message to the client with the same event name 'log'
   */
  function log(roomId: string, ...args: string[]) {
    const array = ['Message from server:', ...args];
    socket.to(roomId).emit('log', array);
  }

  /**
   * Handles a 'join' event from a client wanting to join a specific room.
   * 
   * @param {Object} payload - The join request data
   * @param {string} payload.roomId - The ID of the room to join/create
   * @param {string} payload.username - The username of the joining client
   * 
   * @emits {config} To all clients in the room - Sends ICE server configuration
   * 
   * @listens join - Triggered when a client wants to join a room
   */
  socket.on('join', ({ roomId, username }) => {
    let room = rooms.get(roomId);
    let created = false;
    if (!room) {
      created = true;
      room = new Room(roomId);
      rooms.set(roomId, room);
    }

    if (room.isFull()) {
      socket.to(sockedId).emit('full');
      return;
    }

    const user = new User(sockedId, username, roomId);
    room.addUser(user);
    socket.join(roomId);

    if (created) {
      log(`[${room}] - Room created by user ${user.name}`);
    }

    log(`[${room}] - User ${user.name} joined`);

    socket.emit('joined', {
      iceServers: JSON.stringify(iceServers),
      room: JSON.stringify(room)
    });

    if (room.isFull()) {
      socket.to(roomId).emit('ready');
    }
  });

  /**
   * Handles a 'offer' event from a client sending an SDP offer to peers.
   * 
   * @param {IPayload} payload - The offer payload
   * @param {string} payload.userId - The ID of the user sending the offer
   * @param {string} payload.roomId - The ID of the room
   * @param {string} payload.data - The SDP offer data
   * 
   * @emits offer - Forwards the offer to other clients in the room
   * 
   * @listens offer - Triggered when a client sends an offer
   */
  socket.on('offer', ({ userId, roomId, data }: IPayload) => {
    log(`[${roomId}] - User ${userId} offer: `, data);
    socket.to(roomId).emit('offer', { userId, data });
  });

  /**
   * Handles an 'answer' event from a client responding to an SDP offer.
   * 
   * @param {IPayload} payload - The answer payload
   * @param {string} payload.userId - The ID of the user sending the answer
   * @param {string} payload.roomId - The ID of the room
   * @param {string} payload.data - The SDP answer data
   * 
   * @emits answer - Forwards the answer to other clients in the room
   * 
   * @listens answer - Triggered when a client sends an answer to an offer
   */
  socket.on('answer', ({ userId, roomId, data }: IPayload) => {
    log(`[${roomId}] - User ${userId} answer: `, data);
    socket.to(roomId).emit('answer', { userId, data });
  });

  /**
   * Handles a 'candidate' event from a client sending ICE candidates.
   * 
   * @param {IPayload} payload - The candidate payload
   * @param {string} payload.userId - The ID of the user sending the candidate
   * @param {string} payload.roomId - The ID of the room
   * @param {string} payload.data - The ICE candidate data
   * 
   * @emits candidate - Forwards the ICE candidate to other clients in the room
   * 
   * @listens candidate - Triggered when a client sends an ICE candidate
   */
  socket.on('candidate', ({ userId, roomId, data }: IPayload) => {
    log(`[${roomId}] - User ${userId} candidate: `, data);
    socket.to(roomId).emit('candidate', { userId, data });
  });


  /**
   * Handles a 'leave' event from a client disconnecting from a room.
   * 
   * @param {Object} payload - The leave payload
   * @param {string} payload.userId - The ID of the user leaving
   * @param {string} payload.roomId - The ID of the room being left
   * 
   * @emits leave - Notifies other clients in the room about the departure
   * 
   * @listens leave - Triggered when a client leaves a room
   */
  socket.on('leave', ({ userId, roomId }: IPayload) => {
    log(`[${roomId}] - User ${userId} leaves`);
    const room = rooms.get(roomId);
    if (!room) return;
    room.removeUser(userId);
    socket.to(roomId).emit('leave', userId);

    if (room.isEmpty()) {
      log(`[${roomId}] - Empty room`);
      rooms.delete(roomId);
    }
  });
});

// Set port and start the signalling server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});