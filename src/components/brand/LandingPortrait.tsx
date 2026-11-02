"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import portrait from "@/assets/images/eat-sleep-code.png";
import { landingData } from "../../../utils/data/landing-data";

// The landing hero portrait (spec 0017, AC-3 and AC-8). Page scroll 0 to 1000px zooms the image 1 to 1.2
// inside a fixed frame, so layout never moves. Scroll 0 means scale 1, so hydration does not jump.
export default function LandingPortrait() {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, [0, 1000], [1, 1.2]);

  return (
    <div className="brand-rise relative aspect-[4/5] overflow-hidden rounded-lg border border-border md:aspect-auto md:h-[min(70svh,640px)]">
      <motion.div className="absolute inset-0" style={{ scale: reduceMotion ? 1 : scale }} data-testid="landing-portrait-zoom">
        <Image
          src={portrait}
          alt={landingData.hero.portraitAlt}
          fill
          placeholder="blur"
          loading="eager"
          sizes="(min-width: 768px) 42vw, 100vw"
          className="object-cover object-[50%_35%]"
        />
      </motion.div>
    </div>
  );
}
