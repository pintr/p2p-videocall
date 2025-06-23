## Scenario
Search and rescue rover that preserves the P2P connection while moving and proactively changes network based on various metrics (signal strength, bitrate, latency, and packet loss) and mobility prediction.

## Features
[] Use a low level language to interface with network management, i.e. Rust
[] Add connection metrics collection and analysis
[] Change networks based on the metrics and mobility prediction in a known path
[] Setup reconnectionDelay and ICE renegotiation
[] Use data channels to move the rover
[] Collect metrics on latency when connection is switched

## Future work
Implement the same with QUIC P2P and compare the two solutions