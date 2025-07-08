import NextAuth from "next-auth"
import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers

// Create the NextAuth handler with our configuration
const handler = NextAuth(authOptions)

// Export it for both GET and POST requests
// NextAuth needs both to handle the OAuth flow
export { handler as GET, handler as POST }