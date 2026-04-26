"use client";

import { FC, useEffect, useRef, useState } from "react";
import heroImage from "@/assets/images/eat-sleep-code.png";
import Image from "next/image";
import Button from "@/components/Button";
import SocialLinkButton from "@/components/SocialLinkButton";
import { motion, useScroll, useTransform } from "framer-motion";
import useTextRevealAnimation from "@/hooks/useTextRevealAnimation";
import { personalData } from "../../utils/data/personal-data";
import { IoLogoGithub } from "react-icons/io";
import { BiLogoLinkedin } from "react-icons/bi";
import { FaFacebook } from "react-icons/fa";
import { SiCodewars, SiMonkeytype } from "react-icons/si";

const ScrollIndicator: FC = () => {
  const [visible, setVisible] = useState(true);
  const [idle, setIdle] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const checkPastHero = () => {
      const badges = document.querySelector("#badges");
      if (!badges) return;
      const badgesTop = badges.getBoundingClientRect().top;
      setPastHero(badgesTop <= window.innerHeight);
    };

    window.addEventListener("scroll", checkPastHero);
    return () => window.removeEventListener("scroll", checkPastHero);
  }, []);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const resetTimer = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY === lastScrollY) return;
      lastScrollY = currentScrollY;

      setIdle(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        setIdle(true);
      }, 5000);
    };

    // Start timer on mount
    idleTimer.current = setTimeout(() => {
      setIdle(true);
    }, 5000);

    window.addEventListener("scroll", resetTimer);

    return () => {
      window.removeEventListener("scroll", resetTimer);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: visible ? 1 : 0,
        scale: idle && !pastHero ? 4 : 1,
        y: idle && !pastHero ? -60 : 0,
      }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none"
    >
      <span className="text-xs text-gray-400 uppercase tracking-widest">Scroll</span>
      <div className="flex flex-col items-center">
        {[0, 1, 2].map((i) => (
          <motion.svg
            key={i}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-4 h-4 -mt-1"
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              delay: i * 0.3,
              ease: "easeInOut",
            }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
            />
          </motion.svg>
        ))}
      </div>
    </motion.div>
  );
};

const Hero: FC = () => {
  const scrollingDiv = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: scrollingDiv,
    offset: ["start end", "end end"],
  });

  const portraitWidth = useTransform(scrollYProgress, [0, 1], ["100%", "240%"]);

  const { scope, entranceAnimation } = useTextRevealAnimation();

  useEffect(() => {
    entranceAnimation();
  }, [entranceAnimation]);

  return (
    <section id="hero">
      <div className="grid md:grid-cols-12 md:h-screen items-stretch sticky top-0 ">
        <div className="md:col-span-7 flex flex-col justify-center">
          <div className="container !max-w-full">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-5xl md:text-5.5xl lg:text-6xl mt-24 md:-mt-32 lg:-mt-40"
              ref={scope}
            >
              I’m driven by{" "}
              <span className="font-bold text-green-500">Perseverance</span> and{" "}
              <span className="font-bold text-red-500">Curiosity</span>,
              constantly learning and adapting to solve problems and deliver
              results.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 3 }}
              className="text-2xl md:text-3xl mt-6 text-gray-500 font-normal"
            >
              I&apos;m an{" "}
              <span className="font-semibold text-foreground">
                Application Developer
              </span>{" "}
              who leans back-end, sharpened by real enterprise work at{" "}
              <span className="inline-flex items-center gap-0">
                <Image
                  src="https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg"
                  alt="IBM"
                  width={50}
                  height={24}
                  className="h-6 md:h-7 w-auto inline-block align-baseline ml-1"
                  style={{ transform: 'translateY(3px)' }}
                  unoptimized
                />
              </span>
              . I build things that actually run in production.
            </motion.p>
            <div className="flex flex-col flex-wrap mt-10 md:flex-row sm:flex-row md:items-center sm:items-center items-start gap-6">
              <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 3 }}
              >
                <motion.div className="relative inline-block">
                  {/* Improved Comic-Style Ribbon */}
                  <motion.div
                    className="absolute -top-8 -left-6 bg-neon-500 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-md
               before:absolute before:content-[''] before:w-0 before:h-0
               before:border-l-[8px] before:border-l-transparent
               before:border-r-[8px] before:border-r-transparent
               before:border-t-[10px] before:border-neon-500
               before:bottom-[-8px] before:right-1"
                    style={{ opacity: 0.5 }} // Reduced opacity to 50%
                    animate={{
                      y: [0, -5, 0], // Bouncing effect
                      rotate: [0, -5, 5, 0], // Slight rotation for a playful effect
                    }}
                    transition={{
                      repeat: Infinity,
                      repeatDelay: 1.5,
                      duration: 1.2,
                      ease: "easeInOut",
                    }}
                  >
                    Click Me!
                  </motion.div>

                  {/* Download CV Button */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      pdfUrl="/erskine_duenas_cv.pdf"
                      variant="secondary"
                      iconAfter={
                        <div className="overflow-hidden size-5">
                          <div className="h-5 w-10 flex group-hover/button:-translate-x-1/2 transition-transform duration-500">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="size-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m4.5 5.25 7.5 7.5 7.5-7.5m-15 6 7.5 7.5 7.5-7.5"
                              />
                            </svg>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="size-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m4.5 5.25 7.5 7.5 7.5-7.5m-15 6 7.5 7.5 7.5-7.5"
                              />
                            </svg>
                          </div>
                        </div>
                      }
                    >
                      <span>Download CV</span>
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
              <SocialLinkButton
                href={personalData.linkedIn}
                icon={<BiLogoLinkedin />}
                size={46}
                platform="linkedin"
              />
              <SocialLinkButton
                href={personalData.github}
                icon={<IoLogoGithub />}
                platform="github"
              />
              <SocialLinkButton
                href={personalData.codewars}
                icon={<SiCodewars />}
                size={42}
                platform="codewars"
              />
              <SocialLinkButton
                href={personalData.monkeyType}
                icon={<SiMonkeytype />}
                platform="monkeytype"
              />
              <SocialLinkButton
                href={personalData.facebook}
                icon={<FaFacebook />}
                platform="facebook"
              />
            </div>
          </div>
        </div>
        <div className="md:col-span-5 relative">
          {" "}
          <motion.div
            className="mt-20 md:mt-0 md:size-full md:absolute md:right-0 max-md:!w-full"
            style={{ width: portraitWidth }}
          >
            <Image
              src={heroImage}
              alt="My portrait"
              className="size-full object-cover"
            />
          </motion.div>
        </div>
      </div>
      <div className="md:h-[200vh]" ref={scrollingDiv}></div>

      <ScrollIndicator />
    </section>
  );
};

export default Hero;
