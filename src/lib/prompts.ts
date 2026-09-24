import fs from "fs";
import path from "path";

const PROMPTS_DIR = path.join(process.cwd(), "prompts");

// Prompt cache
const promptCache = new Map<string, string>();

export function getPrompt(name: string): string {
  if (promptCache.has(name)) {
    return promptCache.get(name)!;
  }

  const fileName = name.endsWith(".md") ? name : `${name}.md`;
  const filePath = path.join(PROMPTS_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt template not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  promptCache.set(name, content);
  return content;
}

export function renderPrompt(
  name: string,
  variables: Record<string, string | number | undefined | null>
): string {
  let template = getPrompt(name);

  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    template = template.replace(regex, val !== undefined && val !== null ? String(val) : "");
  }

  return template;
}
