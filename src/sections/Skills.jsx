import { skillsData } from "../../utils/data/skills";

import { skillsImage } from "../../utils/skill-image";
import Image from "next/image";

// One card per skill. The visible name is the accessible label, so the icon is decorative (alt="").
function SkillCard({ skill }) {
  return (
    <li className="w-36 min-w-fit h-fit flex flex-col items-center justify-center transition-all duration-500 m-3 sm:m-5 rounded-lg group/card relative hover:scale-[1.15]">
      <div className="h-full w-full rounded-lg border border-gray-400 bg-transparent shadow-none shadow-gray-50 group-hover/card:border-neon-500 transition-all duration-500">
        <div className="flex -translate-y-[1px] justify-center">
          <div className="w-3/4">
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent border-neon-500 to-transparent" />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 p-6">
          <div className="h-8 sm:h-10">
            <Image
              src={skillsImage(skill)?.src}
              alt=""
              width={40}
              height={40}
              className="h-full w-auto rounded-lg"
            />
          </div>
          <p className="text-black dark:text-white text-sm sm:text-lg">{skill}</p>
        </div>
      </div>
    </li>
  );
}

// The marquee loops with CSS: the real list plus one aria-hidden copy, each sliding left by its own
// width, so the seam is invisible. Screen readers get the list once; reduced motion shows it static.
const listClass =
  "flex shrink-0 animate-marquee group-hover/marquee:[animation-play-state:paused] motion-reduce:animate-none";

function Skills() {
  return (
    <section
      id="skills"
      className="section"
    >
        <h2 className="text-4xl md:text-7xl lg:text-8xl container">Skills</h2>
      <div className="flex justify-center -translate-y-[1px]">
        <div className="w-3/4">
          <div className="h-[1px] bg-gradient-to-r from-transparent to-transparent w-full" />
        </div>
      </div>
      <div className="w-full my-12 flex overflow-hidden group/marquee">
        <ul
          role="list"
          className={`${listClass} motion-reduce:w-full motion-reduce:shrink motion-reduce:flex-wrap motion-reduce:justify-center`}
        >
          {skillsData.map((skill) => (
            <SkillCard key={skill} skill={skill} />
          ))}
        </ul>
        <ul aria-hidden="true" className={`${listClass} motion-reduce:hidden`}>
          {skillsData.map((skill) => (
            <SkillCard key={skill} skill={skill} />
          ))}
        </ul>
      </div>
    </section>
  );
}

export default Skills;
