// === ui/dropdown-menu.tsx ===
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuProps {
  children: React.ReactNode
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  return <div className="relative inline-block">{children}</div>
}

interface DropdownMenuTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

export function DropdownMenuTrigger({ asChild, children }: DropdownMenuTriggerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  
  const element = asChild ? 
    React.cloneElement(children as React.ReactElement, {
      onClick: () => setIsOpen(!isOpen)
    }) : 
    <button onClick={() => setIsOpen(!isOpen)}>{children}</button>

  return (
    <>
      {element}
      {isOpen && (
        <div 
          className="fixed inset-0 z-10" 
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
  return (
    <button
      className={cn(
        "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100",
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}