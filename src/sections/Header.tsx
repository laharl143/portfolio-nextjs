"use client";

import { FC, useState, useEffect, MouseEvent } from "react";
import Button from "@/components/Button";
import { motion, useAnimate } from "motion/react";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { scrollToSectionIfSamePage } from "@/lib/section-nav";
import { trackContactClick } from "@/lib/analytics";
import Link from "next/link";
import Wordmark from "@/components/brand/Wordmark";
import { useRouter } from "next/navigation";
import { focusRing } from "@/lib/utils";
import { brandData } from "../../utils/data/brand-data";

const navItems = [
  {
    label: "About me",
    href: "/personal#hero",
  },
  {
    label: "Certifications",
    href: "/personal#badges",
  },
  {
    label: "Skills",
    href: "/personal#skills",
  },
  {
    label: "Projects",
    href: "/personal#projects",
  },
  {
    label: "Products",
    href: "/products",
  },
  {
    label: "FAQs",
    href: "/personal#faqs",
  },
  {
    label: "Contact",
    href: "/personal#contact",
  },
];

const TitleToggle: FC = () => {
  const [showAlt, setShowAlt] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowAlt((prev) => !prev);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-xs md:text-sm flex justify-center items-center overflow-hidden h-5 relative w-full">
      <motion.span
        key={showAlt ? "alt" : "default"}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="absolute"
      >
        {showAlt ? (
          <span className="italic">[Aspiring Software Architect]</span>
        ) : (
          "[Application Developer]"
        )}
      </motion.span>
    </span>
  );
};

// "brand" is for the (brand) pages only (spec 0015); the default keeps /personal exactly as it was.
const Header: FC<{ variant?: "personal" | "brand" }> = ({ variant = "personal" }) => {
  const brand = variant === "brand";
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [topLineScope, topLineAnimate] = useAnimate();
  const [bottomLineScope, bottomLineAnimate] = useAnimate();
  const [navScope, navAnimate] = useAnimate();

  useEffect(() => {
    if (isOpen) {
      topLineAnimate([
        [
          topLineScope.current,
          {
            translateY: 4,
          },
        ],
        [
          topLineScope.current,
          {
            rotate: 45,
          },
        ],
      ]);

      bottomLineAnimate([
        [
          bottomLineScope.current,
          {
            translateY: -4,
          },
        ],
        [
          bottomLineScope.current,
          {
            rotate: -45,
          },
        ],
      ]);

      navAnimate(navScope.current, { height: "100%" }, { duration: 0.7 });
    } else {
      topLineAnimate([
        [
          topLineScope.current,
          {
            rotate: 0,
          },
        ],
        [
          topLineScope.current,
          {
            translateY: 0,
          },
        ],
      ]);

      bottomLineAnimate([
        [
          bottomLineScope.current,
          {
            rotate: 0,
          },
        ],
        [
          bottomLineScope.current,
          {
            translateY: 0,
          },
        ],
      ]);

      navAnimate(navScope.current, { height: 0 });
    }
  }, [
    isOpen,
    topLineAnimate,
    topLineScope,
    bottomLineAnimate,
    bottomLineScope,
    navAnimate,
    navScope,
  ]);

  const handleClickMobileNavItem = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.currentTarget.pathname === "/contact" || e.currentTarget.hash === "#contact")
      trackContactClick("mobile_nav", { navigates: e.currentTarget.pathname === "/contact" });
    setIsOpen(false);
    scrollToSectionIfSamePage(e);
  };

  return (
    <header className="">
      <div
        className={`fixed top-0 left-0 w-full h-0 overflow-hidden z-10 ${brand ? "bg-card" : "bg-stone-900"}`}
        ref={navScope}
        // Closed, the menu is zero height but its links would still take Tab stops, unseen (spec 0016 AC-14).
        inert={!isOpen}
      >
        <nav className="mt-20 flex flex-col">
          {(brand ? brandData.nav : navItems).map(({ label, href }) => (
            <a
              href={href}
              key={label}
              className={`border-t  last:border-b py-8 group/nav-item relative isolate ${brand ? `text-muted-foreground border-border ${focusRing}` : "text-stone-200 border-stone-800"}`}
              onClick={handleClickMobileNavItem}
            >
              <div className="container !max-w-full flex items-center justify-between">
                <span className="text-3xl group-hover/nav-item:pl-4 transition-all duration-500">
                  {label}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25"
                  />
                </svg>
              </div>
              <div className={`absolute w-full h-0 group-hover/nav-item:h-full transition-all duration-500 bottom-0 -z-10 ${brand ? "bg-muted" : "bg-stone-800"}`}></div>
            </a>
          ))}
        </nav>
      </div>
      <div className="fixed top-0 left-0 w-full mix-blend-difference backdrop-blur-md z-10">
        <div className="container !max-w-full">
          <div className="flex justify-between h-20 items-center">
            <div>
              {brand ? (
                <Link href="/" className={`text-white ${focusRing}`}>
                  <Wordmark />
                </Link>
              ) : (
              <Link href="/">
                <span className="text-xl font-bold uppercase text-white md:text-3xl lg:text-4xl">
                  Erskine Duenas
                  <span className="inline-flex items-center ml-2 text-sm font-bold px-2.5 py-0.5 rounded border border-white text-white normal-case tracking-widest align-middle">
                    ED
                  </span>
                  <TitleToggle />
                </span>
              </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* On brand pages this full width bar lets clicks through to the wordmark under it; only its controls take them. */}
      <div className={`fixed top-0 left-0 w-full z-10 ${brand ? "pointer-events-none" : ""}`}>
        <div className="container !max-w-full">
          <div className="flex justify-end h-20 items-center">
            <div className={`flex items-center gap-4 ${brand ? "pointer-events-auto" : ""}`}>
              <div
                className={
                  brand
                    ? "size-11 border border-border rounded-full inline-flex items-center justify-center bg-card text-foreground transition duration-500 hover:bg-signal hover:text-primary-foreground hover:border-transparent cursor-pointer"
                    : "size-11 border border-stone-400 rounded-full inline-flex items-center justify-center bg-stone-200 dark:bg-stone-900 transition duration-500 hover:bg-neon-500 hover:text-white hover:border-transparent dark:hover:bg-primary/10 cursor-pointer"
                }
                onClick={() => setIsOpen(!isOpen)}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <motion.rect
                    x="3"
                    y="7"
                    width="18"
                    height="2"
                    fill="currentColor"
                    ref={topLineScope}
                    style={{
                      transformOrigin: "12px 8px",
                    }}
                  />
                  <motion.rect
                    x="3"
                    y="15"
                    width="18"
                    height="2"
                    fill="currentColor"
                    ref={bottomLineScope}
                    style={{
                      transformOrigin: "12px 16px",
                    }}
                  />
                </svg>
              </div>
              <Button
                variant={brand ? "pill" : "primary"}
                className={brand ? "hidden md:inline-flex items-center" : "hidden md:inline-flex items-center dark:hover:text-primary/90"}
                onClick={() => {
                  trackContactClick("header");
                  router.push("/contact");
                }}
              >
                Contact Me
              </Button>
              <ThemeToggleButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
