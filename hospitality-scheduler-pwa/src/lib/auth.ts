//Authentication
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

// Helper function to decode JWT and extract user info
function decodeJWT(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: "fastapi-credentials",
      name: "FastAPI Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          console.log(' AUTH DEBUG: Attempting login for:', credentials.email)
          
          const response = await fetch(`${process.env.FASTAPI_URL || 'http://localhost:8000'}/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              username: credentials.email as string,
              password: credentials.password as string,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            console.log(' AUTH DEBUG: Login response:', data)
            
            // Use the user object from the API response instead of trying to decode JWT
            let userInfo = null
            
            if (data.user) {
              // The backend already gives us properly formatted user data!
              userInfo = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.name,
                isManager: data.user.is_manager,  // 
                tenantId: data.user.tenant_id,   // 
                facilityId: data.user.facility_id,
                staffId: data.user.staff_id,
              }
            }
            
            console.log('🔍 AUTH DEBUG: Final user info:', userInfo)
            
            // Only return user if we have valid data
            if (userInfo?.id) {
              return {
                id: userInfo.id,
                email: userInfo.email,
                name: userInfo.name,
                accessToken: data.access_token,
                isManager: userInfo.isManager,     
                tenantId: userInfo.tenantId,
                facilityId: userInfo.facilityId,
                staffId: userInfo.staffId,
              }
            } else {
              console.error('❌ AUTH ERROR: No valid user data in response')
              return null
            }
          }
          
          console.error('FastAPI login failed:', response.status, response.statusText)
          return null
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        console.log('🔍 JWT DEBUG: Setting token for user:', user)
        token.accessToken = (user as any).accessToken
        token.isManager = (user as any).isManager      // 
        token.tenantId = (user as any).tenantId
        token.facilityId = (user as any).facilityId
        token.staffId = (user as any).staffId
        token.provider = account?.provider
      }
      console.log('🔍 JWT DEBUG: Final token:', token)
      return token
    },
    async session({ session, token }) {
      console.log('🔍 SESSION DEBUG: Creating session:', { token, session })
      
      // Copy the user ID from token.sub to session.user.id
      if (token.sub) {
        (session.user as any).id = token.sub 
      }
      
      // Copy other fields from token to session
      ;(session as any).accessToken = token.accessToken
      ;(session.user as any).isManager = token.isManager    // 
      ;(session.user as any).tenantId = token.tenantId
      ;(session.user as any).facilityId = token.facilityId
      ;(session.user as any).staffId = token.staffId
      ;(session as any).provider = token.provider
      
      console.log('🔍 SESSION DEBUG: Final session.user:', session.user)
      console.log('🔍 SESSION DEBUG: session.user.isManager:', (session.user as any).isManager)
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
})