"use client";

import { useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  content: string;
  label?: string;
  className?: string;
  variant?: "default" | "ghost" | "minimal" | "solid" | "icon";
  onCopy?: () => void;
}

export const CopyButton = ({
  content,
  label,
  className,
  variant = "default",
  onCopy,
}: CopyButtonProps) => {
  const [isChecked, setIsChecked] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const duration = 0.4;
  const pathLength = useMotionValue(0);
  const opacity = useTransform(pathLength, [0.05, 0.15], [0, 1]);

  const svgVariants = {
    hover: (isChecked: boolean) => ({
      scale: isChecked ? 1 : 1.05,
    }),
    pressed: (isChecked: boolean) => ({
      scale: isChecked ? 1 : 0.95,
    }),
    idle: {
      scale: 1,
    },
  };

  const boxVariants = {
    checked: { opacity: 0 },
    unchecked: { opacity: 1 },
  };

  const tickVariants = {
    pressed: (isChecked: boolean) => ({ pathLength: isChecked ? 0.85 : 0.05 }),
    checked: { pathLength: 1 },
    unchecked: { pathLength: 0 },
  };

  const labelVariants = {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.2, ease: "easeOut" },
    },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" } },
  };

  useEffect(() => {
    if (isChecked) {
      setShowCopied(true);
      const timer = setTimeout(() => {
        setIsChecked(false);
        setShowCopied(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isChecked]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsChecked(true);
      onCopy?.();
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const variants = {
    default:
      "relative rounded-lg border border-neutral-200/30 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all shadow-sm",
    ghost: "relative rounded-lg transition-all p-0 hover:bg-transparent",
    minimal: "relative rounded-lg transition-all hover:opacity-70",
    solid:
      "relative rounded-lg border-0 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all text-white dark:text-neutral-900 shadow-sm",
    icon: "relative h-10 w-10 rounded-lg border border-neutral-200/30 dark:border-neutral-800 p-0",
  };

  const labelColorVariants = {
    default:
      "text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-50",
    ghost: "text-neutral-500 dark:text-neutral-400 ",
    minimal: "text-neutral-600 dark:text-neutral-300",
    solid:
      "text-neutral-200 dark:text-neutral-800 group-hover:text-white dark:group-hover:text-neutral-900",
  };

  const iconColorVariants = {
    default:
      "text-neutral-400 group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-50",
    ghost: "text-neutral-400 dark:text-neutral-500",
    minimal: "text-neutral-400 dark:text-neutral-400",
    solid:
      "text-neutral-300 dark:text-neutral-700 group-hover:text-white dark:group-hover:text-neutral-900",
    icon: "text-neutral-400 group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-50",
  };

  const successColorVariants = {
    default: "text-emerald-600 dark:text-emerald-400",
    ghost: "text-emerald-500 dark:text-emerald-400",
    minimal: "text-emerald-600 dark:text-emerald-400",
    solid: "text-emerald-300 dark:text-emerald-700",
  };

  return (
    <Button
      variant={variant === "ghost" ? "ghost" : "outline"}
      className={cn(
        "flex items-center gap-2 px-4 justify-center group backdrop-blur-sm",
        variants[variant],
        variant === "icon" && "!min-w-[40px] !px-0",
        className
      )}
      onClick={handleCopy}
    >
      {variant !== "icon" && (
        <motion.div 
          layout="position"
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative h-5 gap-2 flex items-center justify-center"
        >
          <AnimatePresence mode="wait">
            {showCopied ? (
              <motion.span
                key="copied"
                variants={labelVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={cn(
                  "text-sm font-medium",
                  successColorVariants[variant]
                )}
              >
                Copied!
              </motion.span>
            ) : (
              <motion.span
                key="label"
                variants={labelVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={cn(
                  "text-sm font-medium transition-colors whitespace-nowrap",
                  labelColorVariants[variant]
                )}
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      )}
      <motion.svg
        initial="idle"
        whileHover="hover"
        whileTap="pressed"
        transition={{ duration }}
        variants={svgVariants}
        custom={isChecked}
        width="20"
        height="20"
        viewBox="0 0 25 25"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0 transition-colors focus:outline-none", iconColorVariants[variant])}
      >
        <motion.path
          d="M20.8511 9.46338H11.8511C10.7465 9.46338 9.85107 10.3588 9.85107 11.4634V20.4634C9.85107 21.5679 10.7465 22.4634 11.8511 22.4634H20.8511C21.9556 22.4634 22.8511 21.5679 22.8511 20.4634V11.4634C22.8511 10.3588 21.9556 9.46338 20.8511 9.46338Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={isChecked ? "checked" : "unchecked"}
          variants={boxVariants}
          custom={isChecked}
          transition={{ duration }}
        />
        <motion.path
          d="M5.85107 15.4634H4.85107C4.32064 15.4634 3.81193 15.2527 3.43686 14.8776C3.06179 14.5025 2.85107 13.9938 2.85107 13.4634V4.46338C2.85107 3.93295 3.06179 3.42424 3.43686 3.04917C3.81193 2.67409 4.32064 2.46338 4.85107 2.46338H13.8511C14.3815 2.46338 14.8902 2.67409 15.2653 3.04917C15.6404 3.42424 15.8511 3.93295 15.8511 4.46338V5.46338"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={isChecked ? "checked" : "unchecked"}
          variants={boxVariants}
          custom={isChecked}
          transition={{ duration }}
        />
        <motion.path
          d="M20 6L9 17L4 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={isChecked ? "checked" : "unchecked"}
          variants={tickVariants}
          style={{ pathLength, opacity }}
          custom={isChecked}
          transition={{ duration }}
        />
      </motion.svg>
    </Button>
  );
};
