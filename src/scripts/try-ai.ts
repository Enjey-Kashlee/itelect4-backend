import "dotenv/config";
import { reviewClaim } from "../ai/gemini";
import { EXAMPLES } from "../ai/prompt";

reviewClaim(EXAMPLES[0]!.prompt)
  .then((review) => console.log(JSON.stringify(review, null, 2)))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "AI review failed.");
    process.exitCode = 1;
  });
