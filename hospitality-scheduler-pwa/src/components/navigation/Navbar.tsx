'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Settings, 
  Building, 
  RefreshCw,
  ChevronDown,
  LogOut,
  User
} from 'lucide-react'

export function Navbar() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const isManager = session?.user?.isManager
  
  const navigationItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard'
    },
    {
      label: 'Staff',
      href: '/staff',
      icon: Users,
      active: pathname === '/staff',
      managerOnly: true // Only managers see staff
    },
    {
      label: 'Schedule',
      href: '/schedule',
      icon: Calendar,
      active: pathname.startsWith('/schedule'),
      managerOnly: false
    },
    {
      label: 'Facilities',
      href: '/facilities',
      icon: Building,
      active: pathname === '/facilities',
      managerOnly: true // Only managers see facilities
    },
    {
      label: 'Swaps',
      href: '/swaps',
      icon: RefreshCw,
      active: pathname === '/swaps',
      managerOnly: false
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      active: pathname === '/settings',
      managerOnly: true
    }
  ]

  const visibleItems = navigationItems.filter(item => 
    !item.managerOnly || isManager
  )

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => router.push('/dashboard')}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">🏨</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                HospitalityScheduler
              </span>
            </div>

            {/* Navigation Items */}
            <div className="hidden md:flex items-center gap-1">
              {visibleItems.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.href}
                    variant={item.active ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => router.push(item.href)}
                    className={`gap-2 transition-all duration-200 ${
                      item.active 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="gap-2 hover:bg-gray-100"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium">{session?.user?.name}</span>
                <div className="flex gap-1">
                  <Badge variant={isManager ? 'default' : 'secondary'} className="text-xs">
                    {isManager ? 'Manager' : 'Staff'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {session?.provider === 'google' ? 'Google' : 'FastAPI'}
                  </Badge>
                </div>
              </div>
              <ChevronDown className="w-4 h-4" />
            </Button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                  <p className="text-xs text-gray-500">{session?.user?.email}</p>
                  <div className="flex gap-1 mt-2">
                    <Badge variant={isManager ? 'default' : 'secondary'} className="text-xs">
                      {isManager ? 'Manager' : 'Staff'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {session?.provider === 'google' ? 'Google' : 'FastAPI'}
                    </Badge>
                  </div>
                </div>
                
                <div className="py-2">
                  <button
                    onClick={() => {
                      router.push('/profile')
                      setShowUserMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Profile Settings
                  </button>
                  
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 py-2">
          <div className="flex gap-1 overflow-x-auto">
            {visibleItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.href}
                  variant={item.active ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => router.push(item.href)}
                  className={`gap-1 whitespace-nowrap ${
                    item.active 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600' 
                      : ''
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </nav>
  )
}