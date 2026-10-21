import type { Metadata } from "next";
import Header from "@/sections/Header";
import Footer from "@/sections/Footer";
import ContactForm from "@/components/ContactForm";
import { getPublicIntakeConfig } from "@/inquiries/public-config";
import { openGraphBase, SITE_NAME } from "@/lib/site";
import { seo } from "../../../../utils/data/seo-data";
import { contactData } from "../../../../utils/data/contact-data";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: seo.contact.title,
  description: seo.contact.description,
  alternates: { canonical: "/contact" },
  openGraph: {
    ...openGraphBase,
    url: "/contact",
    title: `${seo.contact.title} | ${SITE_NAME}`,
    description: seo.contact.description,
  },
};
export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="container max-w-3xl pb-24 pt-36">
        <h1 className="text-4xl font-semibold md:text-6xl">
          {contactData.title}
        </h1>
        <p className="mb-10 mt-5 text-lg">{contactData.intro}</p>
        <ContactForm {...getPublicIntakeConfig()} />
        <p className="mt-10">
          Prefer email?{" "}
          <a className="underline" href={`mailto:${contactData.email}`}>
            {contactData.email}
          </a>
        </p>
      </main>
      <Footer />
    </>
  );
}
