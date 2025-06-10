import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { v4 as uuid } from 'uuid';

/**
 * Represents a user connected to a video call room
 * 
 * @interface User
 * @property {string} id - Unique socket identifier for the user
 * @property {string} name - Display name chosen by the user
 * @property {string} roomId - ID of the room the user is connected to
 * @property {number} joined - Timestamp when the user joined the room
 */
interface User {
  id: string;
  name: string;
  roomId: string;
  joined: number;
}

/**
 * Represents a video call room where users can connect
 * 
 * @interface Room
 * @property {string} id - Unique identifier for the room
 * @property {Map<string, User>} users - Collection of users in the room, mapped by user ID
 * @property {number} created - Timestamp when the room was created
 * @property {number} maxUsers - Maximum number of users allowed in the room
 */
interface Room {
  id: string;
  users: Map<string, User>;
  created: number;
  maxUsers: number;
}

/**
 * Parameters for joining a room
 * 
 * @interface Join
 * @property {string} roomId - ID of the room to join or create
 * @property {string} username - Name to display for this user
 * @property {boolean} [config] - Whether to request ICE server configuration
 */
interface Join {
  roomId: string,
  userId: string,
  username: string,
  config?: boolean;
}

/**
 * Events that can be received from the server
 * 
 * @interface ServerToClientEvents
 * @property {function} log - Receive log messages from the server
 * @property {function} joined - Confirmation of successful room join
 * @property {function} ready - Notification that room is full and call can begin
 * @property {function} offer - Receive a WebRTC SDP offer from a peer
 * @property {function} answer - Receive a WebRTC SDP answer from a peer
 * @property {function} candidate - Receive an ICE candidate from a peer
 * @property {function} leave - Notification that a peer has left the room
 */
interface ServerToClientEvents {
  log: (logs: string[]) => void;
  joined: (user: User, room: Room, offerer: boolean, _iceServers: RTCIceServer[]) => void;
  ready: (user: User) => void;
  offer: (user: User, offer: RTCSessionDescriptionInit) => void;
  answer: (user: User, answer: RTCSessionDescriptionInit) => void;
  candidate: (candidate: RTCIceCandidate) => void;
  leave: (user: User) => void;
}

/**
 * Events that can be sent to the server
 * 
 * @interface ClientToServerEvents
 * @property {function} join - Request to join or create a room
 * @property {function} offer - Send a WebRTC SDP offer to peers in the room
 * @property {function} answer - Send a WebRTC SDP answer to an offer
 * @property {function} candidate - Send an ICE candidate to peers
 * @property {function} leave - Notification of leaving the room
 */
interface ClientToServerEvents {
  join: ({ roomId, userId, username, config }: Join) => void;
  offer: (offer: RTCSessionDescriptionInit) => void;
  answer: (answer: RTCSessionDescriptionInit) => void;
  candidate: (candidate: RTCIceCandidate) => void;
  leave: () => void;
}

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  transports: ['websocket'],
  forceNew: false,
  reconnection: true
});

const constraints = {
  audio: true,
  video: true
};

const interval = 10000;

/**
 * Main application component for P2P video calling
 * Handles WebRTC connection setup, signaling, and UI for video chat
 * 
 * @returns {JSX.Element} The rendered application interface
 */
