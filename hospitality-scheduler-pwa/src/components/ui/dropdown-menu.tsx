// components/ui/dropdown-menu.tsx
// Dropdown menu component for the Hospitality Scheduler PWA
// This component provides a reusable dropdown menu with trigger and content components
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Context to share state between trigger and content
interface DropdownContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const DropdownContext = React.createContext<DropdownContextType | undefined>(undefined)

const useDropdown = () => {
  const context = React.useContext(DropdownContext)
  if (!context) {
    throw new Error('Dropdown components must be used within DropdownMenu')
  }
  return context
}

interface DropdownMenuProps {
  children: React.ReactNode
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  
  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

interface DropdownMenuTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

export function DropdownMenuTrigger({ asChild, children }: DropdownMenuTriggerProps) {
  const { isOpen, setIsOpen } = useDropdown()
  
  const handleClick = () => setIsOpen(!isOpen)
  
  const element = asChild ?
    React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: handleClick
    }) :
    <button onClick={handleClick}>{children}</button>

  return (
    <>
      {element}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

interface DropdownMenuContentProps {
  align?: "start" | "end"
  className?: string
  children: React.ReactNode
}

export function DropdownMenuContent({ 
  align = "start", 
  className, 
  children 
}: DropdownMenuContentProps) {
  const { isOpen } = useDropdown()
  
  if (!isOpen) return null
  
  return (
    <div 
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 shadow-md",
        align === "end" ? "right-0" : "left-0",
        "top-full mt-1",
        className
      )}
    >
      {children}
    </div>
  )
}

interface DropdownMenuItemProps {
  className?: string
  onClick?: () => void
  children: React.ReactNode
}

export function DropdownMenuItem({ 
  className, 
  onClick, 
  children 
}: DropdownMenuItemProps) {
  const { setIsOpen } = useDropdown()
  
  const handleClick = () => {
    onClick?.()
    setIsOpen(false) // Close dropdown when item is clicked
  }
  
  return (
    <button
      className={cn(
        "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </button>
  )
}