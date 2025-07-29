# AI Models for Joke of the Day

This app supports switching between AI models just by updating your `.env` file! Here are the supported models:

## Quick Model Switch

Just update `AI_GATEWAY_MODEL` in your `.env` file:

```bash
# Fast & Creative (Recommended for jokes)
AI_GATEWAY_MODEL=xai/grok-3-mini

# Balanced & Reliable
AI_GATEWAY_MODEL=openai/gpt-4o-mini

# Strong Reasoning
AI_GATEWAY_MODEL=google/gemini-2.0-flash-lite
```

## Available Models

### 🚀 XAI (Fast & Creative)
- `xai/grok-3-mini` - Quick, witty responses (great for jokes!)
- `xai/grok-beta` - Latest experimental features

### 🧠 Google (Strong Reasoning)
- `google/gemini-2.0-flash-lite` - Fast multimodal model
- `google/gemini-1.5-pro` - Advanced reasoning capabilities

### ⚡ OpenAI (Balanced & Reliable)
- `openai/gpt-4o` - Most capable model
- `openai/gpt-4o-mini` - Cost-effective, fast
- `openai/gpt-3.5-turbo` - Classic, reliable

### 🤖 Anthropic (Thoughtful & Detailed)
- `anthropic/claude-3-5-sonnet-20241022` - Excellent for nuanced responses

### 🌍 Meta (Open Source)
- `meta/llama-3.1-405b-instruct` - Large open-source model

## Custom Prompts

You can also customize the joke style by updating `AI_GATEWAY_PROMPT`:

```bash
# Programming jokes
AI_GATEWAY_PROMPT="Tell me a short, funny programming joke"

# Dad jokes
AI_GATEWAY_PROMPT="Tell me a clean dad joke"

# Tech industry humor
AI_GATEWAY_PROMPT="Tell me a funny joke about tech startups or Silicon Valley"

# Specific topics
AI_GATEWAY_PROMPT="Tell me a joke about databases or SQL"
```

## Environment Variables

```bash
# Required: Your Vercel AI Gateway API key
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key

# Model selection (change anytime!)
AI_GATEWAY_MODEL=xai/grok-3-mini

# Custom prompt (optional)
AI_GATEWAY_PROMPT="Tell me a short, funny programming joke"
```

## Testing Different Models

1. Update `.env` with your desired model
2. Restart your dev server
3. Refresh the page to get a new joke
4. Check the console logs to see which model was used

The app automatically handles caching, so jokes are stored with the model info for tracking which AI generated what!
