// Local fixture based on Google's generateContent REST contract, not an AI model.
const http = require("node:http");

http
  .createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (
      req.method !== "POST" ||
      req.url !== "/v1beta/models/gemini-flash-lite-latest:generateContent"
    ) {
      res.writeHead(501);
      return res.end(
        JSON.stringify({
          error: { code: 501, message: "Unmodelled endpoint" },
        }),
      );
    }
    const body = req.body;
    if (
      body?.contents?.length !== 5 ||
      !body.systemInstruction ||
      body.generationConfig?.responseMimeType !== "application/json" ||
      !body.generationConfig?.responseJsonSchema
    ) {
      res.writeHead(400);
      return res.end(
        JSON.stringify({
          error: { code: 400, message: "Invalid generation contract" },
        }),
      );
    }
    const prompt = body.contents[4].parts[0].text;
    if (prompt.includes("fixture:quota")) {
      res.writeHead(429);
      return res.end(
        JSON.stringify({
          error: {
            code: 429,
            status: "RESOURCE_EXHAUSTED",
            message: "Private provider error",
          },
        }),
      );
    }
    if (prompt.includes("fixture:server")) {
      res.writeHead(503);
      return res.end(
        JSON.stringify({
          error: {
            code: 503,
            status: "UNAVAILABLE",
            message: "Private provider error",
          },
        }),
      );
    }
    if (prompt.includes("fixture:html")) {
      res.writeHead(500, { "Content-Type": "text/html" });
      return res.end("<h1>Private provider error</h1>");
    }
    if (prompt.includes("fixture:timeout")) return;
    const review = {
      summary: "A blue bottle with identifying marks and a dated photo.",
      strengths: ["Initials and a dent distinguish the bottle."],
      improvements: ["Bring the existing photo for staff review."],
      readiness: "ready",
    };
    let text = JSON.stringify(review);
    if (prompt.includes("fixture:json")) text = "This is not JSON.";
    if (prompt.includes("fixture:schema"))
      text = JSON.stringify({ ...review, readiness: "approved" });
    const finishReason = prompt.includes("fixture:blocked") ? "SAFETY" : "STOP";
    res.end(
      JSON.stringify({
        candidates: [
          { content: { role: "model", parts: [{ text }] }, finishReason },
        ],
      }),
    );
  })
  .listen(process.env.PORT || 4901);
