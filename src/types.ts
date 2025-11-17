/**
 * types.ts
 * --------
 * Shared TypeScript models representing data persisted in Firebase. Using
 * central type definitions keeps Firestore access consistent across screens.
 */

/** Union of user personas supported by the app (volunteers or event organisers). */
export type UserRole = "volunteer" | "organiser";

/**
 * Preprocessed representation of a Firebase auth user merged with Firestore metadata.
 */
export interface AppUser {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
}

/**
 * Volunteer event document containing the information required to render cards and details.
 */
export interface Event {
  id: string;
  title: string;
  description: string;
  tasks: string;
  category: string;
  locationText: string;
  dateTime: Date;
  createdBy: string;
  maxVolunteers: number;
  currentVolunteers: number;
  imageUrls: string[];
}

/** Participation records track a user's engagement with a specific event over time. */
export interface Participation {
  id: string;
  userId: string;
  eventId: string;
  status: "signed_up" | "withdrawn" | "attended";
  createdAt: Date;
}
