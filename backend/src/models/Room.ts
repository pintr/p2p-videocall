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
  users: Map<string, User>;

  /*
   * Timestamp when the room was created.
   */
  created: number;

  /**
   * Maximum number of users. Default: 2
   */
  maxUsers: number;

  /**
   * Creates a new Room instance.
   * @param id - The unique identifier for the room.
   */
  constructor(id: string) {
    this.id = id;
    this.users = new Map<string, User>();
    this.created = Date.now();
    this.maxUsers = 2;
  }

  /**
   * Adds a user to the room if the room is not full.
   * @param user - The user to be added to the room.
   */
  addUser(user: User) {
    this.users.set(user.id, user);
  }

  /**
   * Removes a user from the room by their unique identifier.
   * @param userId - The unique identifier of the user to be removed.
   */
  removeUser(userId: string) {
    this.users.delete(userId);
  }

  /**
   * Get a user based on its id.
   * @param userId - The unique identifier of the user.
   * 
   * @returns The user if it exists, `undefined` otherwise .
   */
  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  /**
   * Checks if the room is full.
   * @returns `true` if the room is empty, `false` otherwise.
   */
  isEmpty(): boolean {
    return this.users.size === 0;
  }

  /**
   * Checks if the room is full.
   * @returns `true` if the room has 2 or more users, `false` otherwise.
   */
  isFull(): boolean {
    return this.users.size >= this.maxUsers;
  }
}
