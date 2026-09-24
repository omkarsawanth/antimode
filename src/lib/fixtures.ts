import {
  Brief,
  GenericMap,
  Direction,
  Scores,
  BlindRead,
  Collision,
  BrandSpec,
  GuardianResult,
  BrandKit,
} from "@/types/schemas";

// Pre-crafted, ultra-sharp fixtures for the seeds
export const SEED_1_BRIEF: Brief = {
  idea: "A terminal-first, local-only encrypted personal knowledge base and second brain built for paranoid security engineers and low-level programmers.",
  audience: {
    primary: "Kernel engineers, cryptographers, and infosec researchers",
    secondary: "Self-hosters and terminal purists",
    context: "Work in air-gapped or hardened Linux/BSD workstations, reject cloud telemetry, hate Electron memory bloat.",
  },
  problem: "Modern note-taking tools are bloated, cloud-dependent Electron apps that leak metadata and demand mouse clicks.",
  value: "Sub-millisecond keyboard navigation, raw plaintext markdown, zero-knowledge AES-256-GCM encryption on disk, zero cloud dependencies.",
  constraints: [
    "No cloud accounts or remote servers allowed",
    "Must execute directly in TTY/terminal without GUI",
    "No corporate SaaS jargon or friendly onboarding wizards",
  ],
  open_questions: ["Should multi-device sync be handled via git-crypt or raw P2P Tor onions?"],
  qa: [
    {
      q: "Who is the uncompromising user who would install this on day one?",
      a: "Paranoid security researchers and C/Rust programmers who write code in Neovim/tmux and refuse to store notes on Notion or Obsidian sync.",
    },
    {
      q: "What is the single failure mode this product must avoid at all costs?",
      a: "Accidental outbound network calls or telemetry. It must function perfectly with network cables unplugged.",
    },
    {
      q: "How does the pricing or distribution work?",
      a: "Open core CLI with paid encrypted offline peer-to-peer sync license.",
    },
  ],
};

export const SEED_1_GENERIC_MAP: GenericMap = {
  n_samples: 30,
  samples: [
    { name: "BrainVault", tagline: "The future of secure notes", tone_words: ["smart", "seamless", "innovative"], color_mood: "tech blue and clean white" },
    { name: "NoteFlow.ai", tagline: "Supercharge your second brain", tone_words: ["effortless", "modern", "empowering"], color_mood: "neon purple gradient" },
    { name: "MindSync", tagline: "Reimagining personal knowledge", tone_words: ["collaborative", "intuitive", "connected"], color_mood: "teal and slate" },
    { name: "CryptaNote", tagline: "Security made simple for everyone", tone_words: ["trusted", "scalable", "friendly"], color_mood: "corporate navy" },
    { name: "SynapseHub", tagline: "All-in-one knowledge management", tone_words: ["robust", "intelligent", "holistic"], color_mood: "cyan and dark gray" },
    { name: "ZenTerm", tagline: "Frictionless notes for developers", tone_words: ["zen", "clean", "minimal"], color_mood: "monochrome gray" },
    { name: "CipherNest", tagline: "Your encrypted cloud haven", tone_words: ["secure", "elevate", "cutting-edge"], color_mood: "electric indigo" },
    { name: "OmniMind", tagline: "Next generation thought capture", tone_words: ["revolutionary", "dynamic", "smart"], color_mood: "gradient violet" },
    { name: "ShieldNotes", tagline: "Empowering developers to think safer", tone_words: ["protective", "streamlined", "trusted"], color_mood: "blue and green" },
    { name: "CodeBrain", tagline: "The smarter way to code notes", tone_words: ["innovative", "seamless", "bespoke"], color_mood: "dark mode neon" },
  ],
  embedding_points: [
    { id: 1, x: 12.4, y: 15.2, cluster: 0, name: "BrainVault", tagline: "The future of secure notes" },
    { id: 2, x: 14.1, y: 18.0, cluster: 0, name: "NoteFlow.ai", tagline: "Supercharge your second brain" },
    { id: 3, x: 10.8, y: 16.3, cluster: 0, name: "MindSync", tagline: "Reimagining personal knowledge" },
    { id: 4, x: 13.5, y: 14.7, cluster: 0, name: "CryptaNote", tagline: "Security made simple" },
    { id: 5, x: 15.2, y: 17.5, cluster: 0, name: "SynapseHub", tagline: "All-in-one knowledge management" },
    { id: 6, x: 11.2, y: 13.9, cluster: 0, name: "ZenTerm", tagline: "Frictionless notes" },
    { id: 7, x: 16.0, y: 19.1, cluster: 0, name: "CipherNest", tagline: "Your encrypted cloud haven" },
    { id: 8, x: 14.8, y: 16.9, cluster: 0, name: "OmniMind", tagline: "Next generation thought capture" },
    { id: 9, x: 12.9, y: 15.8, cluster: 0, name: "ShieldNotes", tagline: "Empowering developers" },
    { id: 10, x: 13.8, y: 17.1, cluster: 0, name: "CodeBrain", tagline: "The smarter way to code notes" },
    { id: 11, x: 11.9, y: 16.5, cluster: 0 },
    { id: 12, x: 13.0, y: 14.2, cluster: 0 },
    { id: 13, x: 15.5, y: 18.3, cluster: 0 },
    { id: 14, x: 10.2, y: 15.0, cluster: 0 },
    { id: 15, x: 14.0, y: 16.0, cluster: 0 },
    { id: 16, x: 12.7, y: 17.8, cluster: 0 },
    { id: 17, x: 13.3, y: 15.5, cluster: 0 },
    { id: 18, x: 11.5, y: 16.1, cluster: 0 },
    { id: 19, x: 14.5, y: 17.9, cluster: 0 },
    { id: 20, x: 13.9, y: 16.7, cluster: 0 },
    { id: 21, x: 12.1, y: 14.9, cluster: 0 },
    { id: 22, x: 15.1, y: 17.0, cluster: 0 },
    { id: 23, x: 10.9, y: 15.7, cluster: 0 },
    { id: 24, x: 14.2, y: 18.5, cluster: 0 },
    { id: 25, x: 13.1, y: 16.2, cluster: 0 },
    { id: 26, x: 12.5, y: 15.1, cluster: 0 },
    { id: 27, x: 14.7, y: 17.3, cluster: 0 },
    { id: 28, x: 11.8, y: 14.5, cluster: 0 },
    { id: 29, x: 13.6, y: 16.4, cluster: 0 },
    { id: 30, x: 12.0, y: 15.9, cluster: 0 },
    // Candidates sitting clearly outside
    { id: 101, x: -28.5, y: -22.4, cluster: 1, name: "KILN", is_candidate: true, candidate_id: "dir-1" },
    { id: 102, x: -18.2, y: 34.1, cluster: 2, name: "BLACKTAPE", is_candidate: true, candidate_id: "dir-2" },
    { id: 103, x: 38.6, y: -26.0, cluster: 3, name: "MNEMONIC-0", is_candidate: true, candidate_id: "dir-3" },
  ],
  centroid: [13.2, 16.3],
  common_names: ["Vault", "Sync", "Mind", "Flow", "Brain", "Cipher", "Term", "Nest"],
  common_taglines_patterns: [
    "The future of secure notes",
    "Supercharge your second brain",
    "Security made simple",
    "All-in-one knowledge management",
    "Empowering developers to think safer",
  ],
  common_tone_words: ["seamless", "smart", "innovative", "empowering", "modern", "intuitive", "effortless"],
  common_color_moods: ["tech blue and clean white", "neon purple gradient", "teal and slate", "corporate navy"],
};

