// Lokale pipeline-runner: draait ticks tot er geen werk meer open staat.
// Gebruik: npm run pipeline   (leest .env.local via Node's --env-file)
//
// Dit is exact dezelfde code als het /api/pipeline/tick-endpoint — alleen de
// aanroeper verschilt. Handig voor ontwikkeling en om 's avonds alvast een
// proef-editie te draaien.

import { tick } from "../modules/pipeline";

async function main() {
  console.log("Morning Report — pipeline-runner\n");

  let round = 0;
  for (;;) {
    round++;
    const result = await tick();

    if (result.editionsCreated > 0) {
      console.log(`✦ ${result.editionsCreated} editie(s) aangemaakt`);
    }
    for (const step of result.stepsRun) {
      const icon = step.status === "done" ? "✓" : "✗";
      console.log(`${icon} ${step.kind} (${step.ms}ms)${step.error ? ` — ${step.error}` : ""}`);
    }

    if (!result.pending) {
      console.log("\nKlaar — geen openstaande stappen meer.");
      break;
    }
    if (result.stepsRun.length === 0) {
      console.log("\nGeen claimbare stappen (alles geblokkeerd of max pogingen bereikt).");
      break;
    }
    if (round > 100) {
      console.log("\nGestopt na 100 rondes — check pipeline_steps op vastlopers.");
      break;
    }
  }
}

main().catch((err) => {
  console.error("Pipeline-runner gefaald:", err);
  process.exit(1);
});