export default function App() {
  const [userName, setUserName] = useState("");
  const [roomId, setRoomId] = useState("room1");
  const [room, setRoom] = useState<Room | null>(null);
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [remoteUser, setRemoteUser] = useState<User | null>(null);

  const userNameRef = useRef<string>(userName);
  const inCall = useRef<boolean>(false);
  const isOfferer = useRef<boolean>(false);
  const iceServers = useRef<RTCIceServer[] | null>(null);
  const joined = useRef<boolean>(false);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  const userId = uuid();

  // Keep the ref updated with current userName
  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  /**
   * Sets up socket.io event listeners for WebRTC signaling
   * Handles offer/answer exchange and ICE candidate negotiation
   */
  useEffect(() => {
    let isEffectActive = true;
    socket.on("connect", async () => {
      if (!isEffectActive) return;

      console.log("CONNECTED", socket.id, "USER ID", userId);

      if (inCall.current) {
        console.log("Attempting to rejoin room after reconnection with ID", userId, "and name", userNameRef.current);
        if (!localStream.current && localVideo.current) {
          await startLocalStream();
        }

        // Always request config on rejoin as network might have changed
        socket.emit("join", { roomId: roomId, userId: userId, username: userNameRef.current, config: true });
      }
    });

    /**
     * Handles server log messages
     * @param {string[]} data - Log messages from server
     */
    socket.on("log", (data) => {
      if (!isEffectActive) return;

      console.log("%c SERVER", "color: #4287f5", data);
    });

    /**
     * Handles successful room join confirmation
     * @param {User} user - The user who joined
     * @param {Room} room - The room information
     * @param {RTCIceServer[] | null} servers - STUN/TURN servers for connection
     */
    socket.on("joined", (_user, _room, _offerer, _iceServers) => {
      if (!isEffectActive) return;

      console.log("USER", _user, " JOINED ROOM", _room, "OFFERER", _offerer, "ICE", _iceServers);
      setLocalUser(_user);
      setRoom(room);
      isOfferer.current = _offerer;
      if (_iceServers) iceServers.current = _iceServers;
      joined.current = true;
    });

    /**
     * Triggered when room has multiple participants and call can begin
     * Initiates WebRTC connection by creating and sending offer
     */
    socket.on("ready", () => {
      if (!isEffectActive) return;

      console.log("READY - The room is full and the call can start");

      if (joined.current) {
        if (!peerConnection.current) {
          setupPeerConnection();
        }
        sendOffer();
      }
    });

    /**
     * Handles incoming WebRTC offer from peer
     * @param {RTCSessionDescriptionInit} offer - SDP offer from remote peer
     */
    socket.on("offer", (user, offer) => {
      if (!isEffectActive) return;

      setupPeerConnection();
      sendAnswer(offer);
      setRemoteUser(user);
    });

    /**
     * Handles incoming WebRTC answer from peer
     * @param {RTCSessionDescriptionInit} answer - SDP answer from remote peer
     */
    socket.on("answer", (user, answer) => {
      if (!isEffectActive) return;

      console.log("Received answer, set remote description");

      if (!peerConnection.current) {
        throw new Error("Peer connection not initialized");
      }

      peerConnection.current.setRemoteDescription(answer);
      setRemoteUser(user);
      logIceCandidates();
    });

    /**
     * Handles incoming ICE candidates from peer
     * @param {RTCIceCandidate} candidate - ICE candidate from remote peer
     */
    socket.on("candidate", (candidate) => {
      if (!isEffectActive) return;

      peerConnection.current?.addIceCandidate(new RTCIceCandidate(candidate));
    });

    /**
     * Handles peer leaving the call
     * @param {User} user - The user who left
     */
    socket.on("leave", (user) => {
      if (!isEffectActive) return;

      console.log(`User ${user.name} left`);

      setRemoteUser(null);

      if (remoteVideo.current) {
        remoteVideo.current.srcObject = null;
      }
    });

    // Cleanup function to remove event listeners
    return () => {
      console.log("Socket cleanup");
      isEffectActive = false;
      socket.off("log");
      socket.off("joined");
      socket.off("ready");
      socket.off("offer");
      socket.off("answer");
      socket.off("candidate");
      socket.off("leave");
    };
  }, []);

  /**
   * Sets up WebRTC peer connection with ICE servers
   * Configures media tracks and connection event handlers
   */
  const setupPeerConnection = async () => {
    console.log("Setup RTCPeerConnection");
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (!iceServers.current) throw new Error("ICE servers not available");
    peerConnection.current = new RTCPeerConnection({ iceServers: iceServers.current });

    // Add local tracks
    localStream.current?.getTracks().forEach((track) => {
      peerConnection.current?.addTrack(track, localStream.current!);
    });

    // Manage local ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("candidate", event.candidate);
      }
    };

    // Add remote track to the HTML when received
    peerConnection.current.ontrack = ({ streams }) => {
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = streams[0];
      }
    };

    // Manage the ICE connection changes
    peerConnection.current.oniceconnectionstatechange = () => {
      if (!peerConnection.current) return;
      const currentState = peerConnection.current.iceConnectionState;
      console.log("iceconnectionstatechange", currentState);

      if (currentState === "failed" || currentState === "disconnected" || currentState === "closed") {
        console.log(`ICE Connection State: ${currentState}. Attempting to handle.`);
        if (isOfferer.current) {
          console.log("Attempting to restart ICE as offerer.");
          // Check if restartIce is available and signaling state allows it
          if (peerConnection.current.signalingState === "stable" || peerConnection.current.signalingState === "have-local-offer" || peerConnection.current.signalingState === "have-remote-offer") {
            try {
              peerConnection.current.restartIce();
            } catch (e) {
              console.error("Error calling restartIce:", e, "Falling back to new offer.");
              sendOffer(); // Fallback
            }
          } else {
            console.log("Cannot restart ICE, signaling state is:", peerConnection.current.signalingState);
            sendOffer();
          }
        } else {
          console.log("ICE connection issue. Waiting for the offerer peer to restart ICE or send a new offer.");
        }
      }
    };

    // Log the stats every interval
    setInterval(async () => {
      if (!peerConnection.current) return;
      peerConnection.current.getStats().then((stats) => {
        const reports: RTCStats[] = [];
        stats.forEach((value) => {
          reports.push(value);
        });
        console.log("STATS", reports);
      });
    }, interval);

    // Log all the other events
    const logEvent = (name: string) => {
      if (!peerConnection.current) return;
      peerConnection.current.addEventListener(name, (event: Event) => {
        if (peerConnection.current) {
          console.log(`${name}:`, event);
        }
      });
    };

    logEvent("connectionstatechange");
    logEvent("datachannel");
    logEvent("icecandidateerror");
    logEvent("icegatheringstatechange");
    logEvent("negotiationneeded");
    logEvent("signalingstatechange");
  };

  /**
   * Creates and sends a WebRTC SDP offer to remote peers
   * Establishes the initial connection request in the WebRTC handshake process
   * 
   * @async
   * @function sendOffer
   * @returns {Promise<void>} Promise that resolves when the offer is created and sent
   * 
   * @throws Will throw an error if peerConnection is not initialized
   * @emits offer - Emits the created SDP offer to the signaling server
   */
  const sendOffer = async () => {
    console.log("Send offer to peer");

    if (!peerConnection.current) {
      throw new Error("Peer connection not initialized");
    }

    const offer = await peerConnection.current.createOffer({ iceRestart: true });
    peerConnection.current.setLocalDescription(offer);
    socket.emit("offer", offer);
  };

  /**
   * Creates and sends a WebRTC SDP answer in response to a received offer
   * Completes the offer-answer exchange in the WebRTC connection process
   * 
   * @async
   * @function sendAnswer
   * @param {RTCSessionDescriptionInit} offer - The SDP offer received from the remote peer
   * @returns {Promise<void>} Promise that resolves when the answer is created and sent
   * 
   * @throws Will throw an error if peerConnection is not initialized
   * @emits answer - Emits the created SDP answer to the signaling server
   */
  const sendAnswer = async (offer: RTCSessionDescriptionInit) => {
    console.log("Received an offer, send answer", offer);

    if (!peerConnection.current) {
      throw new Error("Peer connection not initialized");
    }

    peerConnection.current.setRemoteDescription(offer);
    const answer = await peerConnection.current.createAnswer();
    peerConnection.current.setLocalDescription(answer);
    socket.emit("answer", answer);

    logIceCandidates();
  };

  /**
   * Initializes local media stream (camera and microphone)
   * Displays local stream in video element
   */
  const startLocalStream = async () => {
    console.log("Start local stream");
    localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
    if (localVideo.current) {
      localVideo.current.srcObject = localStream.current;
    }
  };

  /**
   * Log the pair of selected ICE candidate
   */
  const logIceCandidates = () => {
    if (!peerConnection.current) return;
    // Log the selected ICE candidate pair
    const iceTransport = peerConnection.current.getSenders()[0].transport?.iceTransport;

    const logPair = () => {
      console.log("ICE candidate pair", iceTransport?.getSelectedCandidatePair());
    };

    iceTransport?.removeEventListener("selectedcandidatepairchange", logPair);
    iceTransport?.addEventListener("selectedcandidatepairchange", logPair);
  };

  /**
   * Handles join button click
   * Manages room joining process and local media setup
   */
  const handleJoin = async () => {
    if (joined.current) {
      socket.emit("leave");
    } else {
      await startLocalStream();
    }
    socket.emit("join", { roomId: roomId, userId: userId, username: userName, config: iceServers.current ? false : true });
    inCall.current = true;
  };

  /**
   * Handles hangup button click
   * Closes peer connection and cleans up media resources
   */
  const handleHangUp = () => {
    inCall.current = false;
    setRemoteUser(null);

    setLocalUser(null);
    setRoom(null);
    socket.emit("leave");
    if (joined.current) {
      joined.current = false;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (remoteVideo.current) {
      remoteVideo.current.srcObject = null;
    }
  };

  return (
    <div className="min-h-lvh bg-gray-100 p-8 flex flex-col items-center">
      <div className="w-full bg-white rounded-xl shadow-md p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">{room ? room.id : 'P2P Video Call'}</h1>

        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            className="flex-1 w-full p-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
          />
          <input
            type="text"
            name="room"
            placeholder="Room"
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
            className="flex-1 w-full p-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <p className="text-sm text-center mb-1 text-gray-600">{localUser ? localUser.name : 'Local Video'}</p>
            <video
              ref={localVideo}
              autoPlay
              playsInline
              muted
              className="w-full h-60 md:h-180 object-cover rounded-lg border shadow-sm"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm text-center mb-1 text-gray-600">{remoteUser ? remoteUser.name : 'Remote Video'}</p>
            <video
              ref={remoteVideo}
              autoPlay
              playsInline
              className="w-full h-60 md:h-180 object-cover rounded-lg border shadow-sm"
            />
          </div>
        </div>

        <div className="flex justify-center gap-4 pt-5">
          <button
            onClick={handleJoin}
            className="cursor-pointer bg-green-600 text-white px-5 py-2 rounded-lg shadow disabled:cursor-default enabled:hover:bg-green-700 transition"
            disabled={!userName || !roomId}
          >
            Join
          </button>
          <button
            onClick={handleHangUp}
            className="cursor-pointer bg-red-600 text-white px-5 py-2 rounded-lg shadow disabled:cursor-default enabled:hover:bg-red-700 transition"
            disabled={!inCall.current}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
