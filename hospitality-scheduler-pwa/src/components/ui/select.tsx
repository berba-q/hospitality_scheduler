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
export function SelectTrigger(..._args: [React.HTMLAttributes<HTMLDivElement>?]) {
  // Don't render anything - the Select component handles the trigger
  void _args
  return null
}

export function SelectValue(..._args: [{ placeholder?: string }?]) {
  // Don't render anything - this will be handled by the native select
  void _args
  return null
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  // Don't render wrapper - children (SelectItems) will render directly
  return <>{children}</>
}

//  Extract text content from complex JSX to prevent hydration errors
function extractTextContent(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children
  }

  if (typeof children === 'number') {
    return children.toString()
  }

  if (React.isValidElement(children)) {
    // If it's a React element, recursively extract text from its children
    const props = children.props as { children?: React.ReactNode }
    if (props.children) {
      return extractTextContent(props.children)
    }
    return ''
  }

  if (Array.isArray(children)) {
    // If it's an array of children, extract text from each and join
    return children.map(child => extractTextContent(child)).join('')
  }

  // Fallback for other types
  return String(children || '')
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
  // Extract only text content for the <option> element
  const textContent = extractTextContent(children)
  
  return (
    <option value={value} className={className} {...props}>
      {textContent}
    </option>
  )
}

// For compatibility
export const SelectGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const SelectLabel = ({ children }: { children: React.ReactNode }) => (
  <optgroup label={children?.toString()}></optgroup>
)
export const SelectSeparator = () => null