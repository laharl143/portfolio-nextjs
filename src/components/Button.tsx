import { ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

const Button = (
  props: {
    variant: "primary" | "secondary" | "text";
  } & ButtonHTMLAttributes<HTMLButtonElement>
) => {
  const { className, children, variant, ...rest } = props;
  return (
    <button
      className={twMerge(
        "",
        variant === "primary" && "",
        variant === "secondary" && "",
        variant === "text" && "",
        className
      )}
      {...rest}
    >
      <span>{children}</span>
    </button>
  );
};

export default Button;
