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
   * The identifier of the creator of the room.
   */
  creator: string;

  /**
   * The list of users currently in the room.
   */
  users: Map<string, User>;

  /** 
   * Timestamp when the room was created.
   */
  created: number;

  /**
   * Maximum number of users. Default: 2
   */
  maxUsers: number;

  /**
   * Creates a new Room instance.
   * @param {string} id - The unique identifier for the room.
   * @param {string} creator - The id of the creator of the room.
   */
  constructor(id: string, creator: string) {
    this.id = id;
    this.creator = creator;
    this.users = new Map<string, User>();
    this.created = Date.now();
    this.maxUsers = 2;
  }

  /**
   * Checks if the user is the creator of the room 
   * @param {string} userId 
   * @returns {boolean}  Whther the user is the creator of the room.
   */
  isCreator(userId: string): boolean {
    return this.creator === userId;
  }
  /**
   * Adds a user to the room if the room is not full.
   * @param {User} user - The user to be added to the room.
   */
  addUser(user: User) {
    this.users.set(user.id, user);
  }

  /**
   * Removes a user from the room by their unique identifier.
   * @param {string} userId - The unique identifier of the user to be removed.
   */
  removeUser(userId: string) {
    this.users.delete(userId);
  }

  /**
   * Checks if the user is present in the room.
   * @param {string} userId - The unique identifier of the user.
   * 
   * @returns {boolean}  Whther the user is in the room.
   */
  hasUser(userId: string): boolean {
    return this.users.has(userId);
  }

  /**
   * Get a user based on its id.
   * @param {string} userId - The unique identifier of the user.
   * 
   * @returns {User | undefined}  The user if it exists, `undefined` otherwise .
   */
  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  /**
   * Checks if the room is full.
   * @returns {boolean}  `true` if the room is empty, `false` otherwise.
   */
  isEmpty(): boolean {
    return this.users.size === 0;
  }

  /**
   * Checks if the room is full.
   * @returns {boolean}  `true` if the room has 2 or more users, `false` otherwise.
   */
  isFull(): boolean {
    return this.users.size >= this.maxUsers;
  }

  /**
   * Format the Room for logging purposes
   * @returns {object} the printable room object
   */
  print(): object {
    return {
      id: this.id,
      creator: this.creator,
      created: new Date(this.created).toISOString(),
      maxUsers: this.maxUsers,
      users: [...this.users.values()].map(user => user.print())
    };
  }
}
