/**
 * Represents an ICE server configuration used for WebRTC connections.
 */
export interface IIceServer {
  /**
   * The URL(s) of the ICE server. This can be a STUN or TURN server.
   */
  urls: string;

  /**
   * The optional username for authentication when using a TURN server.
   */
  username?: string;

  /**
   * The optional credential (password) for authentication when using a TURN server.
   */
  credential?: string;
}