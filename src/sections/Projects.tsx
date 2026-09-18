"use client";

import { FC, useState } from "react";
import simon from "@/assets/images/simon-pic.jpg";
import vitalstats from "@/assets/images/vitalstats.png";
import drum from "@/assets/images/drum-kit.png";
import maze from "@/assets/images/maze-game.png";
import quote from "@/assets/images/quote-pic.png";
import movie from "@/assets/images/movie-fight.png";
import airbnb from "@/assets/images/airbnb-logo.png";
import pos from "@/assets/images/pos-system-image.png";
import food from "@/assets/images/food-order-img.jpg";
import Image, { StaticImageData } from "next/image.js";
import {
  FaReact,
  FaJs,
  FaHtml5,
  FaCss3,
  FaNodeJs,
  FaAws,
} from "react-icons/fa";
import {
  SiNextdotjs,
  SiTailwindcss,
  SiTypescript,
  SiBulma,
  SiMongodb,
  SiRedux,
  SiMatterdotjs,
  SiSupabase,
} from "react-icons/si";

type ProjectTier = "flagship" | "in-progress" | "foundations";

interface ProjectItem {
  name: string;
  tier: ProjectTier;
  tech?: string[];
  image?: StaticImageData;
  href: string | null;
  comingSoon?: boolean;
  inProgress?: boolean;
}

const projects: ProjectItem[] = [
  {
    name: "Vital Stats",
    tier: "flagship",
    tech: ["NextJs", "TypeScript", "TailwindCSS", "Supabase"],
    image: vitalstats,
    href: "https://www.vitalstatwellness.online/",
  },
  {
    name: "Airbnb Clone",
    tier: "in-progress",
    tech: ["React", "TypeScript", "NextJs", "TailwindCSS", "MongoDBAtlas"],
    image: airbnb,
    href: "https://airbnb-clone-ers-due.vercel.app/",
    inProgress: true,
  },
  {
    name: "Integrated Restaurant POS Platform",
    tier: "in-progress",
    tech: ["React", "NodeJs", "MongoDB", "Redux", "TailwindCSS"],
    image: pos,
    href: "",
    comingSoon: true,
  },
  {
    name: "Cloud-Based Food Delivery System",
    tier: "in-progress",
    tech: ["React", "JavaScript", "NextJs", "TailwindCSS", "AWS"],
    image: food,
    href: "",
    comingSoon: true,
  },
  {
    name: "Simon game",
    tier: "foundations",
    tech: ["JavaScript", "HTML", "CSS"],
    image: simon,
    href: "https://laharl143.github.io/Simon-game/",
  },
  {
    name: "Drum kit",
    tier: "foundations",
    tech: ["JavaScript", "HTML", "CSS"],
    image: drum,
    href: "https://laharl143.github.io/Drum-kit/",
  },
  {
    name: "Maze",
    tier: "foundations",
    tech: ["JavaScript", "MatterJs", "HTML", "CSS"],
    image: maze,
    href: "https://laharl143.github.io/maze-vanilla-js/",
  },
  {
    name: "Quote Generator",
    tier: "foundations",
    tech: ["JavaScript", "HTML", "CSS"],
    image: quote,
    href: "https://laharl143.github.io/quote-generator/",
  },
  {
    name: "Movie Fight",
    tier: "foundations",
    tech: ["JavaScript", "Bulma", "HTML", "CSS"],
    image: movie,
    href: "https://laharl143.github.io/movie-fight-vanilla-js/",
  },
];

