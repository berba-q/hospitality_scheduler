// src/components/ui/popover.tsx
// src/components/ui/popover.tsx
"use client"

/* ------------------------------------------------------------------ */
/*  Popover context                                                   */
/* ------------------------------------------------------------------ */
interface PopoverContextValue {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const PopoverContext = React.createContext<PopoverContextValue | undefined>(
  undefined,
)

function usePopoverContext() {
  const ctx = React.useContext(PopoverContext)
  if (!ctx) {
    throw new Error("Popover components must be wrapped in <Popover>")
  }
  return ctx
}

import * as React from "react"
import { cn } from "@/lib/utils"

interface PopoverProps {
  children: React.ReactNode
}

export function Popover({
  children,
  defaultOpen = false,
}: PopoverProps & { defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  )
}

interface PopoverTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

export function PopoverTrigger({
  asChild,
  children,
}: PopoverTriggerProps) {
  const { open, setOpen } = usePopoverContext()

  function handleClick(e: React.MouseEvent) {
    setOpen(!open)
    if (children && (children as React.ReactElement).props.onClick) {
      ;(children as React.ReactElement).props.onClick(e)
    }
  }

  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: handleClick,
    })
  }

  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  <PopoverContent>                                                  */
/* ------------------------------------------------------------------ */
interface PopoverContentProps {
  className?: string
  children: React.ReactNode
  align?: "start" | "end"
}


export function PopoverContent({
  className,
  children,
  align = "start",
}: PopoverContentProps) {
  const { open, setOpen } = usePopoverContext()
  const ref = React.useRef<HTMLDivElement>(null)

  // Close on outside‑click or when Esc is pressed
  React.useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open, setOpen])

  if (!open) return null

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 w-72 rounded-md border bg-white p-4 shadow-md",
        align === "end" ? "right-0" : "left-0",
        "top-full mt-1",
        className,
      )}
    >
      {children}
    </div>
  )
}