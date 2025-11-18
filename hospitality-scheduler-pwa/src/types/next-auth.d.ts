import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    provider?: string
    user: {
      id: string
      email: string
      name: string
      image?: string
      isManager?: boolean
      tenantId?: string
      staff_id?: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    image?: string
    isManager?: boolean
    tenantId?: string
    staff_id?: string
    accessToken?: string
    provider?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    isManager?: boolean
    tenantId?: string
    provider?: string
  }
}
