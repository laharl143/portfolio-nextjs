import { FC } from "react";
import simon from "@/assets/images/simon-pic.jpg";
import drum from "@/assets/images/drum-kit.png";
import maze from "@/assets/images/maze-game.png";
import quote from "@/assets/images/quote-pic.png";
import movie from "@/assets/images/movie-fight.png";
import airbnb from "@/assets/images/airbnb-logo.png";
import Image from "next/image.js";

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
const projects = [
  {
    name: "Airbnb Clone (in progress)",
    tech: ["React", "TypeScript", "NextJs", "TailwindCSS"],
    image: airbnb,
    href: "https://airbnb-clone-ers-due.vercel.app/",
  },
  {
    name: "Simon game",
    tech: ["JavaScript", "HTML", "CSS"],
    image: simon,
    href: "https://laharl143.github.io/Simon-game/",
  },
  {
    name: "Drum kit",
    tech: ["JavaScript", "HTML", "CSS"],
    image: drum,
    href: "https://laharl143.github.io/Drum-kit/",
  },
  {
    name: "Maze",
    tech: ["JavaScript", "HTML", "CSS"],
    image: maze,
    href: "https://laharl143.github.io/maze-vanilla-js/",
  },
  {
    name: "Quote Generator",
    tech: ["JavaScript", "HTML", "CSS"],
    image: quote,
    href: "https://laharl143.github.io/quote-generator/",
  },
  {
    name: "Movie Fight",
    tech: ["JavaScript", "HTML", "CSS"],
    image: movie,
    href: "https://laharl143.github.io/movie-fight-vanilla-js/",
  },
];

const Projects: FC = () => {
  return (
    <section className="section" id="projects">
      <div className="container">
        <h2 className="text-4xl md:text-7xl lg:text-8xl">Projects</h2>
        <div className="mt-10 md:mt-16 lg:mt-20">
          {projects.map(({ name, image, href, tech }) => (
            <a
              href={href}
              key={name}
              className="border-t last:border-b border-stone-400 border-dotted py-6 md:py-8 lg:py-10 flex flex-col relative group/project"
            >
              {/* Background hover effect */}
              <div className="absolute bottom-0 left-0 w-full h-0 group-hover/project:h-full transition-all duration-700 bg-stone-300"></div>
              <div className="relative">
                {/* Mobile Image */}
                <div className="aspect-video md:hidden">
                  <Image
                    src={image}
                    alt={`${name} image`}
                    className="size-full object-cover"
                  />
                </div>
                <div className="mt-8 md:mt-0 flex justify-between items-center md:grid md:[grid-template-columns:1fr_300px_max-content] md:gap-8">
                  {/* Project Name */}
                  <div className="lg:group-hover/project:pl-8 transition-all duration-700">
                    <h3 className="text-2xl md:text-3xl lg:text-4xl">{name}</h3>
                    {/* Tech Stack (Hidden by default, appears on hover) */}
                    <div className="opacity-0 group-hover/project:opacity-100 transition-opacity duration-500 mt-2">
                      <p className="text-sm md:text-base lg:text-lg text-stone-600">
                        {tech.join(" • ")}
                      </p>
                    </div>
                  </div>
                  {/* Hover Image */}
                  <div className="relative">
                    <div className="absolute aspect-video w-full top-1/2-translate-y-1/2 opacity-0 scale-90 group-hover/project:opacity-100 group-hover/project:scale-100 lg:group-hover/project:scale-110 transition-all duration-500 z-10">
                      <Image
                        src={image}
                        alt={`${name} image`}
                        className="size-full object-cover"
                      />
                    </div>
                  </div>
                  {/* Arrow Animation */}
                  <div className="lg:group-hover/project:pr-8 transition-all duration-700">
                    <div className="size-6 overflow-hidden">
                      <div className="h-6 w-12 flex group-hover/project:-translate-x-1/2 transition-transform duration-500">
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
                    </div>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
