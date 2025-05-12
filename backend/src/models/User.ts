/**
 * Represents a user in the video call application.
 */
export class User {
  /**
   * The unique identifier for the user, typically the socket ID.
   */
  id: string;
  /**
   * The socket ID.
   */
  socketId: string;

  /**
   * The display name of the user.
   */
  name: string;

  /**
   * The ID of the room the user is currently in.
   */
  roomId: string;

  /**
   * Timestamp when the user joined.
   */
  joined: number;

  /**
   * Creates a new User instance.
   * 
   * @param {string} userId - Unique user ID created by the client.
   * @param {string} socketId - The socket id for the user.
   * @param {string} name - The display name of the user.
   * @param {string} roomId - The ID of the room the user is in.
   */
  constructor(userId: string, socketId: string, name: string, roomId: string) {
    this.id = userId;
    this.socketId = socketId;
    this.name = name;
    this.roomId = roomId;
    this.joined = Date.now();
  }
  /**
   * Serializes the User instance into a plain object.
   * 
   * @returns {object} A plain object representation of the user.
   */
  serialize(): object {
    return {
      id: this.id,
      socketId: this.socketId,
      name: this.name,
      roomId: this.roomId,
      joined: new Date(this.joined),
    };
  }

}