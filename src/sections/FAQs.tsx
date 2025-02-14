"use client";

import { FC, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { twMerge } from "tailwind-merge";

const faqs = [
  {
    question: "What is your experience as a software developer?",
    answer:
      "I bring 2.5 years of professional experience as a Full Stack Developer, specializing in building robust, scalable, and user-friendly web applications. My expertise spans both frontend and backend development, ensuring end-to-end solutions for diverse projects.",
  },
  {
    question: "What professional projects have you worked on?",
    answer:
      "I've had the opportunity to work on two significant projects with Japanese clients:<br><br>1. <strong>APS</strong>: Migration of a legacy property management system to a microservice architecture with 500+ screens and 800+ APIs, serving 1M+ users.<br>2. <strong>Power Trading System (Confidential)</strong>: A high-frequency electricity trading platform in Japan, focusing on efficiency, scalability, and real-time data processing.<br><br>These projects have honed my skills in delivering high-quality solutions for complex, real-world problems while adhering to strict performance and reliability standards.",
  },
  {
    question: "What technologies do you specialize in?",
    answer:
      "I specialize in a modern tech stack that includes <strong>JavaScript</strong>, <strong>Node.js</strong>, <strong>React</strong>, and <strong>Java</strong>. These technologies enable me to build scalable, efficient, and maintainable web applications. I also have experience with tools like TailwindCSS, MongoDB, and AWS for seamless development and deployment.",
  },
  {
    question: "Do you have experience working with international clients?",
    answer:
      "Absolutely! I have collaborated with Japanese clients, delivering projects that meet global standards. Working in an international environment has taught me the importance of clear communication, clean code, and scalable solutions to cater to diverse user needs.",
  },
  {
    question: "How can I get in touch with you?",
    answer:
      "I’d love to hear from you! You can reach out to me via <strong>email</strong> or connect with me on <strong>LinkedIn</strong>. Whether you have a project inquiry, a collaboration opportunity, or just want to chat about tech, feel free to get in touch!",
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
