"use client";

import { FC, useEffect, useRef } from "react";
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
              className="text-5xl md:text-5.5xl lg:text-6xl mt-40 md:mt-5 lg:mt-20"
              ref={scope}
            >
              I’m driven by{" "}
              <span className="font-bold text-green-500">Perseverance</span> and{" "}
              <span className="font-bold text-red-500">Curiosity</span>,
              constantly learning and adapting to solve problems and deliver
              results.
            </motion.h1>
            <div className="flex flex-col flex-wrap mt-16 md:flex-row sm:flex-row md:items-center sm:items-center items-start gap-6">
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
              />
              <SocialLinkButton
                href={personalData.github}
                icon={<IoLogoGithub />}
              />
              <SocialLinkButton
                href={personalData.codewars}
                icon={<SiCodewars />}
                size={42}
              />
              <SocialLinkButton
                href={personalData.monkeyType}
                icon={<SiMonkeytype />}
              />
              <SocialLinkButton
                href={personalData.facebook}
                icon={<FaFacebook />}
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
    </section>
  );
};

export default Hero;
