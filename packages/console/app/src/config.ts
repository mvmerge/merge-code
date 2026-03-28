/**
 * Application-wide constants and configuration
 */
export const config = {
  // Base URL
  baseUrl: "https://merge.ai",

  // GitHub
  github: {
    repoUrl: "https://github.com/anomalyco/merge",
    starsFormatted: {
      compact: "120K",
      full: "120,000",
    },
  },

  // Social links
  social: {
    twitter: "https://x.com/merge",
    discord: "https://discord.gg/merge",
  },

  // Static stats (used on landing page)
  stats: {
    contributors: "800",
    commits: "10,000",
    monthlyUsers: "5M",
  },
} as const
