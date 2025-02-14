"use client";

import { FC, useEffect, useRef } from "react";
import heroImage from "@/assets/images/eat-sleep-code.png";
import Image from "next/image";
import Button from "@/components/Button";
import SocialLinkButton from "@/components/SocialLinkButton";
import { motion, useScroll, useTransform } from "motion/react";
import useTextRevealAnimation from "@/hooks/useTextRevealAnimation";
import { personalData } from "../../utils/data/personal-data";
import { IoLogoGithub } from "react-icons/io";
import { BiLogoLinkedin } from "react-icons/bi";
import { FaFacebook } from "react-icons/fa";
import { SiCodewars, SiMonkeytype } from "react-icons/si";

const Hero: FC = () => {
  // const [titleScope, titleAnimate] = useAnimate(); //old implementation of useTextRevealAnimation
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
  // old implementation of useTextRevealAnimation
  // useEffect(() => {
  //   new SplitType(titleScope.current, {
  //     types: "lines,words",
  //     tagName: "span",
  //   });

  //   titleAnimate(
  //     titleScope.current.querySelectorAll(".word"),
  //     {
  //       transform: "translateY(0)",
  //     },
  //     {
  //       duration: 0.5,
  //       delay: stagger(0.2),
  //     }
  //   );
  // }, []);

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
              <span className="font-bold text-green-500">Perseverance</span>{" "}
              and <span className="font-bold text-red-500">Curiosity</span>,
              constantly learning and adapting to solve problems and deliver
              results.
            </motion.h1>
            <div className="flex flex-col flex-wrap mt-16 md:flex-row sm:flex-row md:items-center sm:items-center items-start gap-6">
              <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 3 }}
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
