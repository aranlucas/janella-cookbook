# janella-cookbook

Janella cookbook

## Setup

### AI Provider Configuration

This project uses **AI SDK V7** with the following providers:

1. **OpenRouter** (for recipe parsing) - Uses the free `xiaomi/mimo-v2-flash:free` model
   - Sign up at [openrouter.ai](https://openrouter.ai/)
   - Get your API key from the dashboard
   - Add `OPENROUTER_API_KEY` to your `.env` file

2. **OpenAI** (for embeddings)
   - Requires `OPENAI_API_KEY` in your `.env` file
   - Uses `text-embedding-3-small` model

### Installation

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set up your environment variables:

   ```bash
   cp .env.example .env
   # Edit .env and add:
   # - OPENROUTER_API_KEY for recipe parsing (free tier available)
   # - OPENAI_API_KEY for embeddings
   ```

3. Run the development server:
   ```bash
   pnpm run dev
   ```
