# **WebRTC Metrics Explained**

This document provides an explanation of various WebRTC statistics commonly found in JSON format. These metrics offer insights into media playout, codecs, network connectivity (ICE), data transmission (RTP/RTCP), and security aspects of a WebRTC session.

## **General Fields**

Most metric objects share these common fields:

* **id**: A unique identifier for the specific statistics object.  
* **timestamp**: A DOMHighResTimeStamp indicating when the stats were collected (typically in milliseconds). For example, 1749030778540.25 (which is approximately Tuesday, June 3, 2025 9:52:58.540 AM GMT).  
* **type**: A string categorizing the set of statistics.

## **Metric Types and Fields**

### **1\. media-playout**

* **Purpose**: Statistics related to the playout of audio from a remote source.  
* **Example ID**: AP  
* **Fields**:  
  * kind: Media type (e.g., "audio").  
  * synthesizedSamplesDuration: Total duration (seconds) of synthesized audio samples played (e.g., comfort noise).  
    * *Example Value*: 0  
  * synthesizedSamplesEvents: Number of times synthesized audio was inserted.  
    * *Example Value*: 0  
  * totalPlayoutDelay: Total accumulated delay (seconds) from reception to playout.  
    * *Example Value*: 40855.82928  
  * totalSamplesCount: Total number of audio samples played out.  
    * *Example Value*: 953280  
  * totalSamplesDuration: Total duration (seconds) of audio samples played out.  
    * *Example Value*: 19.86

### **2\. certificate**

* **Purpose**: Information about the DTLS certificates used for securing SRTP media streams.  
* **Example IDs**: CF46:3B:75:..., CF93:51:0A:...  
* **Fields**:  
  * base64Certificate: Base64 encoded string of the DER-encoded X.509 certificate.  
    * *Example Value*: "MIIBFTCBvKADAgECAgh1enG6vudPfjAKBggqhkjOPQQDAjARMQ8wDQYDVQQDDAZXZWJSVEMwHhcNMjUwNjAzMDk1MjM4WhcNMjUwNzA0MDk1MjM4WjARMQ8wDQYDVQQDDAZXZWJSVEMwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAASzYIraupkJj0iH6DCNOsgQ1fn+MD3Vt51cfhinwfR45ZGbIMrQhATCmwCmOHJtzioeXyLo4/q/mDLBtcxwxPkAMAoGCCqGSM49BAMCA0gAMEUCIQCKIi+HCIJpbVSHgw7EyZhppEOPp7KS9sBC7FfK1cIQAQIgUTteJzcuxK5ksbfW8Zhll9eeL25ywOlNVQf33X7/Zrc="  
  * fingerprint: A hash of the certificate (used in SDP for verification).  
    * *Example Value*: "46:3B:75:FF:BD:DB:2D:E9:8F:26:D9:6E:BD:9E:E0:33:C1:31:0A:4E:51:1B:33:DE:C1:55:CD:6B:4A:41:73:4B"  
  * fingerprintAlgorithm: Algorithm used for the fingerprint.  
    * *Example Value*: "sha-256"

### **3\. codec**

* **Purpose**: Details about the audio/video codecs negotiated and used.  
* **Example IDs**: CIT01\_111\_minptime=10;useinbandfec=1, CIT01\_96  
* **Fields**:  
  * channels: Number of audio channels (e.g., 2 for stereo).  
  * clockRate: Sampling rate of the codec in Hz (e.g., 48000 for Opus, 90000 for VP8).  
  * mimeType: MIME type of the codec (e.g., "audio/opus", "video/VP8").  
  * payloadType: RTP payload type number assigned (e.g., 111 for Opus, 96 for VP8).  
  * sdpFmtpLine: SDP format-specific parameters (e.g., "minptime=10;useinbandfec=1" for Opus).  
  * transportId: Identifier linking to a specific transport (e.g., "T01").

### **4\. candidate-pair**