export const SEED_1_DIRECTIONS: Direction[] = [
  {
    id: "dir-1",
    label: "Archaic Industrial Brutalism",
    positioning: "A cold-forged, zero-telemetry crypt for thought. Built like a submarine bulkhead.",
    value_proposition: "Air-gapped markdown vault that treats memory as an operational secret.",
    personality: {
      traits: [
        { trait: "Monastic", why: "No social feeds, no sharing links, strictly solipsistic focus." },
        { trait: "Refractory", why: "Resists feature creep and commercial telemetry by architectural design." },
        { trait: "Surgical", why: "Single keystroke index lookups without latency or animation frames." },
      ],
      avoid: ["Playful onboarding", "Gamified streaks", "Cloud sync nudges", "Gradient buttons"],
    },
    name: "KILN",
    name_rationale: "From metallurgical kilns: heat-treating raw thought into hardened, unalterable obsidian.",
    alt_names: ["SLAG", "COLDMIND", "ANVIL-9"],
    tagline: "Fireproof thought. Zero network sockets.",
    one_line_pitch: "A terminal-native, memory-hardened knowledge crypt that never dials home.",
    voice: {
      rules: [
        "Use terse declarative sentences; omit all conversational adjectives.",
        "Reference hardware physics, cryptography, and storage primitives over abstractions.",
        "Never promise ease or delight; promise inviolable integrity.",
      ],
      sample_messages: [
        "Vault encrypted with ChaCha20-Poly1305. 0 bytes transmitted. Terminal ready.",
        "Index rebuilt in 1.4ms. Network interface unmapped.",
      ],
    },
    visual: {
      palette: [
        { name: "Anvil Charcoal", hex: "#121314", role: "Primary Canvas" },
        { name: "Phosphor Amber", hex: "#FFB000", role: "Critical Signal" },
        { name: "Cold Steel", hex: "#4A4D52", role: "Border & Structure" },
        { name: "Bleached Bone", hex: "#EDEDE8", role: "High-Readability Text" },
      ],
      typography: {
        heading: "Space Grotesk",
        body: "JetBrains Mono",
        rationale: "Engineered monospace with stark geometric title presence.",
      },
      shape_language: "Rigid 1px borders, 0px border-radius, dense ASCII tabular hierarchy.",
      image_style: "Monochrome macro photography of cold rolled steel and circuit dies.",
      avoid: ["Curved pills", "SaaS gradients", "Blob shapes", "Pastel accent colors"],
    },
    revisions: [
      {
        field: "tagline",
        before: "The smarter way to keep your developer notes private",
        after: "Fireproof thought. Zero network sockets.",
        reason: "Replaced cliché 'smarter way to' pattern with uncompromising technical posture.",
      },
      {
        field: "name",
        before: "VaultTerm",
        after: "KILN",
        reason: "Eliminated generic SaaS stems '-term' and 'vault' in favor of raw industrial metaphor.",
      },
    ],
  },
  {
    id: "dir-2",
    label: "Tactical Counter-Surveillance",
    positioning: "Operational intelligence notebook for adversarial environments.",
    value_proposition: "Denial-first documentation: plausible deniability vaults with decoy keystrokes.",
    personality: {
      traits: [
        { trait: "Paranoid", why: "Assumes the host operating system is compromised." },
        { trait: "Spartan", why: "Every byte of RAM allocated is verified and wiped on exit." },
        { trait: "Subversive", why: "Rejects surveillance capitalism's capture of personal intellectual property." },
      ],
      avoid: ["Cheery illustrations", "Collaborative team invites", "Weekly digest newsletters"],
    },
    name: "BLACKTAPE",
    name_rationale: "Physical analogy of black electrical tape covering webcams and sensor arrays.",
    alt_names: ["FARADAY", "SHADOWKEY", "DEADBOX"],
    tagline: "Your mind is classified. Act like it.",
    one_line_pitch: "Plausible deniability markdown engine for researchers in hostile networks.",
    voice: {
      rules: [
        "Frame data privacy as self-defense rather than a software preference.",
        "Use operational field terminology rather than product management speak.",
        "Refuse to congratulate the user for standard hygiene.",
      ],
      sample_messages: [
        "Session terminated. RAM scrubbed with random entropy. No residual state.",
        "Decoy partition mounted at /dev/null.",
      ],
    },
    visual: {
      palette: [
        { name: "Void Black", hex: "#080808", role: "Dominant Shield" },
        { name: "Tactical Red", hex: "#E63946", role: "Alert Accent" },
        { name: "Infrared Gray", hex: "#2B2D42", role: "Secondary Container" },
        { name: "CRT Green", hex: "#00FF66", role: "Signal State" },
      ],
      typography: {
        heading: "Syne",
        body: "IBM Plex Mono",
        rationale: "Unapologetic angular typography paired with intelligence-dossier monospacing.",
      },
      shape_language: "Warning stripes, dossier watermarks, bracketed coordinate labels.",
      image_style: "Stark thermal imagery, redacted document scans, and phosphor trace lines.",
      avoid: ["Smiley avatars", "Rounded cards", "Friendly tooltips"],
    },
    revisions: [
      {
        field: "positioning",
        before: "A secure second brain for smart people who care about security",
        after: "Operational intelligence notebook for adversarial environments.",
        reason: "Removed lazy 'second brain' trope and replaced with specific operational mandate.",
      },
    ],
  },
  {
    id: "dir-3",
    label: "Stoic Archival Monasticism",
    positioning: "Enduring offline knowledge ledger designed to survive decades without upkeep.",
    value_proposition: "Zero-dependency plain text ledger compiled to static self-contained binary.",
    personality: {
      traits: [
        { trait: "Epochal", why: "Built to open identically in 2075 without backward incompatibility." },
        { trait: "Austere", why: "Rejects the dopamine cycle of hyperlinked notification noise." },
        { trait: "Disciplined", why: "Enforces clear atomic thinking over chaotic web clipping." },
      ],
      avoid: ["AI chat autocomplete", "Plugin marketplaces", "Web clippers", "Sync spinners"],
    },
    name: "MNEMONIC-0",
    name_rationale: "Mnemonic device stripped to zero baseline; foundational human recall.",
    alt_names: ["SCRIPTORIUM", "CODEX-OFFLINE", "PERPETUA"],
    tagline: "Notes for the next fifty years.",
    one_line_pitch: "Archival terminal notebook with guaranteed zero dependencies and offline longevity.",
    voice: {
      rules: [
        "Speak with historical gravity and long-term permanence.",
        "Treat file formats as treaties: Plain UTF-8, zero proprietary encodings.",
        "Focus on cognitive endurance over speed.",
      ],
      sample_messages: [
        "Record appended to ledger. Checksum verified against local root.",
        "No network socket detected. As designed.",
      ],
    },
    visual: {
      palette: [
        { name: "Ink Black", hex: "#16161D", role: "Type & Structure" },
        { name: "Aged Vellum", hex: "#F5F2EB", role: "Paper Substrate" },
        { name: "Oxide Ochre", hex: "#C68B59", role: "Historical Accent" },
        { name: "Lead Slate", hex: "#5C6068", role: "Metadata" },
      ],
      typography: {
        heading: "Newsreader",
        body: "Space Mono",
        rationale: "Sublime archival serif heading combined with typewriter precision.",
      },
      shape_language: "Bookbinding margins, subtle hairline rules, editorial grid systems.",
      image_style: "High-resolution architectural stone engravings and archival parchment details.",
      avoid: ["App launcher icons", "Floating action buttons", "Neon lights"],
    },
    revisions: [
      {
        field: "tagline",
        before: "Next generation archival notes for everyone",
        after: "Notes for the next fifty years.",
        reason: "Purged 'Next generation' and 'for everyone' clichés.",
      },
    ],
  },
];

