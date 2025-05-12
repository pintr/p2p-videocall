import "dotenv/config";
import express from "express";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import { Room } from "./models/Room.js";
import { User } from "./models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment detection
const isProd = process.env.NODE_ENV === "prod";
console.log(`Running in ${isProd ? "production" : "development"} mode`);

// App init
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: isProd ? undefined : { origin: "*" },
  connectionStateRecovery: {}
});

const rooms = new Map<string, Room>();

// Set and retrieve ICE server configuration
let iceServers: RTCIceServer[];

fetch(`https://signallingtest.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_KEY}`)
  .then(async (response: Response) => {
    iceServers = await response.json() as RTCIceServer[];
  });

// Serve static files in production
if (isProd) {
  app.use(express.static(path.join(__dirname, "./public")));
  app.get("/", (_req: any, res: { sendFile: (arg0: string) => void; }) => {
    res.sendFile(path.join(__dirname, "./public/index.html"));
  });
}

// Handle new client connection
io.on("connection", (socket) => {
  let room: Room;
  let user: User;
  console.log("User connected:", socket.id);

  /**
   * Logs a message on the server and emits it to the connected socket client.
   * 
   * @param {string} roomId - The ID of the room where the log should be emitted
   * @param {...string[]} args - Variable number of string arguments to be logged
   * @returns {void}
   * 
   * @emits log - Emits the log message to the client with the same event name "log"
   */
  function log(...data: any) {

    if (!isProd) console.log(data);

    io.to(room.id).emit("log", data);
  }

  /**
   * Handles a "join" event from a client wanting to join a specific room.
   * 
   * @param {Object} payload - The join request data
   * @param {string} payload.roomId - The ID of the room to join/create
   * @param {string} payload.username - The username of the joining client
   * @param {boolean} payload.config - Whther the user needs the config (i.e. the iceServers)
   * 
   * @emits {joined} To the client - Sends User, Room and ICE server configuration
   * @emits {ready} To other clients in the room - The call can start
   * 
   * @listens join - Triggered when a client wants to join a room
   */
  socket.on("join", ({ roomId, userId, username, config }) => {
    if (rooms.has(roomId)) {
      room = rooms.get(roomId) as Room;
      if (room.hasUser(userId)) {
        log(`[${room.id}] - User ${username} with ID ${userId} already in the room. Rejoin`);
        room.removeUser(userId);
      }
    } else {
      room = new Room(roomId, userId);
      rooms.set(room.id, room);
      log(`Room "${room.id}" created by user ${username}`);
    }

    if (room.isFull()) {
      log(`[${room.id}] - Room is full`);
      return;
    }

    user = new User(userId, socket.id, username, room.id);

    room.addUser(user);
    socket.join(room.id);

    log(`[${room.id}] - User ${user.name} joined`);
    socket.emit("joined", user.serialize(), room.serialize(), room.isCreator(userId), config ? iceServers : null);


    if (room.isFull()) socket.to(room.id).emit("ready");
  });

  /**
   * Handles a "offer" event from a client sending an SDP offer to peers.
   * 
   * @param {string} offer - The SDP offer string
   * 
   * @emits offer - Forwards the offer along with user information to other clients in the room
   * 
   * @listens offer - Triggered when a client sends an offer
   */
  socket.on("offer", (offer: RTCSessionDescriptionInit) => {
    log(`[${room.id}] - User ${user.name} offer`, offer);
    socket.to(room.id).emit("offer", user, offer);
  });

  /**
   * Handles an "answer" event from a client responding to an SDP offer.
   * 
   * @param {string} answer - The SDP answer string
   * 
   * @emits answer - Forwards the answer along with user information to other clients in the room
   * 
   * @listens answer - Triggered when a client sends an answer to an offer
   */
  socket.on("answer", (answer: RTCSessionDescriptionInit) => {
    log(`[${room.id}] - User ${user.name} answer`, answer);
    socket.to(room.id).emit("answer", user, answer);
  });

  /**
   * Handles a "candidate" event from a client sending ICE candidates.
   * 
   * @param {string} candidate - The ICE candidate string
   * 
   * @emits candidate - Forwards the ICE candidate along with user information to other clients in the room
   * 
   * @listens candidate - Triggered when a client sends an ICE candidate
   */
  socket.on("candidate", (candidate: RTCIceCandidate) => {
    log(`[${room.id}] - User ${user.name} candidate`, candidate);
    socket.to(room.id).emit("candidate", candidate);
  });


  /**
   * Handles a "leave" event from a client disconnecting from a room.
   * 
   * @emits leave - Notifies other clients in the room about the departure
   * 
   * @listens leave - Triggered when a client leaves a room
   */
  socket.on("leave", () => {
    log(`[${room.id}] - User ${user.name} left`);
    if (!room) return;
    room.removeUser(user.id);
    socket.to(room.id).emit("leave", user);

    if (room.isEmpty()) {
      log(`[${room.id}] - Empty room`);
      rooms.delete(room.id);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected", socket.id);
  });
});

// Set port and start the signalling server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});