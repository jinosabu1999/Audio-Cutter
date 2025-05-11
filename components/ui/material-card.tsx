"use client"

import type React from "react"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const cardVariants = cva("rounded-xl overflow-hidden transition-all duration-300", {
  variants: {
    variant: {
      default: "card",
      elevated: "card shadow-lg hover:shadow-xl",
      filled: "bg-slate-100 dark:bg-slate-700",
      outlined: "border-2 border-slate-200 dark:border-slate-700",
      glass: "glass-effect",
    },
    padding: {
      none: "p-0",
      sm: "p-4",
      default: "p-6",
      lg: "p-8",
    },
    shape: {
      default: "rounded-xl",
      circle: "rounded-full",
      blob1: "rounded-[71%_29%_41%_59%/59%_43%_57%_41%]",
      blob2: "rounded-[37%_63%_56%_44%/49%_56%_44%_51%]",
      blob3: "rounded-[63%_37%_37%_63%/43%_37%_63%_57%]",
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