* **Purpose**: Statistics for a pair of local and remote ICE candidates being checked or active.  
* **Example IDs**: CP33yuy5h4\_p4WcEaws, CPhAv+okLE\_5I9RUV8a (active pair in the example data)  
* **Fields**:  
  * availableOutgoingBitrate: Estimated available send bandwidth (bps).  
    * *Example Value (active pair)*: 3826666  
  * bytesDiscardedOnSend: Bytes discarded before sending.  
  * bytesReceived, bytesSent: Total bytes received/sent on this pair.  
    * *Example Values (active pair)*: Received: 4302363, Sent: 3777463  
  * consentRequestsSent: STUN consent requests sent (keep-alive).  
  * currentRoundTripTime: Latest RTT measurement (seconds).  
    * *Example Value (active pair)*: 0.002  
  * lastPacketReceivedTimestamp, lastPacketSentTimestamp: Timestamps of last packet activity.  
  * localCandidateId, remoteCandidateId: IDs linking to the local-candidate and remote-candidate objects.  
  * nominated: true if nominated by ICE agent for use.  
  * packetsDiscardedOnSend, packetsReceived, packetsSent: Packet counts.  
  * priority: Priority of the candidate pair.  
  * requestsReceived, requestsSent, responsesReceived, responsesSent: STUN connectivity check message counts.  
  * state: ICE check state (e.g., "succeeded", "waiting", "failed").  
    * *Example Value (active pair)*: "succeeded"  
  * totalRoundTripTime: Cumulative RTT for all checks on this pair (seconds).  
  * transportId: Links to the transport.  
  * writable: true if the pair is considered writable.

### **5\. local-candidate / remote-candidate**

* **Purpose**: Details about an individual ICE candidate (local or remote).  
* **Example IDs**: I33yuy5h4 (local), I5I9RUV8a (remote)  
* **Fields**:  
  * address, ip: IP address of the candidate (e.g., "192.168.17.34").  
  * candidateType: Type of ICE candidate ("host", "srflx", "prflx", "relay").  
    * *Example Value (local)*: "prflx" (peer reflexive)  
    * *Example Value (remote)*: "prflx"  
  * foundation: ICE foundation to group related candidates.  
  * isRemote: false for local, true for remote.  
  * networkType: Network interface type (e.g., "ethernet").  
  * port: Port number.  
  * priority: Priority of this individual candidate.  
  * protocol: Transport protocol (e.g., "udp").  
  * relatedAddress, relatedPort: For reflexive/relay, base or STUN/TURN server address/port.  
  * relayProtocol: (For relay) Protocol between client and TURN server.  
  * transportId: Links to the transport.  
  * url: (For relay) URL of the TURN server.  
    * *Example Value (local relay)*: "turn:global.relay.metered.ca:80?transport=udp"  
  * usernameFragment: Part of ICE credentials.

### **6\. inbound-rtp**

* **Purpose**: Statistics for incoming RTP (Real-time Transport Protocol) streams.  
* **Example IDs**: IT01A1494927424 (audio), IT01V301405182 (video)  
* **Fields**:  
  * codecId: Links to the codec object used.  
  * kind, mediaType: "audio" or "video".  
  * ssrc: Synchronization Source identifier.  
  * jitter: Network jitter experienced (seconds).  
    * *Example Value (audio)*: 0.005  
  * packetsLost: Number of RTP packets lost.  
    * *Example Value (audio)*: 0  
  * packetsReceived, bytesReceived, headerBytesReceived: Reception stats.  
  * **Audio-specific**:  
    * audioLevel: Current audio energy level (0-1).  
    * concealedSamples, concealmentEvents: Packet Loss Concealment (PLC) stats.  
    * jitterBufferDelay, jitterBufferEmittedCount: Jitter buffer performance metrics.  
    * playoutId: Links to media-playout stats for this audio stream.  
  * **Video-specific**:  
    * decoderImplementation: Video decoder library (e.g., "libvpx").  
    * firCount, pliCount, nackCount: Feedback message counts (e.g., nackCount: 0 for video).  
    * frameHeight, frameWidth, framesPerSecond: Video resolution and FPS (e.g., 640x480 @ 29fps).  
    * framesDecoded, framesDropped, framesReceived: Frame processing stats.  
    * keyFramesDecoded: Number of keyframes decoded.  
    * qpSum: Sum of Quantization Parameters for decoded frames.  
    * retransmittedBytesReceived, retransmittedPacketsReceived: Data received via retransmission.

### **7\. outbound-rtp**

