"use client"

import { badgesData } from "../../utils/data/badges-data";
import Image from "next/image";

function Badges() {
  return (
    <section id="badges" className="section py-20">
      <h2 className="text-4xl md:text-7xl lg:text-8xl container mb-4">
        Certifications & Badges
      </h2>
      <p className="container text-gray-500 text-lg mb-12">
        Verified credentials from IBM, AWS, ServiceNow, and more.
      </p>
      <div className="container grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {badgesData.map((badge, index) => (
          <a
            key={index}
            href={badge.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="group border border-gray-200 dark:border-gray-700 rounded-xl p-7 flex flex-col items-center text-center gap-4 hover:border-neon-500 hover:shadow-md transition-all duration-300"
          >
            <div className="relative w-36 h-36">
              <Image
                src={badge.image}
                alt={badge.name}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-sm text-foreground leading-snug">
                {badge.name}
              </p>
              <p className="text-xs text-neon-500 font-medium">{badge.issuer}</p>
              <p className="text-xs text-gray-400">{badge.date}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

export default Badges;