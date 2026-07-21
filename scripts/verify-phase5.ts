// Throwaway Phase 5 verification: confirm the Tavily key works and grounding is
// shaped correctly — a live search returns real, attributed article text.
// Run: node --env-file=.env.local --import tsx scripts/verify-phase5.ts
import { config } from "../modules/shared/config";
import { tavilyEnabled, buildQuery, searchTavily, formatGroundingBlock } from "../modules/tavily";

async function main() {
  console.log("tavily enabled:", tavilyEnabled(), "| key set:", config.tavily.apiKey.length > 0);
  if (!tavilyEnabled()) {
    console.error("No TAVILY_API_KEY / grounding off — nothing to verify.");
    process.exit(1);
  }

  const query = buildQuery("Tesla Q2 deliveries", ["Tesla", "Elon Musk"]);
  console.log("\nquery:", query);

  const t0 = Date.now();
  const grounding = await searchTavily(query);
  console.log(`fetched ${grounding.snippets.length} snippets in ${Date.now() - t0}ms\n`);

  grounding.snippets.forEach((s, i) => {
    console.log(`[${i + 1}] ${s.title}`);
    console.log(`    ${s.url}`);
    console.log(`    ${s.content.length} chars: ${s.content.slice(0, 120).replace(/\s+/g, " ")}…\n`);
  });

  const block = formatGroundingBlock(grounding);
  console.log("--- grounding block (first 400 chars fed to the model) ---");
  console.log(block.slice(0, 400));

  if (grounding.snippets.length === 0) {
    console.error("\n⚠️  Zero snippets — key may be invalid or out of credits.");
    process.exit(1);
  }
  console.log("\n✅ Tavily grounding works.");
}

main();
