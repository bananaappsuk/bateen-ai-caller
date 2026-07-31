// Central catalogue of Academy training videos. Add a new lesson here and it
// automatically appears on the Academy page, in its category tab, and in the
// Previous/Next lesson sequence — no other file needs to change.
//
// `videoSrc` / `thumbnail` are paths served from /public, pointing at the
// production-edited copies in public/academy/videos and
// public/academy/thumbnails (browser chrome cropped out, branded thumbnail
// generated — see scripts run for that pass). The original raw screen
// recordings are preserved untouched in public/acadamey/.
//
// Leave videoSrc undefined (or point at a file that doesn't exist yet) and the
// player falls back to a "video coming soon" placeholder instead of crashing —
// see AcademyVideoPlayer.tsx. Same for thumbnail: the Academy page falls back
// to a plain icon tile when it's missing.

export const academyCategories = [
  "Getting Started",
  "AI Agents",
  "Campaigns",
  "Adding Credits",
  "Leads",
  "Support",
] as const;

export type AcademyCategory = (typeof academyCategories)[number];

export interface AcademyLesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: AcademyCategory;
  videoSrc?: string;
  thumbnail?: string;
}

export const academyLessons: AcademyLesson[] = [
  {
    id: "1",
    title: "Getting Started",
    description: "Learn the basics of AI Tele Caller.",
    duration: "4:02",
    category: "Getting Started",
    videoSrc: "/academy/videos/getting-started.mp4",
    thumbnail: "/academy/thumbnails/getting-started.png",
  },
  {
    id: "2",
    title: "Create AI Agent",
    description: "How to create and manage AI voice agents.",
    duration: "4:22",
    category: "AI Agents",
    videoSrc: "/academy/videos/create-ai-agent.mp4",
    thumbnail: "/academy/thumbnails/create-ai-agent.png",
  },
  {
    id: "3",
    title: "Create & Run Campaign",
    description: "How to build your first outbound campaign.",
    duration: "2:38",
    category: "Campaigns",
    videoSrc: "/academy/videos/create-run-campaign.mp4",
    thumbnail: "/academy/thumbnails/create-run-campaign.png",
  },
  {
    id: "4",
    title: "Adding Credits",
    description: "How to add credits to your account.",
    duration: "1:31",
    category: "Adding Credits",
    videoSrc: "/academy/videos/adding-credits.mp4",
    thumbnail: "/academy/thumbnails/adding-credits.png",
  },
  {
    id: "5",
    title: "Manage Leads",
    description: "Understanding lead statuses and scoring.",
    duration: "1:12",
    category: "Leads",
    videoSrc: "/academy/videos/manage-leads.mp4",
    thumbnail: "/academy/thumbnails/manage-leads.png",
  },
  {
    id: "6",
    title: "Support Centre",
    description: "How to get help and contact support.",
    duration: "0:53",
    category: "Support",
    videoSrc: "/academy/videos/support-centre.mp4",
    thumbnail: "/academy/thumbnails/support-centre.png",
  },
];