const techIcons: Record<string, JSX.Element> = {
  React: <FaReact className="text-blue-500 size-7" />,
  TypeScript: <SiTypescript className="text-blue-700 size-7" />,
  NextJs: <SiNextdotjs className="text-black size-7" />,
  TailwindCSS: <SiTailwindcss className="text-teal-500 size-7" />,
  JavaScript: <FaJs className="text-yellow-500 size-7" />,
  HTML: <FaHtml5 className="text-orange-500 size-7" />,
  CSS: <FaCss3 className="text-blue-600 size-7" />,
  Bulma: <SiBulma className="text-green-500 size-7" />,
  MatterJs: <SiMatterdotjs className="text-indigo-500 size-7" />,
  NodeJs: <FaNodeJs className="text-green-600 size-7" />,
  MongoDB: <SiMongodb className="text-green-700 size-7" />,
  MongoDBAtlas: <SiMongodb className="text-blue-600 size-7" />,
  Redux: <SiRedux className="text purple-600 size-7" />,
  AWS: <FaAws className="text-[#FF9900] size-7" />,
  Supabase: <SiSupabase className="text-[#3ECF8E] size-7" />,
};

const techColors: Record<string, string> = {
  React: "bg-blue-500",
  TypeScript: "bg-blue-700",
  NextJs: "bg-gray-900",
  TailwindCSS: "bg-teal-500",
  JavaScript: "bg-yellow-500",
  HTML: "bg-orange-500",
  CSS: "bg-blue-600",
  Bulma: "bg-green-500",
  MatterJs: "bg-indigo-500",
  NodeJs: "bg-green-600",
  MongoDB: "bg-green-700",
  MongoDBAtlas: "bg-blue-600",
  Redux: "bg-purple-600",
  AWS: "bg-[#FF9900]",
  Supabase: "bg-[#3ECF8E]",
};

/** On brand placeholder shown when a project has no image, or its image fails to load (AC-6). */
function ProjectImagePlaceholder({ name }: { name: string }) {
  return (
    <div
      role="img"
      aria-label={`${name} preview not available`}
      className="size-full flex flex-col items-center justify-center gap-2 bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-500"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1"
        stroke="currentColor"
        aria-hidden="true"
        className="size-10"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M18 6h.75a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25H5.25a2.25 2.25 0 0 1-2.25-2.25V8.25A2.25 2.25 0 0 1 5.25 6H6m12 0V4.5a2.25 2.25 0 0 0-2.25-2.25h-7.5A2.25 2.25 0 0 0 6 4.5V6m12 0H6"
        />
      </svg>
      <span className="text-xs font-medium px-2 text-center">{name}</span>
    </div>
  );
}

