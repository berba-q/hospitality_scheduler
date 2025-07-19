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
import { NotificationBell } from '@/components/notification/NotificationBell'

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
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
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
                    className={`gap-2 ${
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

          {/* 🔥 RIGHT SIDE - NOTIFICATION BELL + USER MENU */}
          <div className="flex items-center gap-3">
            {/* 🔔 NOTIFICATION BELL - ALWAYS VISIBLE AND PROMINENT */}
            <div className="relative">
              <NotificationBell />
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">
                    {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <div className="font-medium">{session?.user?.name}</div>
                  <div className="text-xs text-gray-500">{session?.user?.email}</div>
                </div>
                <ChevronDown className="w-4 h-4 ml-1" />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="font-medium text-gray-900">{session?.user?.name}</div>
                    <div className="text-sm text-gray-500">{session?.user?.email}</div>
                    <div className="flex gap-2 mt-2">
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
        </div>

        {/* Mobile Navigation with Notification Bell */}
        <div className="md:hidden border-t border-gray-200 py-2">
          <div className="flex justify-between items-center">
            {/* Mobile Navigation Items */}
            <div className="flex gap-1 overflow-x-auto flex-1">
              {visibleItems.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.href}
                    variant={item.active ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => router.push(item.href)}
                    className={`gap-1 whitespace-nowrap text-xs ${
                      item.active 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600' 
                        : ''
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {item.label}
                  </Button>
                )
              })}
            </div>
            
            {/* 🔔 MOBILE NOTIFICATION BELL */}
            <div className="ml-3">
              <NotificationBell />
            </div>
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