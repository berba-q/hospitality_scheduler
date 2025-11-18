// TypeScript type definitions for our authentication system

// User information that comes from NextAuth
export interface User {
  id: string           // Unique user ID
  email: string        // User's email address
  name: string         // User's full name
  image?: string       // Profile picture URL (optional)
  isManager: boolean   // Whether user is a manager or staff
  tenantId?: string    // Which company/organization they belong to
  staff_id?: string    // Staff ID if the user is staff member
  whatsapp_number?: string  // User's WhatsApp number for notifications
}

// Session information that includes user data + auth tokens
export interface AuthSession {
  user: User           // User information
  accessToken: string  // JWT token for API requests
  provider: string     // Which OAuth provider was used (google, apple, etc.)
}

// We can add more types here later for:
// - Facility information
// - Schedule data
// - Swap requests
// - etc.