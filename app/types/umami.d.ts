export interface UmamiTracker {
  track: {
    /** Track a page view */
    (): void;
    /** Track a custom event */
    (eventName: string, eventData?: Record<string, any>): void;
    /** Track an event with an object payload */
    (data: { name: string; data?: Record<string, any> }): void;
  };
  /**
   * Identify a user session.
   * @param data - User data to associate with the session (e.g., { email: 'user@example.com' })
   */
  identify: (data: Record<string, any>) => void;
}

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}
