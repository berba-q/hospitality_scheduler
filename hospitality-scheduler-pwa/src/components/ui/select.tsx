// src/components/ui/select.tsx
"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void
}

export function Select({ onValueChange, onChange, className, children, ...props }: SelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onValueChange?.(e.target.value)
    onChange?.(e)
  }

  return (
    <div className="relative">
      <select
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
          className
        )}
        onChange={handleChange}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 pointer-events-none" />
    </div>
  )
}

// These components are for compatibility with shadcn/ui API but render as simple elements
// since we're using native HTML select
export function SelectTrigger({ 
  children: _children, 
  className: _className,
  ..._props 
}: React.HTMLAttributes<HTMLDivElement>) {
  // Don't render anything - the Select component handles the trigger
  return null
}

export function SelectValue({ placeholder: _placeholder }: { placeholder?: string }) {
  // Don't render anything - this will be handled by the native select
  return null
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  // Don't render wrapper - children (SelectItems) will render directly
  return <>{children}</>
}

export function SelectItem({ 
  value, 
  children,
  className,
  ...props 
}: { 
  value: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <option value={value} className={className} {...props}>
      {children}
    </option>
  )
}

// For compatibility
export const SelectGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const SelectLabel = ({ children }: { children: React.ReactNode }) => (
  <optgroup label={children?.toString()}></optgroup>
)
export const SelectSeparator = () => null