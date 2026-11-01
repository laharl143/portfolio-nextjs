import { ImageResponse } from "next/og";
import { personalData } from "../../utils/data/personal-data";
import { brandData } from "../../utils/data/brand-data";
import { SITE_URL } from "@/lib/site";

// Share card for the public pages (spec 0009): static at build, Hero colors, Next's bundled default font.
export const OG_SIZE = { width: 1200, height: 630 };

const ROLE_LINE = "Software Engineer · Aspiring Software Architect";
const DOMAIN = new URL(SITE_URL).host;

export function renderShareCard(headline: string): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#1c1917",
          color: "#f5f5f4",
        }}
      >
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ width: 96, height: 12, backgroundColor: "#22c55e", borderRadius: 6 }} />
          <div style={{ width: 48, height: 12, backgroundColor: "#ef4444", borderRadius: 6 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>{personalData.name}</div>
          <div style={{ fontSize: 36, marginTop: 20, color: "#d6d3d1" }}>{ROLE_LINE}</div>
          <div style={{ fontSize: 48, marginTop: 48, color: "#22c55e" }}>{headline}</div>
        </div>
        <div style={{ fontSize: 28, color: "#a8a29e" }}>{DOMAIN}</div>
      </div>
    ),
    OG_SIZE,
  );
}

// Brand card for the (brand) pages (spec 0015): the dark slate surface with one signal blue bar.
export function renderBrandCard(headline: string): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundImage: "linear-gradient(to bottom, #20272F, #0A0E13)",
          color: "#F5F7F9",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 40, fontWeight: 300, letterSpacing: 10 }}>{brandData.name.toUpperCase()}</div>
          <div style={{ width: 96, height: 8, marginTop: 20, backgroundColor: "#0096FF" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 80, fontWeight: 700, lineHeight: 1.05, color: "#FFFFFF" }}>{headline}</div>
          <div style={{ fontSize: 32, marginTop: 28, letterSpacing: 4, textTransform: "uppercase", color: "#A4A9B0" }}>
            {brandData.tagline}
          </div>
        </div>
        <div style={{ fontSize: 28, color: "#A4A9B0" }}>{DOMAIN}</div>
      </div>
    ),
    OG_SIZE,
  );
}
