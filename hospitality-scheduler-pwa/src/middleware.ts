import { auth } from "@/lib/auth"

export default auth((req) => {
  // Add any custom middleware logic here
  console.log("Auth middleware:", req.auth?.user?.email)
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/schedule/:path*', 
    '/staff/:path*',
    '/facilities/:path*'
  ]
}