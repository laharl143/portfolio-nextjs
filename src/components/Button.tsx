import { ButtonHTMLAttributes } from "react";

const Button = (
  props: {
    variant: "primary" | "secondary" | "text";
  } & ButtonHTMLAttributes<HTMLButtonElement>
) => {
  const { className, children, ...rest } = props;
  return (
    <button className={className} {...rest}>
      <span>{children}</span>
    </button>
  );
};

export default Button;
