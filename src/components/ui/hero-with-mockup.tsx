import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Mockup } from "@/components/ui/mockup"
import { Glow } from "@/components/ui/glow"
import Image from "next/image"

interface HeroWithMockupProps {
  title: string
  description: string
  primaryCta?: {
    text: string
    href?: string
    onClick?: () => void
  }
  secondaryCta?: {
    text: string
    href?: string
    onClick?: () => void
    icon?: React.ReactNode
  }
  mockupImage: {
    src: string
    alt: string
    width: number
    height: number
  }
  className?: string
}

export function HeroWithMockup({
  title,
  description,
  primaryCta = {
    text: "Get Started",
    href: "/get-started",
  },
  secondaryCta,
  mockupImage,
  className,
}: HeroWithMockupProps) {
  return (
    <section
      className={cn(
        "relative bg-background text-foreground",
        "py-12 px-4 md:py-24 lg:py-32",
        "overflow-hidden",
        "animate-appear",
        className,
      )}
    >
      <div className="relative mx-auto max-w-[1280px] flex flex-col gap-12 lg:gap-24">
        <div className="relative z-10 flex flex-col items-center gap-6 pt-8 md:pt-16 text-center lg:gap-12">
          {/* Heading */}
          <h1
            className={cn(
              "inline-block animate-appear",
              "bg-gradient-to-b from-foreground via-foreground/90 to-muted-foreground",
              "bg-clip-text text-transparent",
              "text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl",
              "leading-[1.1] sm:leading-[1.1]",
              "drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]",
              "opacity-0 [animation-delay:100ms]"
            )}
          >
            {title}
          </h1>

          {/* Description */}
          <p
            className={cn(
              "max-w-[550px] animate-appear opacity-0 [animation-delay:250ms]",
              "text-base sm:text-lg md:text-xl",
              "text-muted-foreground",
              "font-medium",
            )}
          >
            {description}
          </p>

          {/* CTAs */}
          <div
            className="relative z-10 flex flex-wrap justify-center gap-4 
            animate-appear opacity-0 [animation-delay:400ms]"
          >
            <Button
              asChild={!primaryCta.onClick && !!primaryCta.href}
              size="lg"
              onClick={primaryCta.onClick}
              className={cn(
                "bg-gradient-to-b from-primary to-primary/90",
                "hover:from-primary/95 hover:to-primary/85",
                "text-primary-foreground shadow-lg",
                "transition-all duration-300",
              )}
            >
              {primaryCta.onClick || !primaryCta.href ? (
                primaryCta.text
              ) : (
                <a href={primaryCta.href}>{primaryCta.text}</a>
              )}
            </Button>

            {secondaryCta && (
              <Button
                asChild={!secondaryCta.onClick && !!secondaryCta.href}
                size="lg"
                variant="ghost"
                onClick={secondaryCta.onClick}
                className={cn(
                  "text-foreground/80 dark:text-foreground/70",
                  "transition-all duration-300",
                )}
              >
                {secondaryCta.onClick || !secondaryCta.href ? (
                  <>
                    {secondaryCta.icon}
                    {secondaryCta.text}
                  </>
                ) : (
                  <a href={secondaryCta.href}>
                    {secondaryCta.icon}
                    {secondaryCta.text}
                  </a>
                )}
              </Button>
            )}
          </div>

          {/* Mockup */}
          <div className="relative w-full pt-12 px-4 sm:px-6 lg:px-8 animate-appear opacity-0 [animation-delay:700ms]">
            <Mockup
              className={cn(
                "shadow-[0_0_50px_-12px_rgba(0,0,0,0.3)] dark:shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)]",
                "border-primary/10 dark:border-primary/5",
              )}
            >
              <Image
                src={mockupImage.src}
                alt={mockupImage.alt}
                width={mockupImage.width}
                height={mockupImage.height}
                className="w-full h-auto"
                priority
              />
            </Mockup>
          </div>
        </div>
      </div>

      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Glow
          variant="above"
          className="animate-appear-zoom opacity-0 [animation-delay:1000ms]"
        />
      </div>
    </section>
  )
}
