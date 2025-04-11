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
   * Timestamp when the user joined.
   */
  joined: number;

  /**
   * Creates a new User instance.
   * 
   * @param {string} id - The unique identifier for the user (socket ID).
   * @param {string} name - The display name of the user.
   * @param {string} roomId - The ID of the room the user is in.
   */
  constructor(id: string, name: string, roomId: string) {
    this.id = id;
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
      name: this.name,
      roomId: this.roomId,
      joined: new Date(this.joined),
    };
  }

}