import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="!z-[9999] fixed pointer-events-none"
      position="bottom-right"
      duration={60000}
      closeButton={true}
      richColors={true}
      toastOptions={{
        className: "pointer-events-auto",
        classNames: {
          error: 'border-destructive/50 text-destructive',
          success: 'border-green-500/50 text-green-600',
          warning: 'border-yellow-500/50 text-yellow-600',
          info: 'border-blue-500/50 text-blue-600',
        }
      }}
      {...props}
    />
  )
}

export { Toaster }