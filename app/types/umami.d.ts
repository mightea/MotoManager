/** JSON-serializable value accepted in an Umami event/identify payload. */
export type UmamiEventValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | UmamiEventValue[]
  | { [key: string]: UmamiEventValue };

/** Payload attached to a tracked event or a session identify call. */
export type UmamiEventData = Record<string, UmamiEventValue>;

export interface UmamiTracker {
  track: {
    /** Track a page view */
    (): void;
    /** Track a custom event */
    (eventName: string, eventData?: UmamiEventData): void;
    /** Track an event with an object payload */
    (data: { name: string; data?: UmamiEventData }): void;
  };
  identify: {
    /**
     * Identify a user session with a distinct ID and optional session data.
     * The ID is what the umami dashboard shows for the visitor.
     */
    (uniqueId: string, data?: UmamiEventData): void;
    /** Attach session data without setting a distinct ID. */
    (data: UmamiEventData): void;
  };
}

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}
