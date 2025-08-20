// Authentication
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

// Helper function to check for account linking suggestions
async function checkAccountLinking(provider: string, email: string) {
  try {
    const response = await fetch(`${process.env.FASTAPI_URL || 'http://localhost:8000'}/v1/account/suggest-linking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, provider_email: email }),
    })
    
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.error('Account linking check failed:', error)
  }
  return null
}

// Helper function to link accounts
async function linkAccount(userId: string, linkRequest: any, accessToken: string) {
  try {
    const response = await fetch(`${process.env.FASTAPI_URL || 'http://localhost:8000'}/v1/account/link-provider`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(linkRequest),
    })
    
    return response.ok
  } catch (error) {
    console.error('Account linking failed:', error)
    return false
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
          console.log('AUTH DEBUG: Attempting login for:', credentials.email)
          
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
            console.log('AUTH DEBUG: Login response:', data)
            
            // Use the user object from the API response
            let userInfo = null
            
            if (data.user) {
              userInfo = data.user
            } else if (data.access_token) {
              userInfo = decodeJWT(data.access_token)
            }

            if (userInfo) {
              return {
                id: userInfo.sub || userInfo.user_id,
                email: userInfo.email,
                name: userInfo.full_name || userInfo.name,
                isManager: userInfo.is_manager,
                tenantId: userInfo.tenant_id,
                accessToken: data.access_token,
                provider: 'fastapi'
              }
            }
          }
          
          return null
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      }
    })
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SIGNIN CALLBACK:', { user, account, profile })
      
      // Handle OAuth providers (Google, etc.)
      if (account?.provider === 'google' && profile?.email) {
        try {
          // Check if account linking is suggested
          const linkingSuggestion = await checkAccountLinking('google', profile.email)
          
          if (linkingSuggestion?.link_suggestion) {
            // Store linking suggestion in URL params for frontend to handle
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
            const params = new URLSearchParams({
              action: 'link_accounts',
              provider: 'google',
              email: profile.email,
              existing_user_id: linkingSuggestion.user_id,
              existing_providers: JSON.stringify(linkingSuggestion.existing_providers)
            })
            
            // Redirect to account linking page
            throw new Error(`${baseUrl}/auth/link-accounts?${params.toString()}`)
          }
          
          // If no existing account, proceed with normal OAuth flow
          return true
        } catch (error) {
          // If error message contains URL, it's a redirect
          if (error.message.includes('http')) {
            return error.message
          }
          console.error('SignIn callback error:', error)
          return false
        }
      }
      
      return true
    },

    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.accessToken = user.accessToken
        token.isManager = user.isManager
        token.tenantId = user.tenantId
        token.provider = user.provider || account?.provider
      }
      
      return token
    },

    async session({ session, token }) {
      // Send properties to the client
      session.user.id = token.sub
      session.user.isManager = token.isManager
      session.user.tenantId = token.tenantId
      session.accessToken = token.accessToken
      session.provider = token.provider
      
      return session
    }
  },

  pages: {
    signIn: '/login',
    signUp: '/signup',
    error: '/auth/error',
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  events: {
    async linkAccount({ user, account, profile }) {
      console.log('LINK ACCOUNT EVENT:', { user, account, profile })
      
      // This fires when an account is successfully linked
      // You could send notifications, audit logs, etc.
    },
    
    async createUser({ user }) {
      console.log('CREATE USER EVENT:', user)
      // Handle new user creation
    }
  }
})