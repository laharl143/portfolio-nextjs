import type { ReactNode } from "react";
import { BiLogoLinkedin } from "react-icons/bi";
import { FaFacebook } from "react-icons/fa";
import { IoLogoGithub } from "react-icons/io";
import { SiCodewars, SiMonkeytype } from "react-icons/si";
import { focusRing } from "@/lib/utils";
import { brandData } from "../../../utils/data/brand-data";

type Social = (typeof brandData.socials)[number];

const icons: Record<Social["platform"], ReactNode> = {
  linkedin: <BiLogoLinkedin size={20} aria-hidden="true" />,
  github: <IoLogoGithub size={20} aria-hidden="true" />,
  codewars: <SiCodewars size={20} aria-hidden="true" />,
  monkeytype: <SiMonkeytype size={20} aria-hidden="true" />,
  facebook: <FaFacebook size={20} aria-hidden="true" />,
};

// A round social icon link for the brand pages (spec 0017, AC-4 and AC-5). Token colors only, a 44px target.
export default function SocialIconLink({ social }: { social: Social }) {
  return (
    <a
      href={social.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${social.label} (opens in a new tab)`}
      className={`inline-flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground/60 hover:text-foreground ${focusRing}`}
    >
      {icons[social.platform]}
    </a>
  );
}
