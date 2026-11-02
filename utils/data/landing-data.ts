// Landing page copy for / (spec 0016). Public content only.
export const landingData = {
  ctaLabel: "Tell me about your project",
  hero: {
    headline: "I build the connected systems small businesses run on.",
    stance: "I don't build marketing sites. I build the systems behind them.",
    credibility: "Application Developer at IBM by day, building for small businesses.",
    portraitAlt: "Erskine Duenas from behind, wearing an eat sleep code shirt",
    scrollHint: "Scroll",
  },
  services: {
    label: "What I build",
    heading: "Systems that take work off your plate",
    cards: [
      {
        title: "Your tools, talking to each other",
        body: "Orders, payments, and inventory move between your systems on their own, so nobody retypes data at the end of the day.",
      },
      {
        title: "Built around how you work",
        body: "I start from your process, not a template, and build only what saves you time.",
      },
      {
        title: "Support after launch",
        body: "I keep your systems running and growing after go live, so you are never left with software nobody looks after.",
      },
    ],
  },
  ecosystem: {
    label: "Products",
    heading: "Systems already running",
    intro: "Some of what I build is already live for small businesses. Each piece works on its own and connects to the rest.",
    linkLabel: "See every product",
  },
  closing: {
    label: "Start here",
    heading: "Tell me what's slowing your business down.",
    body: "Send a short note about your project, and I'll get back to you with next steps.",
  },
} as const;
