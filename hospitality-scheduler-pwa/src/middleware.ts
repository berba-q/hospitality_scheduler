import { auth } from "@/lib/auth"
export default auth((req) => {
  // Add any custom middleware logic here
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/schedule/:path*', 
    '/staff/:path*',
    '/facilities/:path*'
  ]
}