* **Purpose**: Statistics for outgoing RTP streams.  
* **Example IDs**: OT01A3989369722 (audio), OT01V231913016 (video)  
* **Fields**:  
  * Similar to inbound-rtp but from sender's perspective (bytesSent, packetsSent).  
  * active: true if the stream is currently being sent.  
  * mediaSourceId: Links to the media-source object.  
  * nackCount: NACKs received from the remote peer.  
    * *Example Value (video)*: 75  
  * targetBitrate: Encoder's target bitrate (bps).  
    * *Example Value (video)*: 1686505  
  * **Video-specific**:  
    * encoderImplementation: Video encoder library (e.g., "libvpx").  
    * framesEncoded, framesSent: Frame encoding/sending stats.  
    * keyFramesEncoded: Number of keyframes encoded.  
    * qualityLimitationReason: Reason for encoding quality limitation (e.g., "none", "bandwidth", "cpu").  
      * *Example Value (video)*: "none"  
    * qualityLimitationDurations: Time spent in each limitation state.  
    * retransmittedBytesSent, retransmittedPacketsSent: Data sent as retransmissions.  
    * scalabilityMode: For SVC codecs, layers being sent (e.g., "L1T1").

### **8\. peer-connection**

* **Purpose**: Overall statistics for the RTCPeerConnection.  
* **Example ID**: P  
* **Fields**:  
  * dataChannelsClosed, dataChannelsOpened: Counts of data channels.  
    * *Example Values*: 0 for both.

### **9\. remote-inbound-rtp**

* **Purpose**: Statistics reported *by the remote peer* about *its* inbound RTP streams (our outbound). Derived from RTCP Receiver Reports (RR).  
* **Example IDs**: RIA3989369722 (audio), RIV231913016 (video)  
* **Fields**:  
  * jitter, packetsLost, fractionLost: Metrics as measured by the remote peer.  
    * *Example Value (audio packetsLost)*: 26  
  * localId: Links to the corresponding local outbound-rtp stream ID.  
  * roundTripTime: RTT calculated from RTCP reports (seconds).  
    * *Example Value (audio RTT)*: 0.001312

### **10\. remote-outbound-rtp**

* **Purpose**: Statistics reported *by the remote peer* about *its* outbound RTP streams (our inbound). Derived from RTCP Sender Reports (SR).  
* **Example IDs**: ROA1494927424 (audio), ROV301405182 (video)  
* **Fields**:  
  * bytesSent, packetsSent: Bytes/packets sent *by the remote peer*.  
  * localId: Links to the corresponding local inbound-rtp stream ID.  
  * remoteTimestamp: NTP timestamp from the remote sender's report.

### **11\. media-source**

* **Purpose**: Statistics about the local media source (e.g., microphone, camera) *before* encoding.  
* **Example IDs**: SA1 (audio), SV2 (video)  
* **Fields**:  
  * kind: "audio" or "video".  
  * trackIdentifier: Unique ID of the MediaStreamTrack.  
  * **Audio-specific**:  
    * audioLevel: Audio level from the source.  
    * echoReturnLoss, echoReturnLossEnhancement: Acoustic Echo Cancellation (AEC) metrics.  
  * **Video-specific**:  
    * frames, framesPerSecond: Frames captured and capture rate (e.g., 598 frames, 30 FPS).  
    * height, width: Resolution of the source video (e.g., 480x640).

### **12\. transport**

* **Purpose**: Statistics about the underlying data transport (DTLS over ICE-selected pair).  
* **Example ID**: T01  
* **Fields**:  
  * bytesReceived, bytesSent, packetsReceived, packetsSent: Total bytes/packets over this transport.  
    * *Example Values*: Received: 4302363 bytes, Sent: 3777463 bytes.  
  * dtlsCipher: Negotiated DTLS cipher suite (e.g., "TLS\_ECDHE\_ECDSA\_WITH\_AES\_128\_GCM\_SHA256").  
  * dtlsRole: DTLS role (e.g., "server").  
  * dtlsState: DTLS handshake state (e.g., "connected").  
  * iceLocalUsernameFragment: Local ICE ufrag.  
  * iceRole: ICE role (e.g., "controlling").  
  * iceState: Overall ICE connection state (e.g., "connected").  
  * localCertificateId, remoteCertificateId: Links to certificate objects.  
  * selectedCandidatePairChanges: How many times the active ICE candidate pair has changed.  
    * *Example Value*: 1  
  * selectedCandidatePairId: ID of the candidate-pair currently used for media.  
    * *Example Value*: "CPhAv+okLE\_5I9RUV8a"  
  * srtpCipher: SRTP cipher suite for media encryption (e.g., "AES\_CM\_128\_HMAC\_SHA1\_80").  
  * tlsVersion: (D)TLS version (e.g., "FEFD" for DTLS 1.2).

These metrics are crucial for diagnosing WebRTC application issues, including call quality, connectivity, and media processing performance.