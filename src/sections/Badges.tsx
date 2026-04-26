"use client";

import { badgesData } from "../../utils/data/badges-data";
import Image from "next/image";
import { useRef, MouseEvent, useState } from "react";

const issuerColors: Record<string, string> = {
  "IBM": "border-t-[#1F70C1]",
  "AWS": "border-t-[#FF9900]",
  "Cisco": "border-t-[#1BA0D7]",
  "ServiceNow": "border-t-[#62D84E]",
  "JS Institute": "border-t-[#F7DF1E]",
};

function BadgeCard({ badge }: { badge: typeof badgesData[0] }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`border border-gray-200 dark:border-gray-700 border-t-4 ${issuerColors[badge.issuer] || "border-t-gray-400"} rounded-xl p-7 flex flex-col items-center text-center gap-4 bg-white dark:bg-stone-900 transition-transform duration-200 ease-out cursor-pointer hover:border-neon-500 hover:shadow-xl h-full w-full`}
      style={{ willChange: "transform" }}
    >
      <div className="relative w-36 h-36 shrink-0">
        <Image
          src={badge.image}
          alt={badge.name}
          fill
          className="object-contain"
          unoptimized
        />
      </div>
      <div className="flex flex-col gap-1 flex-1 w-full justify-between">
        <p className="font-semibold text-sm text-foreground leading-snug min-h-[60px]">
          {badge.name}
        </p>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-neon-500 font-medium">{badge.issuer}</p>
          <p className="text-xs text-gray-400">{badge.date}</p>
          {badge.url && (
            <a
              href={badge.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-xs border border-neon-500 text-neon-500 px-3 py-1 rounded-full hover:bg-neon-500 hover:text-white transition-all duration-300"
            >
              View Credential
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const filters = ["All", "IBM", "AWS", "Cisco", "ServiceNow", "JS Institute"];

const issuerShortNames: Record<string, string> = {
  "Amazon Web Services Training and Certification": "AWS",
};

function Badges() {
  const [activeFilter, setActiveFilter] = useState("All");

  const filteredBadges = badgesData.filter((badge) => {
    if (activeFilter === "All") return true;
    const shortName = issuerShortNames[badge.issuer] || badge.issuer;
    return shortName === activeFilter;
  });

  const placeholderCount = (4 - (filteredBadges.length % 4)) % 4;

  return (
    <section id="badges" className="section py-20">
      <h2 className="text-4xl md:text-7xl lg:text-8xl container mb-4">
        Certifications &amp; Badges
      </h2>
      <p className="container text-gray-500 text-lg mb-6">
        Continuously earning credentials to back up my work —{" "}
        <span className="font-semibold text-foreground">{badgesData.length} credentials</span> and counting.
      </p>

      {/* Filter buttons */}
      <div className="container flex flex-wrap gap-3 mb-12">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-300 ${
              activeFilter === filter
                ? "bg-neon-500 text-white border-neon-500"
                : "border-gray-300 text-gray-500 hover:border-neon-500 hover:text-neon-500"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="container grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch">
        {filteredBadges.map((badge, index) => (
          <div key={index} className="flex flex-col">
            <BadgeCard badge={badge} />
          </div>
        ))}
        {/* Placeholder cards — only show on All filter */}
        {activeFilter === "All" && Array.from({ length: placeholderCount }).map((_, i) => (
          <div
            key={`placeholder-${i}`}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-7 flex flex-col items-center justify-center text-center gap-3"
            style={{ minHeight: "320px" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-16 h-16 text-gray-300 dark:text-gray-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
            <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">More coming soon</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Always learning, always growing.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Badges;