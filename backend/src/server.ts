import 'dotenv/config';
import express from "express";
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from "http";
import { Server } from "socket.io"
import { IIceServer } from "./models/IIceServer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment detection
const isProd = process.env.NODE_ENV === 'prod';
console.log("ENV", process.env.METERED_KEY)

console.log(`Running in ${isProd ? 'production' : 'development'} mode`);

const app = express();
const server = createServer(app);
const io = new Server(server);

let iceServers: IIceServer[];

fetch(`https://signallingtest.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_KEY}`)
  .then(async (response: Response) => {
    iceServers = await response.json() as IIceServer[];
  });

// Serve static files in production
if (isProd) {
  app.use(express.static(path.join(__dirname, './public')))
  app.get('/', (_req: any, res: { sendFile: (arg0: string) => void; }) => {
    res.sendFile(path.join(__dirname, './public/index.html'))
  })
}


io.on('connection', (socket) => {
  function log(...args: string[]) {
    var array: string[] = ['Message from server:'];
    array.push.apply(args);
    socket.emit('log', args);
  }


})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})