export const SEED_1_SCORES: Record<string, Scores> = {
  "dir-1": {
    direction_id: "dir-1",
    genericness: 24.2, // Well below 55!
    genericness_breakdown: {
      embedding_sim: 18.5,
      cliche_hits: [],
      cliche_rate: 0.0,
    },
    perception_gap: 0.18, // Well below 0.4!
    gap_breakdown: {
      category_match: 0.92,
      audience_match: 0.88,
      feel_match: 0.90,
    },
    pass: true,
  },
  "dir-2": {
    direction_id: "dir-2",
    genericness: 29.8,
    genericness_breakdown: {
      embedding_sim: 24.1,
      cliche_hits: [],
      cliche_rate: 0.0,
    },
    perception_gap: 0.22,
    gap_breakdown: {
      category_match: 0.84,
      audience_match: 0.82,
      feel_match: 0.86,
    },
    pass: true,
  },
  "dir-3": {
    direction_id: "dir-3",
    genericness: 31.4,
    genericness_breakdown: {
      embedding_sim: 26.5,
      cliche_hits: [],
      cliche_rate: 0.0,
    },
    perception_gap: 0.25,
    gap_breakdown: {
      category_match: 0.81,
      audience_match: 0.80,
      feel_match: 0.85,
    },
    pass: true,
  },
};

export const SEED_1_BLIND_READS: BlindRead[] = [
  {
    reader_id: 1,
    guess: {
      category: "Developer security tool / offline developer notebook",
      audience: "Systems engineers, security pros, terminal hackers",
      feel_words: ["brutal", "unforgiving", "cryptographic", "rugged"],
      one_line: "An air-gapped terminal command-line tool for storing notes without cloud risk.",
    },
  },
  {
    reader_id: 2,
    guess: {
      category: "Encrypted offline database or markdown keeper",
      audience: "Linux programmers and privacy advocates",
      feel_words: ["industrial", "fireproof", "stoic", "precise"],
      one_line: "A hard-edged note repository that operates strictly in local memory and disk.",
    },
  },
  {
    reader_id: 3,
    guess: {
      category: "Security software / local knowledge vault",
      audience: "Paranoid engineers and cryptographers",
      feel_words: ["austere", "armored", "dense", "minimalist"],
      one_line: "A terminal-first encrypted personal vault with zero internet connectivity.",
    },
  },
];

export const SEED_1_COLLISIONS: Collision[] = [
  {
    name: "KILN",
    nearest_brands: [
      { brand: "Kiln.fi", similarity_note: "Ethereum staking validator network. Non-competing fintech infra." },
      { brand: "Kiln (Ceramics)", similarity_note: "Physical industrial equipment. No software overlap." },
    ],
    risk: "low",
  },
  {
    name: "BLACKTAPE",
    nearest_brands: [
      { brand: "Blackbag Tech", similarity_note: "Digital forensics firm. Adjacent security sector." },
      { brand: "Tape.sh", similarity_note: "Terminal recording utility. Different functional category." },
    ],
    risk: "low",
  },
  {
    name: "MNEMONIC-0",
    nearest_brands: [
      { brand: "Mnemonic AS", similarity_note: "Scandinavian managed security services provider." },
    ],
    risk: "medium",
  },
];

export const SEED_1_SPEC: BrandSpec = {
  banned_words: [
    "seamless", "supercharge", "empowering", "modern", "effortless", "all-in-one",
    "intuitive", "smart", "future of", "second brain", "elevate", "frictionless", "delightful"
  ],
  required_traits: [
    "Cold technical precision",
    "Hardware-level honesty (reference RAM, disk, cryptographic primitives)",
    "Solipsistic posture (reject social features and sharing tropes)"
  ],
  voice_rules: [
    "State facts in declarative sentences; omit marketing hyperbole.",
    "Never use exclamation marks or friendly exclamation phrases.",
    "Address the user as an autonomous operator, never a consumer to be pampered.",
    "Explicitly declare offline guarantees whenever describing system behavior."
  ],
  palette: [
    { hex: "#121314" },
    { hex: "#FFB000" },
    { hex: "#4A4D52" },
    { hex: "#EDEDE8" },
  ],
  contrast_min: 4.5,
  rounds: [
    {
      round: 1,
      attack: "Meet KILN: The smart, intuitive notes app designed to seamlessly organize your thoughts.",
      slipped_through: true,
      new_rule: "Ban 'meet [product]', 'intuitive', and 'smart'. State capability directly without welcoming gestures.",
    },
    {
      round: 2,
      attack: "Supercharge your developer productivity with our lightning-fast knowledge architecture.",
      slipped_through: true,
      new_rule: "Ban 'supercharge' and 'productivity'. Emphasize tamper-proof integrity and zero network socket architecture.",
    },
    {
      round: 3,
      attack: "Enjoy peace of mind knowing your thoughts are safely protected by our friendly security model.",
      slipped_through: false,
      new_rule: "Enforce zero-patronizing tone: never tell the user how to feel ('enjoy', 'delight', 'peace of mind').",
    },
  ],
};

export const SEED_1_BRAND_KIT: BrandKit = {
  summary: SEED_1_BRIEF,
  direction: SEED_1_DIRECTIONS[0],
  scores: SEED_1_SCORES["dir-1"],
  spec: SEED_1_SPEC,
  launch: {
    landing_headline: "FIREPROOF THOUGHT. ZERO NETWORK SOCKETS.",
    subhead: "An unadorned terminal knowledge crypt compiled directly to native binary. Plaintext markdown encrypted on disk with ChaCha20-Poly1305. No cloud accounts. No telemetry. No Electron memory leaks.",
    one_line_pitch: "A memory-hardened terminal note vault for operators who treat thought as classified intelligence.",
    social_posts: [
      "Every major note-taking application is an Electron wrapper designed to monetize your intellectual property or leak metadata to third-party CDNs. KILN has zero network dependencies. Pull the Ethernet cable and inspect the memory dump.",
      "KILN v1.0. 1.2MB binary. Sub-millisecond fuzzy search. ChaCha20-Poly1305 local encryption. Terminal only. Build from source or inspect the signatures.",
      "If your notes require an internet connection to open, they are not your notes. KILN runs in your TTY. Always.",
    ],
  },
};

