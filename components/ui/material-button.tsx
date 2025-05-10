"use client"

import type React from "react"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: "material-button",
        outline: "material-button-outline",
        ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100",
        link: "text-slate-900 dark:text-slate-100 underline-offset-4 hover:underline",
        fab: "material-fab",
        tonal:
          "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-9 rounded-full px-4",
        lg: "h-14 rounded-full px-8 text-base",
        icon: "h-12 w-12",
        "icon-sm": "h-9 w-9",
        "icon-lg": "h-14 w-14",
      },
      elevation: {
        none: "shadow-none",
        sm: "shadow-sm",
        default: "shadow-md hover:shadow-lg",
        lg: "shadow-lg hover:shadow-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      elevation: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const MaterialButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, elevation, asChild = false, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, elevation, className }))} ref={ref} {...props} />
  },
)
MaterialButton.displayName = "MaterialButton"

export { MaterialButton, buttonVariants }
