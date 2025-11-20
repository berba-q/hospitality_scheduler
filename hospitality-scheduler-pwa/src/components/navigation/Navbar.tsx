//components/navigation/Navbar.tsx
// Navigation bar component for the Schedula PWA
'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
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
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { useTranslations } from '@/hooks/useTranslations'

export function Navbar() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  // Add translation hook
  const { t } = useTranslations()

  const isManager = session?.user?.isManager
  
  const navigationItems = [
    {
      label: t('navigation.dashboard'), // Now using translations!
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard'
    },
    {
      label: t('navigation.staff'),
      href: '/staff',
      icon: Users,
      active: pathname === '/staff',
      managerOnly: true
    },
    {
      label: t('navigation.schedule'),
      href: '/schedule',
      icon: Calendar,
      active: pathname.startsWith('/schedule'),
      managerOnly: false
    },
    {
      label: t('navigation.facilities'),
      href: '/facilities',
      icon: Building,
      active: pathname === '/facilities',
      managerOnly: true
    },
    {
      label: t('navigation.swaps'),
      href: '/swaps',
      icon: RefreshCw,
      active: pathname === '/swaps',
      managerOnly: false
    },
    {
      label: t('navigation.settings'),
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
              <Image
                src="/icons/icons/icon-96x96.png"
                alt="Schedula"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Schedula
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

          {/* Right side with Language Selector + User Menu */}
          <div className="flex items-center gap-3">
            {/* 🔔 NOTIFICATION BELL (Desktop) */}
            <div className="hidden md:block">
              <NotificationBell />
            </div>
            
            {/* 🌍 LANGUAGE SELECTOR - New! */}
            <LanguageSelector />

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 top-12 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {session?.user?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session?.user?.email}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={isManager ? 'default' : 'secondary'} className="text-xs">
                        {isManager ? t('common.manager') : t('common.staff')}
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
                      {t('common.profileSettings')}
                    </button>
                    
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('auth.signOut')}
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