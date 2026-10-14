export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "";

export const LANGUAGES = [
  { code: "english", name: "English" },
  { code: "tamil", name: "Tamil" },
  { code: "telugu", name: "Telugu" },
  { code: "kannada", name: "Kannada" },
  { code: "malayalam", name: "Malayalam" },
] as const;

export const PLATFORMS = [
  { value: "standalone", label: "Standalone" },
  { value: "sopzy", label: "SOPZY" },
  { value: "custom", label: "Custom" },
] as const;
