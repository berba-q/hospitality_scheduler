// src/components/ui/popover.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PopoverProps {
  children: React.ReactNode
}

export function Popover({ children }: PopoverProps) {
  return <div className="relative inline-block">{children}</div>
}

interface PopoverTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  onClick?: React.MouseEventHandler<any> // Use 'any' for flexibility
}

export function PopoverTrigger({ asChild, children, onClick }: PopoverTriggerProps) {
  if (asChild) {
    // When asChild is true, clone the child element and add onClick
    return React.cloneElement(children as React.ReactElement, { 
      onClick
    })
  }
  
  return (
    <button onClick={onClick} type="button">
      {children}
    </button>
  )
}

interface PopoverContentProps {
  className?: string
  children: React.ReactNode
  align?: "start" | "end"
}

export function PopoverContent({ className, children, align = "start" }: PopoverContentProps) {
  return (
    <div 
      className={cn(
        "absolute z-50 w-72 rounded-md border bg-white p-4 shadow-md",
        align === "end" ? "right-0" : "left-0",
        "top-full mt-1",
        className
      )}
    >
      {children}
    </div>
  )
}