export const SEED_2_BRIEF: Brief = {
  idea: "An ultra-minimalist, zero-caffeine bitter herbal focus tonic brewed in cold small batches from wild Nordic forest bark, roots, and pine needles.",
  audience: {
    primary: "Deep-work knowledge workers, engineers, and architects",
    secondary: "Endurance athletes seeking clean physical grounding",
    context: "Suffer from chronic caffeine crashes, jittery afternoon anxiety, and over-sweetened artificial energy drinks.",
  },
  problem: "Energy drinks rely on 200mg caffeine spikes, sucralose, and fake neon flavors that wreck sleep architecture and neuro-receptors.",
  value: "Subtle, non-dopaminergic cognitive endurance derived from wild-foraged adaptogens, bitter triterpenes, and cold-extracted birch chaga.",
  constraints: [
    "Zero added sweeteners, zero artificial flavorings",
    "Must not look like a tech startup drink or a cartoon wellness seltzer",
    "No cheerful pastel cans or faux-spiritual branding",
  ],
  open_questions: ["How to prepare first-time drinkers for the intense bitter pine resin flavor profile?"],
  qa: [
    {
      q: "What is the single emotion a customer should feel taking their first sip?",
      a: "Shocked by the authentic bitter bark, followed by an immediate sense of quiet, rooted mental stillness.",
    },
    {
      q: "How should the vessel be packaged?",
      a: "Heavy amber glass apothecary bottle with wax-sealed cap and letterpress botanical label.",
    },
    {
      q: "What makes this impossible for mainstream beverage conglomerates to copy?",
      a: "Wild hand-foraged Arctic botanicals with seasonal vintage variances that cannot be synthesized in chemical vats.",
    },
  ],
};

export const SEED_2_GENERIC_MAP: GenericMap = {
  n_samples: 30,
  samples: [
    { name: "ZenSip", tagline: "Mindful energy for modern life", tone_words: ["calm", "pure", "elevating"], color_mood: "soft sage green and cream" },
    { name: "PureAdapt", tagline: "Unleash your inner vitality", tone_words: ["holistic", "empowering", "natural"], color_mood: "earthy brown and green" },
    { name: "AuraTonic", tagline: "The future of botanical wellness", tone_words: ["radiant", "revitalizing", "clean"], color_mood: "pastel watercolor gradient" },
    { name: "ForestFlow", tagline: "Nature's smart energy boost", tone_words: ["refreshing", "seamless", "balanced"], color_mood: "forest green and white" },
    { name: "VitalRoot", tagline: "Supercharge your daily focus", tone_words: ["vibrant", "organic", "potent"], color_mood: "warm amber and leaf green" },
  ],
  embedding_points: [
    { id: 1, x: 22.1, y: -14.3, cluster: 0, name: "ZenSip", tagline: "Mindful energy for modern life" },
    { id: 2, x: 24.5, y: -16.0, cluster: 0, name: "PureAdapt", tagline: "Unleash your inner vitality" },
    { id: 3, x: 21.0, y: -12.8, cluster: 0, name: "AuraTonic", tagline: "The future of botanical wellness" },
    { id: 4, x: 25.2, y: -15.1, cluster: 0, name: "ForestFlow", tagline: "Nature's smart energy boost" },
    { id: 5, x: 23.8, y: -13.9, cluster: 0, name: "VitalRoot", tagline: "Supercharge your daily focus" },
    { id: 101, x: -35.2, y: 28.4, cluster: 1, name: "BARK & TALLOW", is_candidate: true, candidate_id: "dir-1" },
    { id: 102, x: -14.6, y: -38.2, cluster: 2, name: "KJELL", is_candidate: true, candidate_id: "dir-2" },
    { id: 103, x: 42.1, y: 31.0, cluster: 3, name: "ARCTIC HUMUS", is_candidate: true, candidate_id: "dir-3" },
  ],
  centroid: [23.3, -14.4],
  common_names: ["Zen", "Root", "Adapt", "Pure", "Aura", "Flow", "Vital", "Nature", "Botanica"],
  common_taglines_patterns: [
    "Mindful energy for modern life",
    "Unleash your inner vitality",
    "The future of botanical wellness",
    "Nature's smart energy boost",
    "Supercharge your daily focus",
  ],
  common_tone_words: ["mindful", "clean", "vitality", "holistic", "pure", "elevating", "refreshing"],
  common_color_moods: ["soft sage green and cream", "earthy brown and green", "pastel watercolor gradient"],
};

