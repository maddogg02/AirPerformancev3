export const PERFORMANCE_CATEGORIES = [
  "Mission Execution",
  "Leading People", 
  "Improving Unit",
  "Managing Resources",
  "Personal Development"
] as const;

export const ACTION_SUGGESTIONS = [
  'Led', 'Executed', 'Developed', 'Improved', 'Managed', 'Trained', 
  'Implemented', 'Supported', 'Optimized', 'Resolved', 'Coordinated', 'Delivered'
];

export const IMPACT_OPTIONS = [
  {
    category: "Quantitative",
    values: ["increased by X%", "reduced by X%", "improved X metrics", "saved $X", "enhanced X operations"]
  },
  {
    category: "Operational", 
    values: ["streamlined X processes", "optimized X workflow", "enhanced mission readiness", "boosted efficiency"]
  },
  {
    category: "Personnel",
    values: ["developed X Airmen", "improved team morale", "enhanced training coverage", "strengthened leadership"]
  },
  {
    category: "Resources",
    values: ["saved X hours", "reduced operational costs", "optimized funding", "mitigated risks"]
  }
];

// Legacy for backward compatibility
export const IMPACT_SUGGESTIONS = IMPACT_OPTIONS.flatMap(category => category.values);

// Category tips
export const CATEGORY_TIPS = {
  'Mission Execution': "Tip: Focus on mission readiness, sorties, or capability gained.",
  'Leading People': "Tip: Focus on Airmen development, morale, or leadership impact.",
  'Improving Unit': "Tip: Focus on efficiency, compliance, or innovation.", 
  'Managing Resources': "Tip: Focus on money, time, manpower, or risk saved.",
  'Personal Development': "Tip: Focus on personal growth, training, or skill development."
};

export const MAX_STATEMENT_LENGTH = 350;

// Result templates by category
export const RESULT_TEMPLATES = {
  'Mission Execution': ["enabled sorties", "expanded operational capability", "increased mission readiness"],
  'Leading People': ["developed Airmen", "expanded training coverage", "improved team morale"],
  'Improving Unit': ["streamlined processes", "boosted training efficiency", "reduced errors"],
  'Managing Resources': ["saved resources", "optimized funding", "reduced operational costs"],
  'Personal Development': ["enhanced capabilities", "improved performance", "advanced career"]
};
