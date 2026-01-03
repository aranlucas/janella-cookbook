# janella-cookbook
Janella cookbook

## Setup

### AI Provider Configuration

This project uses **AI SDK V6** with the following providers:

1. **Claude Code** (for recipe parsing) - Uses the community provider [ai-sdk-provider-claude-code](https://github.com/ben-vargas/ai-sdk-provider-claude-code)
   - Requires CLI authentication: `claude login`
   - No API key needed in environment variables

2. **OpenAI** (for embeddings only)
   - Requires `OPENAI_API_KEY` in your `.env` file

### Installation

1. Install Claude Code CLI globally and authenticate:
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude login
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY for embeddings
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

