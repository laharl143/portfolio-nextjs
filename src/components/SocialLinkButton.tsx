import { FC } from "react";
import { motion } from "framer-motion";
import Link from "next/link.js";
import React from "react";

interface SocialLinkButtonProps {
  href: string;
  icon: JSX.Element;
  size?: number;
  bgColor?: string;
  delay?: number;
  bgHover?: string;
  padding?: string;
}

const SocialLinkButton: FC<SocialLinkButtonProps> = ({
  href,
  icon,
  size = 48,
  bgColor = "transparent",
  delay = 3,
  bgHover = "neon-500",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: delay, ease: "easeOut" }}
      whileHover={{
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 20,
          reset: true,
        },
      }}
    >
      <Link target="_blank" href={href}>
        <div
          className={`bg-${bgColor} p-2 rounded-full hover:bg-${bgHover} hover:scale-110 transition-all duration-300 ease-in-out text-gray-800 hover:text-white cursor-pointer`}
        >
          {React.cloneElement(icon, { size: size })}
        </div>
      </Link>
    </motion.div>
  );
};

export default SocialLinkButton;
