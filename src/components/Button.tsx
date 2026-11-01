import { ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type ButtonVariant = "primary" | "secondary" | "third" | "text" | "pill" | "pill-outline";

// Shared with links that must look like a button, such as ContactLink (spec 0016).
export const buttonClassName = (variant: ButtonVariant, className?: string) =>
  twMerge(
    " h-11 px-6 rounded-xl  border border-neon-500 uppercase inline-flex items-center gap-2 transition duration-500 relative group/button",
    variant === "primary" &&
      "bg-neon-500 text-white hover:bg-transparent hover:text-black dark:text-white hover:border-neon-500",
    variant === "secondary" && "hover:bg-neon-500 hover:text-white",
    variant === "third" &&
      "hover:bg-neon-500 hover:text-white border-transparent hover:border-transparent",
    // Brand pages only (spec 0015).
    variant === "pill" &&
      "rounded-full bg-primary text-primary-foreground border-primary tracking-[0.16em] hover:bg-transparent hover:text-foreground",
    variant === "pill-outline" &&
      "rounded-full border-foreground/60 text-foreground hover:bg-foreground hover:text-background",
    variant === "text" &&
      "h-auto px-0 border-transparent after:transition-all after:duration-500 after:content-[''] after:h-px after:w-0 after:absolute after:top-full after:bg-neon-light-500 hover:after:w-full",
    className
  );

const Button = (
  props: {
    variant: ButtonVariant;
    iconAfter?: ReactNode;
    pdfUrl?: string;
  } & ButtonHTMLAttributes<HTMLButtonElement>
) => {
  const { className, children, variant, iconAfter, pdfUrl, onClick, ...rest } =
    props;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
    if (onClick) {
      onClick(event);
    }
  };
  return (
    <button
      className={buttonClassName(variant, className)}
      onClick={handleClick}
      {...rest}
    >
      <span>{children}</span>
      {iconAfter && <span>{iconAfter}</span>}
    </button>
  );
};

export default Button;
