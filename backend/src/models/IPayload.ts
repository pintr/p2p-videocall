/**
 * Represents a generic payload, useful for messages exchange.
 */
export interface IPayload {
    /**
     * User sending the message.
     */
    userId: string;

    /**
     * Room joined by the user.
     */
    roomId: string;

    /**
     * Content of the payload.
     */
    data?: any;
}