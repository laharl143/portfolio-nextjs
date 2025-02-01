"use client";

import { useInView } from "motion/react";
import { FC, useEffect, useRef } from "react";
import useTextRevealAnimation from "@/hooks/useTextRevealAnimation";

const Intro: FC = () => {
  // const [scope, animate] = useAnimate(); //old implementation of textRevealAnimation
  const sectionRef = useRef<HTMLElement>(null);
  const { scope, entranceAnimation } = useTextRevealAnimation();
  const inView = useInView(scope, {
    once: true,
  });

  useEffect(() => {
    if (inView) {
      entranceAnimation();
    }
  }, [inView, entranceAnimation]);

  // old implementation of textRevealAnimation
  // useEffect(() => {
  //   new SplitType(scope.current.querySelector("h2"), {
  //     types: "lines,words",
  //     tagName: "span",
  //   });
  // }, [scope]);

  // useEffect(() => {
  //   if (inView) {
  //     animate(
  //       scope.current.querySelectorAll(".word"),
  //       {
  //         transform: "translateY(0%)",
  //       },
  //       {
  //         duration: 0.5,
  //         delay: stagger(0.2),
  //       }
  //     );
  //   }
  // }, [inView, animate, scope]);

  return (
    <section
      className="section mt-12 md:mt-16 lg:mt-20"
      id="intro"
      ref={sectionRef}
    >
      <div className="container">
        <h2 className="text-4xl md:text-7xl lg:text-8xl lg:w-[80%]" ref={scope}>
          I am deeply passionate about continuous learning and personal growth.
        </h2>
      </div>
    </section>
  );
};

export default Intro;
