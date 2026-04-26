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
  padding?: string;
  platform?: "linkedin" | "github" | "codewars" | "monkeytype" | "facebook";
}

const platformLabels = {
  linkedin: "LinkedIn",
  github: "GitHub",
  codewars: "Codewars",
  monkeytype: "MonkeyType",
  facebook: "Facebook",
};

const platformTooltipColors = {
  linkedin: "bg-[#0A66C2]",
  github: "bg-[#181717]",
  codewars: "bg-[#B1361E]",
  monkeytype: "bg-[#FFD700] !text-stone-800",
  facebook: "bg-[#1877F2]",
};

const SocialLinkButton: FC<SocialLinkButtonProps> = ({
  href,
  icon,
  size = 48,
  bgColor = "transparent",
  delay = 3,
  platform,
}) => {
  const brandColors = {
    linkedin: "hover:bg-[#0A66C2]",
    github: "hover:bg-[#181717]",
    codewars: "hover:bg-[#B1361E]",
    monkeytype: "hover:bg-[#FFD700]",
    facebook: "hover:bg-[#1877F2]",
  };

  const hoverColor = platform ? brandColors[platform] : "hover:bg-neon-500";
  const label = platform ? platformLabels[platform] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: delay, ease: "easeOut" }}
      className="relative group/social"
    >
      <Link target="_blank" href={href}>
        <div
          className={`bg-${bgColor} p-2 rounded-full ${hoverColor} hover:scale-110 transition-all duration-300 ease-in-out text-gray-800 hover:text-white cursor-pointer dark:text-gray-200`}
        >
          {React.cloneElement(icon, { size: size })}
        </div>
      </Link>
      {label && platform && (
        <div className={`absolute -top-8 left-1/2 -translate-x-1/2 ${platformTooltipColors[platform]} text-white text-xs font-medium px-2 py-1 rounded opacity-0 group-hover/social:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none`}>
          {label}
          <div className={`absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent ${
            platform === "linkedin" ? "border-t-[#0A66C2]" :
            platform === "github" ? "border-t-[#181717]" :
            platform === "codewars" ? "border-t-[#B1361E]" :
            platform === "monkeytype" ? "border-t-[#FFD700]" :
            "border-t-[#1877F2]"
          }`} />
        </div>
      )}
    </motion.div>
  );
};

export default SocialLinkButton;