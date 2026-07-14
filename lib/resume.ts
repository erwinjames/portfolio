export const profile = {
  name: "Erwin James Manugas",
  shortName: "Erwin Manugas",
  role: "Web Developer & IT Systems",
  location: "Lapu-Lapu City, Cebu, Philippines",
  email: "manugasewinjames@gmail.com",
  phone: "09674213409",
  summary:
    "I build web systems that people actually run their business on — point-of-sale and inventory platforms, hotel sites, internal tools. Seven years across development and systems administration means I don't just ship the interface; I keep the servers, databases, and networks behind it standing up.",
  tagline: "Systems that hold up under real use.",
} as const;

export type Job = {
  company: string;
  role: string;
  location?: string;
  period: string;
  year: string;
  points: string[];
  stack: string[];
};

export const jobs: Job[] = [
  {
    company: "Tinkerpro",
    role: "Application Developer / Web Developer",
    location: "Lapu-Lapu City, Cebu",
    period: "Jan 2025 — May 2025",
    year: "2025",
    points: [
      "Built a POS and inventory system in PHP and JavaScript, from cashiering flow to stock movement.",
      "Designed and maintained the MySQL database backing the whole system.",
      "Tuned system performance so the floor could run it without waiting on it.",
      "Worked alongside the team to land the project end to end.",
    ],
    stack: ["PHP", "JavaScript", "MySQL", "POS"],
  },
  {
    company: "Hotel Asia Cebu",
    role: "Web Developer",
    location: "Cebu City",
    period: "Apr 2024 — Aug 2024",
    year: "2024",
    points: [
      "Developed a responsive website for the hotel, rebuilt around how guests actually browse.",
      "Applied SEO best practices to lift visibility in search results.",
      "Redesigned the interface for a cleaner, more usable, more visually appealing experience.",
    ],
    stack: ["JavaScript", "Bootstrap", "SEO", "Responsive"],
  },
  {
    company: "Consultare Inc. Group",
    role: "Freelance Web Developer",
    period: "May 2023 — Nov 2023",
    year: "2023",
    points: [
      "Built custom systems to client specification, scoped and delivered independently.",
    ],
    stack: ["PHP", "CodeIgniter", "MySQL"],
  },
  {
    company: "Tamiya Chuo Philippines Inc.",
    role: "IT System Administrator",
    location: "Lapu-Lapu City",
    period: "May 2021 — Apr 2023",
    year: "2021",
    points: [
      "Installed, configured, and maintained servers and networks across the site.",
      "Monitored file servers and intrusion detection systems, holding network integrity and security.",
      "Ran backups and recovery so data survived whatever hit it.",
      "Handled system upgrades, account setup, and internal documentation.",
    ],
    stack: ["Linux", "Networking", "Servers", "Security"],
  },
  {
    company: "Cordova Multipurpose Cooperative",
    role: "IT Assistant",
    location: "Cordova, Cebu",
    period: "Jun 2019 — Apr 2021",
    year: "2019",
    points: [
      "Managed the cooperative's IACCS business application and wrote code for their website.",
      "Troubleshot hardware and software across printers, computers, servers, and network.",
      "Designed posters and cards on request.",
    ],
    stack: ["Web", "Support", "Photoshop"],
  },
];

export const skillGroups = [
  {
    label: "Languages & Frameworks",
    items: ["PHP", "JavaScript", "React.js", "CodeIgniter 3 & 4", "Bootstrap 4", "AJAX / jQuery"],
  },
  {
    label: "Data & Systems",
    items: ["MySQL", "Server Administration", "Networking", "Backup & Recovery", "Intrusion Detection"],
  },
  {
    label: "Craft",
    items: ["Responsive Design", "SEO", "Adobe Photoshop", "Microsoft Office", "Technical Documentation"],
  },
  {
    label: "How I work",
    items: ["Team collaboration", "Fast learner", "Multitasking", "Troubleshooting"],
  },
] as const;

export const marqueeSkills = [
  "PHP",
  "JavaScript",
  "React.js",
  "CodeIgniter",
  "MySQL",
  "Bootstrap",
  "jQuery",
  "AJAX",
  "SEO",
  "Linux",
  "Networking",
  "Photoshop",
];

export const education = {
  school: "Cordova Public College",
  location: "Cordova, Cebu",
  detail: "Completed 2024",
} as const;

export const stats = [
  { value: "7", label: "Years in IT & web" },
  { value: "5", label: "Organizations served" },
  { value: "100%", label: "Uptime target held at Tamiya" },
] as const;
