"use client";

import { FC, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { twMerge } from "tailwind-merge";

const getYearsOfExperience = () => {
  const start = new Date("2022-10-24");
  const now = new Date();
  const diff = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(diff * 10) / 10; // e.g. 2.5, 3.1
};

const faqs = [
  {
    question: "What is your current role and experience?",
    answer:
      `I'm currently an <strong>Application Developer at IBM Philippines</strong>, with over <strong>${getYearsOfExperience()} years</strong> of professional experience building enterprise-grade systems. I was recognized as the <strong>Top Performer</strong> of my project team in December 2025 out of 25 developers. I lean back-end but am fully capable across the stack.`,
  },
  {
    question: "What professional projects have you worked on?",
    answer:
      "I've had the opportunity to work on several significant projects:<br><br>1. <strong>APS</strong>: Migration of a legacy property management system to a microservice architecture with 500+ screens and 800+ APIs, serving 1M+ users.<br><br>2. <strong>Power Trading System (Internal System)</strong>: A high-frequency electricity trading platform in Japan, focusing on efficiency, scalability, and real-time data processing.<br><br>3. <strong>NHK Broadcast Schedule Management (Internal System)</strong>: Built and maintained for Japan Broadcasting Corporation, one of Japan's largest broadcasters.<br><br>4. <strong>Vital Stats Wellness</strong>: A full-stack medical wellness platform built for a Philippine startup client.",
  },
  {
    question: "What technologies do you specialize in?",
    answer:
      "My core stack includes <strong>Java</strong>, <strong>Angular</strong>, and <strong>TypeScript</strong> on the enterprise side,sharpened through real production work at IBM. On the full-stack side, I work with <strong>React</strong>, <strong>Next.js</strong>, and <strong>JavaScript</strong>. For databases, I have experience with <strong>DB2</strong>, <strong>MySQL</strong>, and <strong>PostgreSQL</strong>. I also work with <strong>Supabase</strong>, <strong>AWS</strong>, <strong>Docker</strong>, <strong>Git</strong>, and <strong>TailwindCSS</strong>. I'm currently deepening my knowledge in <strong>system design and software architecture</strong> as I work toward becoming a Software Architect.",
  },
  {
    question: "Do you have experience working with international clients?",
    answer:
      "Yes, my primary client at IBM is <strong>NHK (Japan Broadcasting Corporation)</strong>. I communicate directly with the NHK technical team in Japanese (JLPT N4 certified, N3 level). Working across cultures has sharpened my attention to detail, documentation standards, and cross-team communication.",
  },
  {
    question: "Are you open to new opportunities?",
    answer:
      "I'm currently focused on growing within IBM. That said, I'm always open to conversations about exciting roles particularly those involving back-end engineering, system architecture, or full-stack development. Feel free to reach out via <strong>LinkedIn</strong> or <strong>email</strong>!",
  },
  {
    question: "How can I get in touch with you?",
    answer:
      "You can reach me via <strong>email at erskine.duenas@gmail.com</strong> or connect with me on <strong>LinkedIn</strong>. I'm also active on GitHub where you can check out my personal projects. Whether it's a project inquiry, collaboration, or just a chat about tech, I'd love to hear from you!",
  },
];

const FAQItem: FC<{
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}> = ({ question, answer, isOpen, onClick }) => {
  return (
    <div
      className="border-t border-stone-400 border-dotted py-6 md:py-8 lg:py-10 last:border-b relative isolate group/faq"
      onClick={onClick}
      role="button"
      aria-expanded={isOpen}
      aria-controls={`faq-answer-${question}`}
    >
      <div
        className={twMerge(
          "absolute h-0 w-full bottom-0 left-0 bg-stone-300 -z-10 group-hover/faq:h-full transition-all duration-700 dark:bg-stone-700",
          isOpen && "h-full"
        )}
      ></div>
      <div
        className={twMerge(
          "flex items-center justify-between gap-4 transition-all duration-700 group-hover/faq:lg:px-8",
          isOpen && "lg:px-8"
        )}
      >
        <div className="text-2xl md:text-3xl lg:text-4xl">{question}</div>
        <div
          className={twMerge(
            "inline-flex items-center justify-center size-11 border border-stone-400 dark:bg-stone-900 rounded-full shrink-0 transition duration-300 bg-stone-200",
            isOpen && "rotate-45"
          )}
        >
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
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={`faq-answer-${question}`}
            className="overflow-hidden lg:px-8"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <p
              className="text-xl mt-4"
              dangerouslySetInnerHTML={{ __html: answer }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQs: FC = () => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <section className="section" id="faqs">
      <div className="container">
        <h2 className="text-4xl md:text-7xl lg:text-8xl">FAQs</h2>
        <div className="mt-10 md:mt-16 lg:mt-20">
          {faqs.map(({ question, answer }, faqIndex) => (
            <FAQItem
              key={question}
              question={question}
              answer={answer}
              isOpen={faqIndex === selectedIndex}
              onClick={() => {
                if (faqIndex === selectedIndex) {
                  setSelectedIndex(null);
                } else {
                  setSelectedIndex(faqIndex);
                }
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQs;
