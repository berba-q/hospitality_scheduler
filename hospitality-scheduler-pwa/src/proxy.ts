import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Add any custom middleware logic here
    console.log("Auth middleware:", req.nextauth.token?.email)
  },
  {
    pages: {
      signIn: '/login',
      error: '/auth/error',
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/schedule/:path*',
    '/staff/:path*',
    '/facilities/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/swaps/:path*'
  ]
}