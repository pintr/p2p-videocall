import { User } from "./User.js";

/**
 * Represents a room in the video call system.
 */
export class Room {
  /**
   * The unique identifier for the room.
   */
  id: string;

  /**
   * The list of users currently in the room.
   */
  users: User[];

  /**
   * Creates a new Room instance.
   * @param id - The unique identifier for the room.
   */
  constructor(id: string) {
    this.id = id;
    this.users = [];
  }

  /**
   * Adds a user to the room if the room is not full.
   * @param user - The user to be added to the room.
   */
  addUser(user: User) {
    if (this.users.length < 2) {
      this.users.push(user);
    }
  }

  /**
   * Removes a user from the room by their unique identifier.
   * @param userId - The unique identifier of the user to be removed.
   */
  removeUser(userId: string) {
    this.users = this.users.filter((user) => user.id !== userId);
  }

  /**
   * Checks if the room is full.
   * @returns `true` if the room has 2 or more users, otherwise `false`.
   */
  isFull(): boolean {
    return this.users.length >= 2;
  }
}
