const express = require("express");

const router = express.Router();
const providers = {
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    envKey: "OPENROUTER_API_KEY",
    starterModels: ["openai/gpt-4o-mini", "meta-llama/llama-3.3-70b-instruct"]
  },
  nvidia: {
    label: "NVIDIA",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    envKey: "NVIDIA_API_KEY",
    starterModels: ["meta/llama-3.3-70b-instruct", "meta/llama-3.1-8b-instruct"]
  }
};

function getProvider(value) {
  return providers[String(value || "").toLowerCase()];
}

function getApiKey(provider) {
  return process.env[provider.envKey];
}

router.get("/models", async (req, res, next) => {
  try {
    const provider = getProvider(req.query.provider);
    if (!provider) return res.status(400).json({ error: "Choose OpenRouter or NVIDIA." });
    const apiKey = getApiKey(provider);
    if (!apiKey) {
      return res.status(503).json({
        error: `${provider.label} is not configured yet. Add ${provider.envKey} in your environment to refresh its live model list.`,
        starterModels: provider.starterModels
      });
    }

    const response = await fetch(`${provider.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) {
      const error = new Error(`${provider.label} could not load models (HTTP ${response.status}). Check the API key and try again.`);
      error.status = response.status === 401 ? 502 : 503;
      throw error;
    }
    const body = await response.json();
    const models = (body.data || []).map((model) => ({
      id: model.id,
      name: model.name || model.id,
      contextLength: model.context_length || null
    })).filter((model) => model.id);
    res.json({ models, starterModels: provider.starterModels });
  } catch (error) { next(error); }
});

router.post("/suggest", async (req, res, next) => {
  try {
    const providerName = String(req.body.provider || "").toLowerCase();
    const provider = getProvider(providerName);
    const model = typeof req.body.model === "string" ? req.body.model.trim() : "";
    const question = typeof req.body.question === "string" ? req.body.question.trim() : "";
    if (!provider) return res.status(400).json({ error: "Choose OpenRouter or NVIDIA." });
    if (!model || model.length > 200) return res.status(400).json({ error: "Choose a valid model." });
    if (!question || question.length > 3000) return res.status(400).json({ error: "Enter a question (up to 3,000 characters)." });
    const apiKey = getApiKey(provider);
    if (!apiKey) {
      return res.status(503).json({ error: `${provider.label} is not configured. Add ${provider.envKey} to the server environment.` });
    }

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(providerName === "openrouter" ? {
          "HTTP-Referer": process.env.APP_URL || "http://localhost:5173",
          "X-Title": "PawCare"
        } : {})
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 700,
        messages: [
          {
            role: "system",
            content: "You are a careful pet-care information assistant. Give general educational guidance, not a diagnosis or treatment plan. Never recommend medication dosing or changing prescribed treatment. Encourage contacting a licensed veterinarian for medical concerns, and advise urgent veterinary care for severe or rapidly worsening symptoms. Be clear, calm, and concise."
          },
          { role: "user", content: question }
        ]
      }),
      signal: AbortSignal.timeout(25000)
    });
    if (!response.ok) {
      const error = new Error(`${provider.label} request failed (HTTP ${response.status}). Check the selected model and API key.`);
      error.status = response.status === 401 ? 502 : 503;
      throw error;
    }
    const body = await response.json();
    const answer = body.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      return res.status(502).json({ error: `${provider.label} returned an empty response. Try a different model.` });
    }
    res.json({ answer, provider: provider.label, model });
  } catch (error) { next(error); }
});

module.exports = router;
