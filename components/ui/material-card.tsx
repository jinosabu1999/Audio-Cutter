"use client"

import type React from "react"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const cardVariants = cva("rounded-3xl overflow-hidden transition-all duration-300", {
  variants: {
    variant: {
      default: "material-card bg-white dark:bg-slate-800",
      elevated: "material-card bg-white dark:bg-slate-800 shadow-lg hover:shadow-xl",
      filled: "bg-slate-100 dark:bg-slate-700",
      outlined: "border-2 border-slate-200 dark:border-slate-700",
      glass: "glass-effect",
      neumorphic: "neumorphic-light dark:neumorphic-dark",
    },
    padding: {
      none: "p-0",
      sm: "p-4",
      default: "p-6",
      lg: "p-8",
    },
    shape: {
      default: "rounded-3xl",
      circle: "rounded-full",
      blob1: "shape-blob-1",
      blob2: "shape-blob-2",
      blob3: "shape-blob-3",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "default",
    shape: "default",
  },
})

export interface MaterialCardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const MaterialCard = forwardRef<HTMLDivElement, MaterialCardProps>(
  ({ className, variant, padding, shape, ...props }, ref) => {
    return <div ref={ref} className={cn(cardVariants({ variant, padding, shape, className }))} {...props} />
  },
)
MaterialCard.displayName = "MaterialCard"

export { MaterialCard, cardVariants }
