import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  /* Brand base: sharp 2px corners, DM Sans, UPPERCASE, tracked */
  "group/button inline-flex shrink-0 items-center justify-center rounded-[2px] border border-transparent bg-clip-padding text-xs font-medium uppercase tracking-[0.06em] whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /* Filled — Deep Green bg, light green text */
        default: "bg-[#135545] text-[#d0edd6] hover:bg-[#0c3b30]",
        /* Outline — visible on dark bg */
        outline:
          "border-[#283b43] bg-transparent text-[#90c0a6] font-medium hover:border-[#abe5b1]/40 hover:text-[#abe5b1] hover:bg-[#abe5b1]/5",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-muted hover:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-2 px-5",
        xs: "h-6 gap-1 px-3 text-[0.65rem]",
        sm: "h-7 gap-1.5 px-4",
        lg: "h-11 gap-2 px-6 text-sm tracking-[0.06em]",
        icon: "size-9",
        "icon-xs": "size-6",
        "icon-sm": "size-7",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
