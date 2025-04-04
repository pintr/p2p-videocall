/**
 * Represents a user in the video call application.
 */
export class User {
  /**
   * The unique identifier for the user, typically the socket ID.
   */
  id: string;

  /**
   * The display name of the user.
   */
  name: string;

  /**
   * The ID of the room the user is currently in.
   */
  roomId: string;

  /**
   * Indicates whether the user is the host of the room.
   * A user is considered the host if they created the room.
   */
  isHost: boolean;

  /**
   * Indicates whether the user is currently connected to another peer.
   */
  connected: boolean;

  /**
   * Creates a new User instance.
   * 
   * @param id - The unique identifier for the user (socket ID).
   * @param name - The display name of the user.
   * @param roomId - The ID of the room the user is in.
   * @param isHost - Whether the user is the host of the room.
   */
  constructor(id: string, name: string, roomId: string, isHost: boolean) {
    this.id = id;
    this.name = name;
    this.roomId = roomId;
    this.isHost = isHost;
    this.connected = false;
  }
}