export const SEED_2_DIRECTIONS: Direction[] = [
  {
    id: "dir-1",
    label: "Nordic Botanical Penance",
    positioning: "Uncompromising bitter medicine harvested from sub-zero taiga.",
    value_proposition: "Cold-decocted pine resin and chaga root for cognitive endurance without nervous agitation.",
    personality: {
      traits: [
        { trait: "Austere", why: "No sugar, no pleasantries, pure active phytochemical astringency." },
        { trait: "Rooted", why: "Honors the harsh reality of arctic permafrost flora." },
        { trait: "Monastic", why: "Approaches hydration as a solemn discipline rather than recreation." },
      ],
      avoid: ["Bubblegum wellness", "Playful mascots", "Pastel cans", "Flavored seltzers"],
    },
    name: "BARK & TALLOW",
    name_rationale: "Echoes pre-industrial apothecaries where remedies were visceral and unadorned.",
    alt_names: ["PINEVÄRN", "CHAGA-66", "RESIN-LAB"],
    tagline: "Bitter medicine for quiet thought.",
    one_line_pitch: "Wild Nordic pine and birch decoction for prolonged cognitive stamina without caffeine.",
    voice: {
      rules: [
        "Acknowledge the harsh, astringent taste honestly without apology.",
        "Use botanical taxonomical terms instead of marketing adjectives.",
        "Reject all wellness optimism and pseudo-spiritual promises.",
      ],
      sample_messages: [
        "Contains 0g sugar. Heavy in bitter triterpenes. Do not drink if you seek sweetness.",
        "Harvested at 66°N during autumnal frost. Sediment is intact.",
      ],
    },
    visual: {
      palette: [
        { name: "Bog Pine", hex: "#1C241D", role: "Primary Deep Forest" },
        { name: "Birch Bark", hex: "#EBE5D8", role: "Label Canvas" },
        { name: "Lichen Amber", hex: "#B87333", role: "Apothecary Glass" },
        { name: "Iron Rust", hex: "#7B3F00", role: "Stamp Accent" },
      ],
      typography: {
        heading: "Cinzel",
        body: "Newsreader",
        rationale: "Classical epigraphic roman serif invoking ancient botanical pharmacopoeias.",
      },
      shape_language: "Apothecary letterpress stamps, heavy lead rules, anatomical linocut botanicals.",
      image_style: "Monochrome macro photography of frosted pine bark and cross-cut roots.",
      avoid: ["Cartoon fruit icons", "Neon can wraps", "Playful rounded badges"],
    },
    revisions: [
      {
        field: "tagline",
        before: "Unlock the natural power of the forest",
        after: "Bitter medicine for quiet thought.",
        reason: "Replaced generic 'unlock natural power' cliché with accurate, stoic taste warning.",
      },
    ],
  },
  {
    id: "dir-2",
    label: "Arctic Pharmacopoeia",
    positioning: "Clinical cold-biome neuro-botanicals.",
    value_proposition: "Standardized forest extracts calibrated for sustained cerebral flow.",
    personality: {
      traits: [
        { trait: "Clinical", why: "Treats forest herbs with pharmaceutical rigor." },
        { trait: "Silent", why: "Energy without noise or trembling hands." },
        { trait: "Rigorous", why: "Full HPLC chemical assay printed on every batch label." },
      ],
      avoid: ["Boho wellness", "Chakra references", "Spiritual escapism"],
    },
    name: "KJELL",
    name_rationale: "Old Norse for 'spring' or 'source', crisp and monosyllabic.",
    alt_names: ["BOREAL-EXTRACT", "PERMAFROST", "STILLET"],
    tagline: "Endurance without stimulant debt.",
    one_line_pitch: "Pharmaceutical-grade cold-climate adaptogen tonic for sustained intellectual focus.",
    voice: {
      rules: [
        "Cite active triterpene percentages and solvent-free cold extractions.",
        "Never use enthusiastic exclamation marks.",
        "Highlight absence of caffeine crash.",
      ],
      sample_messages: [
        "Batch 042: 14.2% betulinic acid, 0mg caffeine. Calibrated for 6-hour endurance.",
      ],
    },
    visual: {
      palette: [
        { name: "Permafrost Gray", hex: "#2E3440", role: "Stark Background" },
        { name: "Glacier Blue", hex: "#88C0D0", role: "Analytical Accent" },
        { name: "Snow White", hex: "#ECEFF4", role: "High-Contrast Data" },
        { name: "Nordic Amber", hex: "#D08770", role: "Decoction Tint" },
      ],
      typography: {
        heading: "Space Grotesk",
        body: "Inter",
        rationale: "Ultra-precise Swiss-style information architecture.",
      },
      shape_language: "Laboratory batch tables, calibrated measurement marks, minimalist seal.",
      image_style: "Sterile laboratory photography with cold atmospheric ice crystals.",
      avoid: ["Yoga poses", "Spiritual mandalas", "Fruity splash photography"],
    },
    revisions: [
      {
        field: "name",
        before: "ForestFocus",
        after: "KJELL",
        reason: "Replaced cliché compound name with distinctive Nordic moniker.",
      },
    ],
  },
  {
    id: "dir-3",
    label: "Primal Taiga Forager",
    positioning: "The raw taste of sub-arctic survival.",
    value_proposition: "Unfiltered wood and root decoctions brewed according to ancient reindeer-herder traditions.",
    personality: {
      traits: [
        { trait: "Untamed", why: "Zero processing shortcuts or synthetic additives." },
        { trait: "Elemental", why: "Connects modern desks to prehistoric coniferous forests." },
        { trait: "Uncompromising", why: "No added sugar or artificial smoothing agents." },
      ],
      avoid: ["Cute cartoon animals", "Influencer aesthetics", "Diet claims"],
    },
    name: "ARCTIC HUMUS",
    name_rationale: "Humus: the rich organic forest floor substrate from which ancient roots draw life.",
    alt_names: ["ROOTLINE", "FEN-BREW", "SUB-BOREAL"],
    tagline: "Drawn from deep forest earth.",
    one_line_pitch: "Wild-harvested pine and root brew for grounded physical and mental resilience.",
    voice: {
      rules: [
        "Describe the taste as astringent, earthy, and intense.",
        "Highlight ethical wildcrafting quotas.",
      ],
      sample_messages: [
        "Brewed from fallen pine heartwood and chaga conks collected by hand.",
      ],
    },
    visual: {
      palette: [
        { name: "Deep Humus", hex: "#231B15", role: "Primary Wood" },
        { name: "Ochre Lichen", hex: "#C59B27", role: "Highlight" },
        { name: "Bark Grey", hex: "#5C5248", role: "Sub-Tone" },
        { name: "Canvas Cream", hex: "#F3EDE2", role: "Ground" },
      ],
      typography: {
        heading: "Syne",
        body: "IBM Plex Sans",
        rationale: "Primal organic display font paired with clean structured reading text.",
      },
      shape_language: "Hand-torn paper edges, woodblock stamp textures, raw topographic contours.",
      image_style: "Moody damp taiga photography shrouded in morning fog.",
      avoid: ["Glossy renders", "Pastel tones", "Generic leaf icons"],
    },
    revisions: [
      {
        field: "tagline",
        before: "Fuel your daily grind with pure nature",
        after: "Drawn from deep forest earth.",
        reason: "Banished 'Fuel your daily grind' hustle cliché.",
      },
    ],
  },
];

export const SEED_3_BRIEF: Brief = {
  idea: "An unbundled peer-risk parametric rain micro-insurance platform that pays gig delivery couriers instantly via mobile money the second precipitation exceeds 3mm/hr in their geofenced sector.",
  audience: {
    primary: "Urban motorcycle, moped, and e-bike delivery couriers",
    secondary: "Independent fleet operators and delivery cooperatives",
    context: "Work in torrential monsoon/rain seasons where road danger surges and order demand drops or becomes hazardous, risking daily livelihood.",
  },
  problem: "Traditional insurance requires days of paperwork, police reports, and claims adjusters, offering zero protection for immediate wage loss during flash storms.",
  value: "Automated hyper-local radar telemetry triggers instant payouts straight to mobile wallets within 90 seconds of a storm threshold breach, no claims needed.",
  constraints: [
    "No claim forms or human adjusters ever",
    "Must not look like a sterile corporate insurance conglomerate or predatory payday loan",
    "Zero financial jargon or confusing exclusions",
  ],
  open_questions: ["How to present rainfall threshold radar telemetry transparently on low-end smartphones?"],
  qa: [
    {
      q: "What is the core user experience when it starts pouring rain?",
      a: "The courier's phone buzzes with an instant mobile money transfer notification before their jacket is even wet.",
    },
    {
      q: "Why do couriers distrust existing insurance companies?",
      a: "Because insurers are designed to deny claims, demand receipts, and drag cases out for weeks.",
    },
    {
      q: "What is the economic model?",
      a: "Pay 50 cents per shift when storm probability is elevated; receive $25 instant wage stabilization payout if downpour occurs.",
    },
  ],
};

export const SEED_3_GENERIC_MAP: GenericMap = {
  n_samples: 30,
  samples: [
    { name: "RainGuard", tagline: "Protecting delivery heroes everywhere", tone_words: ["trusted", "caring", "secure"], color_mood: "corporate blue and umbrella yellow" },
    { name: "StormShield.io", tagline: "Smart weather insurance for the gig economy", tone_words: ["innovative", "seamless", "empowering"], color_mood: "sky blue and electric cyan" },
    { name: "CourierCare", tagline: "Peace of mind for your daily delivery journey", tone_words: ["compassionate", "simple", "reliable"], color_mood: "pastel blue and warm orange" },
    { name: "WeatherSure", tagline: "Reimagining insurance for modern workers", tone_words: ["revolutionary", "effortless", "modern"], color_mood: "navy blue and white" },
    { name: "GigCover", tagline: "The all-in-one safety net for freelancers", tone_words: ["accessible", "flexible", "holistic"], color_mood: "teal and green" },
  ],
  embedding_points: [
    { id: 1, x: -15.4, y: 22.0, cluster: 0, name: "RainGuard", tagline: "Protecting delivery heroes" },
    { id: 2, x: -17.2, y: 24.5, cluster: 0, name: "StormShield.io", tagline: "Smart weather insurance" },
    { id: 3, x: -14.0, y: 20.8, cluster: 0, name: "CourierCare", tagline: "Peace of mind" },
    { id: 4, x: -16.5, y: 23.1, cluster: 0, name: "WeatherSure", tagline: "Reimagining insurance" },
    { id: 5, x: -18.0, y: 25.4, cluster: 0, name: "GigCover", tagline: "All-in-one safety net" },
    { id: 101, x: 32.5, y: -28.1, cluster: 1, name: "RADARPAY", is_candidate: true, candidate_id: "dir-1" },
    { id: 102, x: 28.0, y: 36.4, cluster: 2, name: "3MM", is_candidate: true, candidate_id: "dir-2" },
    { id: 103, x: -38.2, y: -24.5, cluster: 3, name: "DOWNPOUR PROTOCOL", is_candidate: true, candidate_id: "dir-3" },
  ],
  centroid: [-16.2, 23.2],
  common_names: ["Guard", "Shield", "Care", "Cover", "Sure", "Gig", "Storm", "Safe"],
  common_taglines_patterns: [
    "Protecting delivery heroes everywhere",
    "Smart weather insurance for the gig economy",
    "Peace of mind for your daily delivery journey",
    "Reimagining insurance for modern workers",
    "The all-in-one safety net for freelancers",
  ],
  common_tone_words: ["trusted", "caring", "seamless", "empowering", "reliable", "peace of mind"],
  common_color_moods: ["corporate blue and umbrella yellow", "sky blue and electric cyan", "navy blue and white"],
};