/** Project image with a fallback to the on brand placeholder if it fails to load (AC-6). */
function ProjectImage({
  image,
  name,
}: {
  image?: StaticImageData;
  name: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!image || failed) {
    return <ProjectImagePlaceholder name={name} />;
  }

  return (
    <Image
      src={image}
      alt={`${name} image`}
      className="size-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function ProjectRow({
  project,
  flagship = false,
}: {
  project: ProjectItem;
  flagship?: boolean;
}) {
  const { name, image, href, tech = [], comingSoon, inProgress } = project;

  return (
    <a
      href={href || undefined}
      target={href ? "_blank" : undefined}
      rel={href ? "noopener noreferrer" : undefined}
      aria-disabled={!href}
      className={`border-t last:border-b border-stone-400 border-dotted flex flex-col relative group/project ${
        flagship
          ? "py-10 md:py-14 lg:py-16"
          : "py-6 md:py-8 lg:py-10"
      } ${!href ? "cursor-default" : ""}`}
    >
      {/* Background hover effect */}
      <div className="absolute bottom-0 left-0 w-full h-0 group-hover/project:h-full transition-all duration-700 bg-stone-300 dark:bg-stone-700"></div>
      <div className="relative">
        {/* Mobile Image */}
        <div className="aspect-video md:hidden">
          <ProjectImage image={image} name={name} />
        </div>
        <div className="mt-8 md:mt-0 flex justify-between items-center md:grid md:[grid-template-columns:1fr_300px_max-content] md:gap-8">
          {/* Project Name */}
          <div className="lg:group-hover/project:pl-8 transition-all duration-700">
            {flagship && (
              <span className="inline-block text-xs font-semibold tracking-wide uppercase text-neon-500 mb-1">
                Flagship
              </span>
            )}
            <h3
              className={
                flagship
                  ? "text-3xl md:text-5xl lg:text-6xl text-gray-900 dark:text-white"
                  : "text-2xl md:text-3xl lg:text-4xl text-gray-900 dark:text-white"
              }
            >
              {name}
            </h3>
            {/* Tech Stack (Hidden by default, appears on hover) */}
            <div className="opacity-0 group-hover/project:opacity-100 transition-opacity duration-500 mt-2">
              <div className="flex gap-3 opacity-0 group-hover/project:opacity-100 transition-opacity duration-500 mt-2">
                {tech.map((t) => (
                  <div key={t} className="group relative z-30">
                    {techIcons[t] || t}
                    {/* Tech Stack text with dynamic background color */}
                    <div
                      className={`absolute opacity-0 group-hover:opacity-100 left-1/2 -translate-x-1/2 top-8 text-white text-xs p-2 rounded-lg transition-opacity duration-300 ${techColors[t]}`}
                    >
                      {t}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Coming Soon Banner */}
          {comingSoon && (
            <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center bg-gray-800 bg-opacity-50 text-white text-lg font-semibold rounded-md z-20 opacity-0 group-hover/project:opacity-100 transition-opacity duration-300">
              <span className="animate-pulse">Coming Soon!</span>
            </div>
          )}
          {/* In Progress Banner */}
          {inProgress && (
            <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center bg-yellow-600 bg-opacity-50 text-white text-lg font-semibold rounded-md z-20 opacity-0 group-hover/project:opacity-100 transition-opacity duration-300">
              <span className="animate-pulse">In Progress!</span>
            </div>
          )}
          {/* Hover Image */}
          <div className="relative">
            <div className="absolute aspect-video w-full top-1/2-translate-y-1/2 opacity-0 scale-90 group-hover/project:opacity-100 group-hover/project:scale-100 lg:group-hover/project:scale-110 transition-all duration-500 z-10">
              <ProjectImage image={image} name={name} />
            </div>
          </div>
          {/* Arrow Animation */}
          {href && (
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
          )}
        </div>
      </div>
    </a>
  );
}

const Projects: FC = () => {
  const [showFoundations, setShowFoundations] = useState(false);

  const flagship = projects.filter((p) => p.tier === "flagship");
  const inProgress = projects.filter((p) => p.tier === "in-progress");
  const foundations = projects.filter((p) => p.tier === "foundations");

  return (
    <section className="section" id="projects">
      <div className="container">
        <h2 className="text-4xl md:text-7xl lg:text-8xl">Projects</h2>

        {/* Flagship tier */}
        <div className="mt-10 md:mt-16 lg:mt-20">
          {flagship.map((project) => (
            <ProjectRow key={project.name} project={project} flagship />
          ))}
        </div>

        {/* In Progress tier */}
        {inProgress.length > 0 && (
          <div className="mt-16 md:mt-20">
            <h3 className="text-xs font-semibold tracking-wide uppercase text-stone-500 dark:text-stone-400 mb-2">
              In Progress
            </h3>
            {inProgress.map((project) => (
              <ProjectRow key={project.name} project={project} />
            ))}
          </div>
        )}

        {/* Foundations tier, collapsed by default */}
        {foundations.length > 0 && (
          <div className="mt-16 md:mt-20">
            <h3 className="text-xs font-semibold tracking-wide uppercase text-stone-500 dark:text-stone-400 mb-2">
              Foundations
            </h3>
            {showFoundations &&
              foundations.map((project) => (
                <ProjectRow key={project.name} project={project} />
              ))}
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowFoundations((prev) => !prev)}
                aria-expanded={showFoundations}
                className="px-6 py-2.5 rounded-full text-sm font-medium border border-gray-300 text-gray-600 dark:text-gray-300 hover:border-neon-500 hover:text-neon-500 transition-all duration-300 inline-flex items-center gap-2"
              >
                {showFoundations
                  ? "Show featured only"
                  : `Show all ${foundations.length} learning projects`}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                  className={`size-4 transition-transform duration-300 ${
                    showFoundations ? "rotate-180" : ""
                  }`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Projects;
