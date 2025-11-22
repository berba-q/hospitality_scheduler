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

// Account linking request interface
interface AccountLinkRequest {
  provider: string
  provider_id: string
  provider_email: string
  provider_data?: Record<string, unknown>
}

// Helper function to link accounts
// NOTE: Currently unused - account linking is handled via /api/account/link-provider route
// which has proper session access. This function would require a service-level access token
// to work from the NextAuth events context.
// async function linkAccount(linkRequest: AccountLinkRequest, accessToken: string) {
//   try {
//     const response = await fetch(`${process.env.FASTAPI_URL || 'http://localhost:8000'}/v1/account/link-provider`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${accessToken}`
//       },
//       body: JSON.stringify(linkRequest),
//     })
//
//     return response.ok
//   } catch (error) {
//     console.error('Account linking failed:', error)
//     return false
//   }
// }

export const { auth, signIn, signOut } = NextAuth({

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
          if (!credentials?.email || !credentials?.password) return null

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
    }),
    CredentialsProvider({
      id: "token-login",
      name: "Token Login",
      credentials: {
        token: { label: "Token", type: "text" }
      },
      async authorize(credentials) {
        try {
          console.log('AUTH DEBUG: Attempting token login')

          if (!credentials?.token) return null

          const accessToken = credentials.token as string
          const userInfo = decodeJWT(accessToken)

          if (userInfo) {
            return {
              id: userInfo.sub || userInfo.user_id,
              email: userInfo.email,
              name: userInfo.full_name || userInfo.name,
              isManager: userInfo.is_manager,
              tenantId: userInfo.tenant_id,
              accessToken: accessToken,
              provider: 'fastapi'
            }
          }

          return null
        } catch (error) {
          console.error('Token login error:', error)
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

          // Exchange OAuth credentials for backend token
          try {
            console.log('Calling backend OAuth login for:', profile.email)
            const response = await fetch(`${process.env.FASTAPI_URL || 'http://localhost:8000'}/v1/auth/oauth-login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: profile.email,
                provider: 'google'
              })
            })

            console.log('OAuth backend response status:', response.status)

            if (response.ok) {
              const data = await response.json()
              console.log('OAuth backend login success:', data)
              // Store backend token and user data in the user object
              // @ts-ignore - Adding custom properties to user object
              user.accessToken = data.access_token
              // @ts-ignore
              user.isManager = data.user.is_manager
              // @ts-ignore
              user.tenantId = data.user.tenant_id
              // @ts-ignore
              user.staff_id = data.user.staff_id
              // @ts-ignore
              user.facility_id = data.user.facility_id
              // @ts-ignore
              user.provider = 'google'
            } else {
              const errorText = await response.text()
              console.error('OAuth backend login failed:', response.status, errorText)
              return false
            }
          } catch (oauthError) {
            console.error('OAuth backend login error:', oauthError)
            return false
          }

          return true
        } catch (error) {
          // If error message contains URL, it's a redirect
          if (error instanceof Error && error.message.includes('http')) {
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
        // @ts-ignore - Custom properties from OAuth
        token.staff_id = user.staff_id
        // @ts-ignore
        token.facility_id = user.facility_id
      }

      return token
    },

    async session({ session, token }) {
      // Send properties to the client
      if (token.sub) {
        session.user.id = token.sub
      }
      session.user.isManager = token.isManager
      session.user.tenantId = token.tenantId
      // @ts-ignore - Custom properties
      session.user.staff_id = token.staff_id
      // @ts-ignore
      session.user.facility_id = token.facility_id
      session.accessToken = token.accessToken
      session.provider = token.provider

      return session
    }
  },

  pages: {
    signIn: '/login',
    error: '/auth/error',
    // Note: NextAuth doesn't support 'signUp' - handle signup separately in your app
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  events: {
    async linkAccount({ user, account, profile }) {
      console.log('LINK ACCOUNT EVENT:', { user, account, profile })

      // This fires when an account is successfully linked via OAuth
      // Sync the account linking with FastAPI backend
      if (account && profile && user.email) {
        try {
          // Get the access token from the user object (set during JWT callback)
          // Note: In events, we don't have direct access to the token, so this is a best-effort attempt
          // The frontend should also handle this via the /api/account/link-provider endpoint
          const linkRequest: AccountLinkRequest = {
            provider: account.provider,
            provider_id: account.providerAccountId,
            provider_email: profile.email as string,
            provider_data: {
              name: profile.name,
              image: profile.image,
            }
          }

          console.log('Attempting to sync account link with backend:', linkRequest)
          // Note: This would require a service-level access token or different auth mechanism
          // For now, the frontend handles this through the API route which has proper session access
        } catch (error) {
          console.error('Failed to sync account linking with backend:', error)
        }
      }
    },

    async createUser({ user }) {
      console.log('CREATE USER EVENT:', user)
      // Handle new user creation
    }
  }
})