export const SEED_3_DIRECTIONS: Direction[] = [
  {
    id: "dir-1",
    label: "Telemetry-First Kinetic Utility",
    positioning: "Unapologetic algorithmic wage hedge for bad weather.",
    value_proposition: "Doppler radar triggers instant cash in pocket. Zero paperwork. Zero human review.",
    personality: {
      traits: [
        { trait: "Instantaneous", why: "Milliseconds between radar cloudburst detection and cash arrival." },
        { trait: "Mercenary", why: "Pure financial defense for gig workers navigating street-level economic volatility." },
        { trait: "Transparent", why: "Live radar Doppler telemetry displayed directly on screen; no fine print." },
      ],
      avoid: ["Condescending empathy", "Calling workers 'heroes'", "Friendly insurance mascots", "Cartoon umbrellas"],
    },
    name: "RADARPAY",
    name_rationale: "Direct synthesis of Doppler radar trigger with immediate financial settlement.",
    alt_names: ["DOPPLERCASH", "CLOUDBREAK", "SECTOR-3"],
    tagline: "When it pours, your account fills.",
    one_line_pitch: "Automated rainfall wage defense that transfers cash to your phone the second downpours hit your delivery grid.",
    voice: {
      rules: [
        "Never refer to workers as 'heroes' or 'families'; treat them as independent commercial operators.",
        "Talk about rain in millimeters per hour (mm/hr) and Doppler radar readings, never fuzzy weather forecasts.",
        "Highlight speed of cash payout in exact seconds.",
      ],
      sample_messages: [
        "Precipitation at Sector 4 reached 3.4mm/hr. $22.50 credited to your wallet at 14:02:18.",
        "Zero claims filed. Zero adjusters consulted. Telemetry confirmed.",
      ],
    },
    visual: {
      palette: [
        { name: "Asphalt Wet", hex: "#0E1116", role: "Base Street Surface" },
        { name: "Radar Amber", hex: "#FFAA00", role: "Storm Intensity Warning" },
        { name: "Reflective Vest Silver", hex: "#E6EDF3", role: "High-Visibility Text" },
        { name: "Doppler Violet", hex: "#5E35B1", role: "Radar Sector Band" },
      ],
      typography: {
        heading: "Cabinet Grotesk",
        body: "JetBrains Mono",
        rationale: "High-impact industrial headline paired with clean monospaced telemetry figures.",
      },
      shape_language: "Isobar lines, radar sweep grids, high-visibility reflective caution chevrons.",
      image_style: "Night-time long exposures of wet neon streets, motorcycle headlights in rain, Doppler radar feeds.",
      avoid: ["Cartoon umbrellas", "Stock photos of happy people in raincoats", "Corporate blue badge logos"],
    },
    revisions: [
      {
        field: "tagline",
        before: "Smart protection for hardworking delivery heroes",
        after: "When it pours, your account fills.",
        reason: "Stripped patronizing 'delivery heroes' cliché; replaced with clear economic consequence.",
      },
    ],
  },
  {
    id: "dir-2",
    label: "Parametric Threshold Minimalist",
    positioning: "A binary contract with the sky.",
    value_proposition: "Precision rain trigger: 3mm of rain = $25 cash. Nothing else to understand.",
    personality: {
      traits: [
        { trait: "Binary", why: "Either it rained 3mm or it did not. No nuance, no negotiations." },
        { trait: "Utilitarian", why: "Functions like a circuit breaker for personal income." },
        { trait: "Sovereign", why: "Puts couriers in direct control of their shift risk." },
      ],
      avoid: ["Fine print policies", "Deductibles", "Insurance jargon", "Underwriting interviews"],
    },
    name: "3MM",
    name_rationale: "The exact physical rainfall threshold that triggers immediate cash payout.",
    alt_names: ["ISOBAR", "PRECIP", "GAUGE-9"],
    tagline: "Three millimeters between storm and payout.",
    one_line_pitch: "Binary parametric rain protection paying out at exactly 3mm/hr rainfall threshold.",
    voice: {
      rules: [
        "Strip all clauses down to single-clause statements.",
        "Treat insurance like physics rather than finance.",
      ],
      sample_messages: [
        "Threshold: 3.0mm/hr. Current reading: 3.2mm/hr. Trigger fired. Funds dispersed.",
      ],
    },
    visual: {
      palette: [
        { name: "Storm Black", hex: "#111418", role: "Canvas" },
        { name: "Laser Cyan", hex: "#00E5FF", role: "Threshold Indicator" },
        { name: "Gauge White", hex: "#FFFFFF", role: "Primary Metric" },
        { name: "Storm Cloud", hex: "#3A4454", role: "Sub-surface" },
      ],
      typography: {
        heading: "Space Grotesk",
        body: "Inter",
        rationale: "Clean mathematical geometry with flawless mobile screen legibility.",
      },
      shape_language: "Digital dials, liquid level gauges, precise millimeter crosshairs.",
      image_style: "Monochrome macro water droplet impacts on road surfaces.",
      avoid: ["Smiley mascots", "Handshake icons", "Piggy banks"],
    },
    revisions: [
      {
        field: "name",
        before: "RainShield",
        after: "3MM",
        reason: "Replaced overused 'Shield' stem with physical metric definition.",
      },
    ],
  },
  {
    id: "dir-3",
    label: "Courier Guild Protocol",
    positioning: "Mutual risk defense collective built by and for urban riders.",
    value_proposition: "Decentralized weather pool operated as a transparent utility for delivery riders.",
    personality: {
      traits: [
        { trait: "Solidary", why: "Built on peer-to-peer solidarity rather than extractive insurance margins." },
        { trait: "Gritty", why: "Forged in the reality of urban asphalt and winter squalls." },
        { trait: "Defiant", why: "Refuses to let corporate platforms leave riders unprotected." },
      ],
      avoid: ["Corporate platitudes", "Pity-based messaging", "Suits and ties"],
    },
    name: "DOWNPOUR PROTOCOL",
    name_rationale: "Frames the emergency rain response as an unyielding technical protocol.",
    alt_names: ["ASPHALT-MUTUAL", "SHIFTGUARD", "TORRENT"],
    tagline: "We ride through storms. The guild covers the rest.",
    one_line_pitch: "Peer-risk parametric storm pool built specifically for high-exposure delivery fleets.",
    voice: {
      rules: [
        "Speak rider to rider, with street-level respect and directness.",
        "Emphasize collective financial self-defense.",
      ],
      sample_messages: [
        "Monsoon squall confirmed over downtown grid. All active riders paid out automatically.",
      ],
    },
    visual: {
      palette: [
        { name: "Asphalt Wet", hex: "#1A1B1E", role: "Base Canvas" },
        { name: "Neon Yellow", hex: "#D4FF00", role: "Safety Accent" },
        { name: "Rain Slate", hex: "#4C566A", role: "Structural Lines" },
        { name: "Reflective White", hex: "#F8F9FA", role: "Primary Text" },
      ],
      typography: {
        heading: "Syne",
        body: "Space Mono",
        rationale: "Raw rebellious headline with industrial monospaced technical body.",
      },
      shape_language: "Hazard striping, stencil stamps, modular grid tags.",
      image_style: "Gritty action shots of helmeted couriers navigating wet neon street traffic.",
      avoid: ["Suited corporate spokespeople", "Clean pastel graphics"],
    },
    revisions: [
      {
        field: "tagline",
        before: "Peace of mind for your everyday delivery journey",
        after: "We ride through storms. The guild covers the rest.",
        reason: "Banished 'Peace of mind' cliché and corporate wellness language.",
      },
    ],
  },
];

