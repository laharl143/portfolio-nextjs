import { ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const Button = (
  props: {
    variant: "primary" | "secondary" | "third" | "text";
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
      className={twMerge(
        " h-11 px-6 rounded-xl  border border-neon-500 uppercase inline-flex items-center gap-2 transition duration-500 relative group/button",
        variant === "primary" &&
          "bg-neon-500 text-white hover:bg-transparent hover:text-black dark:text-white hover:border-neon-500",
        variant === "secondary" && "hover:bg-neon-500 hover:text-white",
        variant === "third" &&
          "hover:bg-neon-500 hover:text-white border-transparent hover:border-transparent",
        variant === "text" &&
          "h-auto px-0 border-transparent after:transition-all after:duration-500 after:content-[''] after:h-px after:w-0 after:absolute after:top-full after:bg-neon-light-500 hover:after:w-full",
        className
      )}
      onClick={handleClick}
      {...rest}
    >
      <span>{children}</span>
      {iconAfter && <span>{iconAfter}</span>}
    </button>
  );
};

export default Button;
