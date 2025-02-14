"use client";

import { useEffect, useState } from "react";
import { FaArrowUp } from "react-icons/fa6";

const SCROLL_THRESHOLD = 50;

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > SCROLL_THRESHOLD);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const onClickBtn = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button
      className={`fixed bottom-8 right-6 z-50 flex items-center justify-center
        rounded-full bg-stone-700 text-stone-200 shadow-md
        dark:bg-stone-600 dark:text-white
        hover:bg-neon-500 hover:text-white
        dark:hover:bg-neon-500 dark:hover:text-white
        transition-all duration-300 p-4 size-12
        ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      onClick={onClickBtn}
    >
      <FaArrowUp className="size-6" />
    </button>
  );
};

export default ScrollToTop;