// Helper to retrieve seed fixtures or synthesize for arbitrary ideas
export function getFixtureForIdea(ideaText: string): {
  brief: Brief;
  generic_map: GenericMap;
  directions: Direction[];
  scores: Record<string, Scores>;
  blind_reads: BlindRead[];
  collisions: Collision[];
  spec: BrandSpec;
  brand_kit: BrandKit;
} {
  const lower = ideaText.toLowerCase();

  if (lower.includes("seed-1") || lower.includes("terminal") || lower.includes("encrypted") || lower.includes("second brain") || lower.includes("security") || lower.includes("crypt")) {
    return {
      brief: SEED_1_BRIEF,
      generic_map: SEED_1_GENERIC_MAP,
      directions: SEED_1_DIRECTIONS,
      scores: SEED_1_SCORES,
      blind_reads: SEED_1_BLIND_READS,
      collisions: SEED_1_COLLISIONS,
      spec: SEED_1_SPEC,
      brand_kit: SEED_1_BRAND_KIT,
    };
  }

  if (lower.includes("seed-2") || lower.includes("tonic") || lower.includes("herbal") || lower.includes("adaptogen") || lower.includes("caffeine") || lower.includes("botanical")) {
    return {
      brief: SEED_2_BRIEF,
      generic_map: SEED_2_GENERIC_MAP,
      directions: SEED_2_DIRECTIONS,
      scores: {
        "dir-1": {
          direction_id: "dir-1",
          genericness: 26.5,
          genericness_breakdown: { embedding_sim: 21.0, cliche_hits: [], cliche_rate: 0.0 },
          perception_gap: 0.22,
          gap_breakdown: { category_match: 0.90, audience_match: 0.85, feel_match: 0.88 },
          pass: true,
        },
        "dir-2": {
          direction_id: "dir-2",
          genericness: 32.1,
          genericness_breakdown: { embedding_sim: 27.0, cliche_hits: [], cliche_rate: 0.0 },
          perception_gap: 0.28,
          gap_breakdown: { category_match: 0.82, audience_match: 0.80, feel_match: 0.84 },
          pass: true,
        },
        "dir-3": {
          direction_id: "dir-3",
          genericness: 35.4,
          genericness_breakdown: { embedding_sim: 29.5, cliche_hits: [], cliche_rate: 0.0 },
          perception_gap: 0.31,
          gap_breakdown: { category_match: 0.80, audience_match: 0.78, feel_match: 0.82 },
          pass: true,
        },
      },
      blind_reads: [
        {
          reader_id: 1,
          guess: {
            category: "Herbal botanical tonic / apothecary wellness",
            audience: "Engineers, health purists, coffee reducers",
            feel_words: ["astringent", "nordic", "sub-zero", "monastic"],
            one_line: "An intense bitter pine and chaga wellness tonic for mental stamina.",
          },
        },
        {
          reader_id: 2,
          guess: {
            category: "Functional forest beverage",
            audience: "Deep workers and endurance athletes",
            feel_words: ["wild", "stoic", "unfiltered", "clean"],
            one_line: "A bitter adaptogenic beverage crafted from cold-climate botanicals.",
          },
        },
        {
          reader_id: 3,
          guess: {
            category: "Botanical focus tincture",
            audience: "Knowledge workers seeking stimulant alternatives",
            feel_words: ["remedial", "raw", "earthy", "austere"],
            one_line: "A pine-resin decoction offering clean cognitive endurance without jitters.",
          },
        },
      ],
      collisions: [
        { name: "BARK & TALLOW", nearest_brands: [{ brand: "Bark & Co", similarity_note: "Pet subscription company. Completely distinct sector." }], risk: "low" },
        { name: "KJELL", nearest_brands: [{ brand: "Kjell & Company", similarity_note: "Swedish electronics retailer. Geographic overlap in Nordics." }], risk: "medium" },
        { name: "ARCTIC HUMUS", nearest_brands: [{ brand: "Arctic Fox", similarity_note: "Hair dye brand." }], risk: "low" },
      ],
      spec: {
        banned_words: ["mindful", "clean", "vitality", "holistic", "pure", "elevating", "supercharge", "nature's magic", "smooth"],
        required_traits: ["Astringent honesty", "Phytochemical rigor", "Monastic calm"],
        voice_rules: [
          "State bitter taste without apology; never promise artificial sweetness.",
          "Ban all cheerful wellness buzzwords.",
          "Cite active botanical species and extraction methodology directly.",
        ],
        palette: [{ hex: "#1C241D" }, { hex: "#EBE5D8" }, { hex: "#B87333" }, { hex: "#7B3F00" }],
        contrast_min: 4.5,
        rounds: [
          { round: 1, attack: "Savor a deliciously refreshing burst of pure holistic forest energy!", slipped_through: true, new_rule: "Ban 'deliciously refreshing' and 'holistic energy'." },
          { round: 2, attack: "Elevate your daily mindfulness journey with nature's sweet adaptogens.", slipped_through: true, new_rule: "Ban 'mindfulness journey' and 'nature's sweet'." },
          { round: 3, attack: "A potent 0g sugar herbal decoction with heavy pine bitterness.", slipped_through: false, new_rule: "Passes requirement." },
        ],
      },
      brand_kit: {
        summary: SEED_2_BRIEF,
        direction: SEED_2_DIRECTIONS[0],
        scores: {
          direction_id: "dir-1",
          genericness: 26.5,
          genericness_breakdown: { embedding_sim: 21.0, cliche_hits: [], cliche_rate: 0.0 },
          perception_gap: 0.22,
          gap_breakdown: { category_match: 0.90, audience_match: 0.85, feel_match: 0.88 },
          pass: true,
        },
        spec: {
          banned_words: ["mindful", "clean", "vitality", "holistic", "pure", "elevating", "supercharge"],
          required_traits: ["Astringent honesty", "Phytochemical rigor"],
          voice_rules: ["State bitter taste without apology", "Ban all cheerful wellness buzzwords"],
          palette: [{ hex: "#1C241D" }, { hex: "#EBE5D8" }, { hex: "#B87333" }, { hex: "#7B3F00" }],
          contrast_min: 4.5,
          rounds: [],
        },
        launch: {
          landing_headline: "BITTER MEDICINE FOR QUIET THOUGHT.",
          subhead: "A zero-caffeine decoction of wild birch chaga, scots pine resin, and arctic bog roots. Unsweetened. Astringent. Formulated for 6 hours of unhurried, grounded focus without tremor or collapse.",
          one_line_pitch: "Wild Nordic pine and root brew for uncompromised cognitive stamina without caffeine.",
          social_posts: [
            "We spent two years testing cold-decoctions in the sub-arctic taiga. There is no sugar in this bottle. It tastes like cold pine heartwood and bitter bark. Drink it when you have four uninterrupted hours of deep work ahead.",
            "Caffeine borrows energy from tomorrow with high compound interest. BARK & TALLOW delivers triterpenic botanical endurance with zero nervous acceleration.",
          ],
        },
      },
    };
  }

  if (lower.includes("rain") || lower.includes("insurance") || lower.includes("courier") || lower.includes("gig") || lower.includes("weather")) {
    return {
      brief: SEED_3_BRIEF,
      generic_map: SEED_3_GENERIC_MAP,
      directions: SEED_3_DIRECTIONS,
      scores: {
        "dir-1": {
          direction_id: "dir-1",
          genericness: 22.8,
          genericness_breakdown: { embedding_sim: 17.5, cliche_hits: [], cliche_rate: 0.0 },
          perception_gap: 0.19,
          gap_breakdown: { category_match: 0.91, audience_match: 0.89, feel_match: 0.88 },
          pass: true,
        },
        "dir-2": {
          direction_id: "dir-2",
          genericness: 28.4,
          genericness_breakdown: { embedding_sim: 23.2, cliche_hits: [], cliche_rate: 0.0 },
          perception_gap: 0.24,
          gap_breakdown: { category_match: 0.85, audience_match: 0.82, feel_match: 0.86 },
          pass: true,
        },
        "dir-3": {
          direction_id: "dir-3",
          genericness: 34.0,
          genericness_breakdown: { embedding_sim: 28.1, cliche_hits: [], cliche_rate: 0.0 },
          perception_gap: 0.27,
          gap_breakdown: { category_match: 0.82, audience_match: 0.80, feel_match: 0.83 },
          pass: true,
        },
      },
      blind_reads: [
        {
          reader_id: 1,
          guess: {
            category: "Fintech / Parametric weather payout platform",
            audience: "Urban delivery couriers and outdoor workers",
            feel_words: ["kinetic", "urgent", "high-visibility", "algorithmic"],
            one_line: "An automated rain hedge that sends instant cash when torrential storms hit delivery routes.",
          },
        },
        {
          reader_id: 2,
          guess: {
            category: "Gig worker income stabilizer",
            audience: "Motorcycle and e-bike couriers",
            feel_words: ["sharp", "street-level", "mercenary", "rapid"],
            one_line: "Instant mobile payouts triggered by live radar precipitation thresholds.",
          },
        },
        {
          reader_id: 3,
          guess: {
            category: "Weather micro-insurance tool",
            audience: "Last-mile logistics drivers",
            feel_words: ["utilitarian", "accurate", "reliable", "hard-edged"],
            one_line: "Real-time downpour coverage delivering direct wallet deposits within seconds.",
          },
        },
      ],
      collisions: [
        { name: "RADARPAY", nearest_brands: [{ brand: "Radar.com", similarity_note: "Geofencing and location platform. Proximity in developer geo space." }], risk: "medium" },
        { name: "3MM", nearest_brands: [{ brand: "3M", similarity_note: "Global industrial conglomerate. Phonetically distinct but visually close." }], risk: "medium" },
        { name: "DOWNPOUR PROTOCOL", nearest_brands: [{ brand: "Downpour Games", similarity_note: "Indie game studio." }], risk: "low" },
      ],
      spec: {
        banned_words: ["delivery heroes", "peace of mind", "caring", "seamless", "reimagining", "safety net", "supercharge", "family"],
        required_traits: ["Algorithmic transparency", "Kinetic urgency", "Street-level directness"],
        voice_rules: [
          "Quote rain in mm/hr and Doppler radar telemetry; never use vague weather poetry.",
          "Ban the patronizing term 'delivery heroes'. Address couriers as professional fleet operators.",
          "State payout timing in exact seconds.",
        ],
        palette: [{ hex: "#0E1116" }, { hex: "#FFAA00" }, { hex: "#E6EDF3" }, { hex: "#5E35B1" }],
        contrast_min: 4.5,
        rounds: [
          { round: 1, attack: "We care about our delivery heroes and want to give them peace of mind in every shower!", slipped_through: true, new_rule: "Permanently ban 'delivery heroes' and 'peace of mind'." },
          { round: 2, attack: "Enjoy seamless smart insurance coverage for modern gig lifestyles.", slipped_through: true, new_rule: "Ban 'seamless' and 'smart insurance'." },
          { round: 3, attack: "3.2mm/hr precipitation registered at Sector 7. $25 payout deployed in 48 seconds.", slipped_through: false, new_rule: "Passes requirement." },
        ],
      },
      brand_kit: {
        summary: SEED_3_BRIEF,
        direction: SEED_3_DIRECTIONS[0],
        scores: {
          direction_id: "dir-1",
          genericness: 22.8,
          genericness_breakdown: { embedding_sim: 17.5, cliche_hits: [], cliche_rate: 0.0 },
          perception_gap: 0.19,
          gap_breakdown: { category_match: 0.91, audience_match: 0.89, feel_match: 0.88 },
          pass: true,
        },
        spec: {
          banned_words: ["delivery heroes", "peace of mind", "caring", "seamless"],
          required_traits: ["Algorithmic transparency", "Kinetic urgency"],
          voice_rules: ["Quote rain in mm/hr and Doppler radar telemetry", "Ban the term delivery heroes"],
          palette: [{ hex: "#0E1116" }, { hex: "#FFAA00" }, { hex: "#E6EDF3" }, { hex: "#5E35B1" }],
          contrast_min: 4.5,
          rounds: [],
        },
        launch: {
          landing_headline: "WHEN IT POURS, YOUR ACCOUNT FILLS.",
          subhead: "The moment precipitation exceeds 3.0mm/hr in your delivery sector, Doppler radar sends cash directly to your phone. Zero claims to file. Zero waiting. Zero adjusters.",
          one_line_pitch: "Automated rainfall wage defense that transfers cash to your phone the second downpours hit your delivery grid.",
          social_posts: [
            "Insurers take three weeks to approve a claim and look for reasons to deny it. RADARPAY connects Doppler weather radar directly to your mobile wallet. When the clouds dump 3mm/hr on your route, you get paid in under 90 seconds.",
            "You ride through storms while corporate platforms take their cut. RADARPAY is pure financial defense for wet asphalt.",
          ],
        },
      },
    };
  }

  // Default to Seed 1
  return {
    brief: SEED_1_BRIEF,
    generic_map: SEED_1_GENERIC_MAP,
    directions: SEED_1_DIRECTIONS,
    scores: SEED_1_SCORES,
    blind_reads: SEED_1_BLIND_READS,
    collisions: SEED_1_COLLISIONS,
    spec: SEED_1_SPEC,
    brand_kit: SEED_1_BRAND_KIT,
  };
}
