// Route handler for NextAuth.js authentication
// This file handles authentication requests for the Next.js application using NextAuth.js.
// It exports GET and POST methods to handle authentication requests.
import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers