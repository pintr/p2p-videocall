import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

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
  joined: (user: User, room: Room, _iceServers: RTCIceServer[]) => void;
  ready: () => void;
  offer: (offer: RTCSessionDescriptionInit) => void;
  answer: (answer: RTCSessionDescriptionInit) => void;
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
  join: ({ roomId, username, config }: Join) => void;
  offer: (offer: RTCSessionDescriptionInit) => void;
  answer: (answer: RTCSessionDescriptionInit) => void;
  candidate: (candidate: RTCIceCandidate) => void;
  leave: () => void;
}

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();

const constraints = {
  audio: true,
  video: true
};

/**
 * Main application component for P2P video calling
 * Handles WebRTC connection setup, signaling, and UI for video chat
 * 
 * @returns {JSX.Element} The rendered application interface
 */
export default function App() {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("room1");
  const [call, setCall] = useState(false);

  const iceServers = useRef<RTCIceServer[] | null>(null);
  const joined = useRef<boolean>(false);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  /**
   * Sets up socket.io event listeners for WebRTC signaling
   * Handles offer/answer exchange and ICE candidate negotiation
   */
  useEffect(() => {
    /**
     * Handles server log messages
     * @param {string[]} data - Log messages from server
     */
    socket.on("log", (data) => {
      console.log("SERVER", data);
    });

    /**
     * Handles successful room join confirmation
     * @param {User} user - The user who joined
     * @param {Room} room - The room information
     * @param {RTCIceServer[] | null} servers - STUN/TURN servers for connection
     */
    socket.on("joined", (user, room, _iceServers) => {
      console.log("JOINED", "USER", user, "ROOM", room, "ICE Servers", _iceServers);
      if (_iceServers) iceServers.current = _iceServers;
      joined.current = true;

    });

    /**
     * Triggered when room has multiple participants and call can begin
     * Initiates WebRTC connection by creating and sending offer
     */
    socket.on("ready", () => {
      console.log("READY - The room is full and the call can start");

      if (joined.current) {
        setupPeerConnection();
        sendOffer();
      }
    });

    /**
     * Handles incoming WebRTC offer from peer
     * @param {RTCSessionDescriptionInit} offer - SDP offer from remote peer
     */
    socket.on("offer", (offer) => {
      setupPeerConnection();
      sendAnswer(offer);
    });

    /**
     * Handles incoming WebRTC answer from peer
     * @param {RTCSessionDescriptionInit} answer - SDP answer from remote peer
     */
    socket.on("answer", (answer) => {
      console.log('Received answer, set remote description');

      if (!peerConnection.current) {
        throw new Error("Peer connection not initialized");
      }

      peerConnection.current.setRemoteDescription(answer);
      setCall(true);
    });

    /**
     * Handles incoming ICE candidates from peer
     * @param {RTCIceCandidate} candidate - ICE candidate from remote peer
     */
    socket.on("candidate", (candidate) => {
      peerConnection.current?.addIceCandidate(new RTCIceCandidate(candidate));
    });

    /**
     * Handles peer leaving the call
     * @param {User} user - The user who left
     */
    socket.on("leave", (user) => {
      console.log(`User ${user} left`);

      if (remoteVideo.current) {
        remoteVideo.current.srcObject = null;
      }
    });

    // Cleanup function to remove event listeners
    return () => {
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
    console.log('Send offer to peer');

    if (!peerConnection.current) {
      throw new Error("Peer connection not initialized");
    }

    const offer = await peerConnection.current.createOffer();
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
    setCall(true);
  };

  /**
   * Initializes local media stream (camera and microphone)
   * Displays local stream in video element
   */
  const startLocalStream = async () => {
    console.log('Start local stream');
    localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
    if (localVideo.current) {
      localVideo.current.srcObject = localStream.current;
    }
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
    socket.emit("join", { roomId: room, username: name, config: iceServers.current ? false : true });
  };

  /**
   * Handles hangup button click
   * Closes peer connection and cleans up media resources
   */
  const handleHangUp = () => {
    setCall(false)
    socket.emit("leave")
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (remoteVideo.current) {
      remoteVideo.current.srcObject = null;
    }
  };

  return (
    <div className="h-screen bg-gray-100 p-8 flex flex-col items-center">
      <div className="w-full bg-white rounded-xl shadow-md p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">P2P Video Call</h1>

        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
          />
          <input
            type="text"
            placeholder="Room"
            value={room}
            onChange={e => setRoom(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <p className="text-sm text-center mb-1 text-gray-600">Local Video</p>
            <video
              ref={localVideo}
              autoPlay
              playsInline
              muted
              className="w-full h-180 object-cover rounded-lg border shadow-sm"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm text-center mb-1 text-gray-600">Remote Video</p>
            <video
              ref={remoteVideo}
              autoPlay
              playsInline
              className="w-full h-180 object-cover rounded-lg border shadow-sm"
            />
          </div>
        </div>

        <div className="flex justify-center gap-4 pt-5">
          <button
            onClick={handleJoin}
            className="cursor-pointer bg-green-600 text-white px-5 py-2 rounded-lg shadow disabled:cursor-default enabled:hover:bg-green-700 transition"
            disabled={!name || !room}
          >
            Join
          </button>
          <button
            onClick={handleHangUp}
            className="cursor-pointer bg-red-600 text-white px-5 py-2 rounded-lg shadow disabled:cursor-default enabled:hover:bg-red-700 transition"
            disabled={!call}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
