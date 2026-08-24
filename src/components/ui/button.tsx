import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent text-xs font-semibold whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs",
        outline:
          "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs",
        secondary:
          "bg-slate-100 text-slate-800 hover:bg-slate-200",
        ghost:
          "hover:bg-slate-100 hover:text-slate-900",
        destructive:
          "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/60",
        link: "text-indigo-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5",
        xs: "h-6.5 px-2 text-[11px]",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-4 text-sm",
        icon: "size-9 p-0",
        "icon-xs": "size-6.5 p-0",
        "icon-sm": "size-8 p-0",
        "icon-lg": "size-10 p-0",
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
