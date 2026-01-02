# Cookbook Website Specification

## Project Overview

A modern, personal cookbook web application built with Next.js and shadcn/ui that allows users to collect, organize, and discover recipes. The application emphasizes intelligent semantic search powered by embeddings, enabling natural language queries like "quick weeknight Italian dishes" or "recipes with ingredients I have."

---

## Design Direction

### Aesthetic: **Warm Editorial Kitchen**

- **Tone**: Refined, inviting, and slightly nostalgic—like a well-loved cookbook with modern touches
- **Typography**: 
  - Display: **Playfair Display** (elegant serif for headings)
  - Body: **Source Sans 3** (clean, readable sans-serif)
- **Color Palette**:
  ```
  --cream: #FDF8F3
  --warm-white: #FEFCFA
  --charcoal: #2D2D2D
  --terracotta: #C4704F
  --sage: #8B9A7D
  --butter: #E8D5B7
  --rust-accent: #A85D3C
  ```
- **Visual Elements**: Subtle paper textures, soft shadows, recipe card metaphors, ingredient illustrations as decorative accents

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| UI Components | shadcn/ui |
| Styling | Tailwind CSS |
| Database | PostgreSQL with Prisma ORM |
| Vector Search | pgvector extension |
| Embeddings | OpenAI `text-embedding-3-small` |
| Authentication | NextAuth.js (optional, for multi-user) |
| Deployment | Vercel / Cloudflare |
| File Storage | Cloudflare R2 / S3 (recipe images) |

---

## Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

model Recipe {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Core fields
  title       String
  slug        String   @unique
  description String?
  
  // Recipe content
  ingredients   Ingredient[]
  instructions  Instruction[]
  
  // Metadata
  prepTime      Int?          // minutes
  cookTime      Int?          // minutes
  totalTime     Int?          // minutes
  servings      String?
  difficulty    Difficulty    @default(MEDIUM)
  
  // Categorization
  cuisine       String?
  course        Course?
  tags          Tag[]
  
  // Source tracking
  sourceUrl     String?
  sourceType    SourceType
  
  // Media
  imageUrl      String?
  images        RecipeImage[]
  
  // Search
  embedding     Unsupported("vector(1536)")?
  searchText    String?       // Concatenated searchable text
  
  // User interaction
  notes         String?
  rating        Int?          // 1-5
  isFavorite    Boolean       @default(false)
  cookCount     Int           @default(0)
  lastCooked    DateTime?
  
  @@index([slug])
  @@index([cuisine])
  @@index([course])
  @@index([isFavorite])
}

model Ingredient {
  id         String  @id @default(cuid())
  recipeId   String
  recipe     Recipe  @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  
  quantity   String?
  unit       String?
  name       String
  notes      String?   // "finely diced", "optional"
  group      String?   // "For the sauce", "For the crust"
  sortOrder  Int       @default(0)
  
  @@index([recipeId])
}

model Instruction {
  id         String  @id @default(cuid())
  recipeId   String
  recipe     Recipe  @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  
  stepNumber Int
  text       String
  duration   Int?      // minutes for this step
  imageUrl   String?
  
  @@index([recipeId])
}

model Tag {
  id      String   @id @default(cuid())
  name    String   @unique
  slug    String   @unique
  recipes Recipe[]
}

model RecipeImage {
  id        String  @id @default(cuid())
  recipeId  String
  recipe    Recipe  @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  url       String
  alt       String?
  isPrimary Boolean @default(false)
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
  EXPERT
}

enum Course {
  BREAKFAST
  LUNCH
  DINNER
  APPETIZER
  SIDE
  DESSERT
  SNACK
  DRINK
  SAUCE
  BREAD
}

enum SourceType {
  URL_IMPORT      // Imported from external URL
  MANUAL          // Manually entered
  NATURAL_LANGUAGE // Parsed from text/AI
  PHOTO           // OCR from photo
  API             // External recipe API
}
```

---

## API Routes

### Recipe CRUD

```
GET    /api/recipes              - List all recipes (paginated)
GET    /api/recipes/[slug]       - Get single recipe
POST   /api/recipes              - Create recipe
PUT    /api/recipes/[id]         - Update recipe
DELETE /api/recipes/[id]         - Delete recipe
```

### Search (Primary Feature)

```
POST   /api/search
```

**Request Body:**
```typescript
interface SearchRequest {
  query: string;              // Natural language query
  filters?: {
    cuisine?: string[];
    course?: Course[];
    difficulty?: Difficulty[];
    maxTime?: number;         // Max total time in minutes
    tags?: string[];
    isFavorite?: boolean;
  };
  limit?: number;             // Default 20
  offset?: number;
}
```

**Response:**
```typescript
interface SearchResponse {
  results: {
    recipe: Recipe;
    score: number;            // Similarity score 0-1
    highlights?: string[];    // Matched text snippets
  }[];
  total: number;
  query: string;
  suggestedFilters?: string[]; // "Try filtering by: Italian, Under 30 min"
}
```

**Search Implementation:**
```typescript
// lib/search.ts

import { OpenAI } from 'openai';
import { prisma } from './prisma';

const openai = new OpenAI();

export async function semanticSearch(
  query: string,
  filters: SearchFilters = {},
  limit = 20
) {
  // 1. Generate embedding for the query
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  
  const queryEmbedding = embeddingResponse.data[0].embedding;
  
  // 2. Build filter conditions
  const whereConditions = buildWhereClause(filters);
  
  // 3. Perform vector similarity search with filters
  const results = await prisma.$queryRaw`
    SELECT 
      r.*,
      1 - (r.embedding <=> ${queryEmbedding}::vector) as similarity
    FROM "Recipe" r
    WHERE r.embedding IS NOT NULL
    ${whereConditions}
    ORDER BY r.embedding <=> ${queryEmbedding}::vector
    LIMIT ${limit}
  `;
  
  // 4. Enhance with keyword highlighting
  return enhanceResults(results, query);
}

// Hybrid search: combine semantic + keyword
export async function hybridSearch(query: string, filters: SearchFilters) {
  const [semanticResults, keywordResults] = await Promise.all([
    semanticSearch(query, filters),
    keywordSearch(query, filters),
  ]);
  
  // Reciprocal Rank Fusion to combine results
  return fuseResults(semanticResults, keywordResults);
}
```

### Recipe Import

```
POST   /api/import/url           - Import from URL
POST   /api/import/text          - Parse natural language
POST   /api/import/image         - OCR from photo (future)
```

**URL Import Implementation:**
```typescript
// app/api/import/url/route.ts

import { parseRecipeFromUrl } from '@/lib/recipe-parser';
import { generateEmbedding } from '@/lib/embeddings';

export async function POST(req: Request) {
  const { url } = await req.json();
  
  // 1. Fetch and parse recipe from URL
  const parsedRecipe = await parseRecipeFromUrl(url);
  
  // 2. Generate searchable text
  const searchText = generateSearchText(parsedRecipe);
  
  // 3. Generate embedding
  const embedding = await generateEmbedding(searchText);
  
  // 4. Save to database
  const recipe = await prisma.recipe.create({
    data: {
      ...parsedRecipe,
      sourceUrl: url,
      sourceType: 'URL_IMPORT',
      searchText,
      embedding,
    },
  });
  
  return Response.json({ recipe });
}

// lib/recipe-parser.ts
export async function parseRecipeFromUrl(url: string) {
  const response = await fetch(url);
  const html = await response.text();
  
  // Strategy 1: Look for JSON-LD structured data
  const jsonLd = extractJsonLd(html);
  if (jsonLd?.['@type'] === 'Recipe') {
    return parseJsonLdRecipe(jsonLd);
  }
  
  // Strategy 2: Use AI to extract recipe
  return extractRecipeWithAI(html, url);
}

async function extractRecipeWithAI(html: string, url: string) {
  const cleanedText = extractMainContent(html);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: `Extract recipe data from this webpage content. Return JSON with:
        - title
        - description
        - ingredients (array of { quantity, unit, name, notes })
        - instructions (array of { stepNumber, text })
        - prepTime, cookTime (in minutes)
        - servings
        - cuisine
        - course`
    }, {
      role: 'user',
      content: cleanedText.slice(0, 8000)
    }],
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

**Natural Language Import:**
```typescript
// app/api/import/text/route.ts

export async function POST(req: Request) {
  const { text } = await req.json();
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: `Parse this recipe text into structured JSON format...`
    }, {
      role: 'user',
      content: text
    }],
    response_format: { type: 'json_object' }
  });
  
  const parsed = JSON.parse(response.choices[0].message.content);
  
  // Generate embedding and save
  const searchText = generateSearchText(parsed);
  const embedding = await generateEmbedding(searchText);
  
  const recipe = await prisma.recipe.create({
    data: {
      ...parsed,
      sourceType: 'NATURAL_LANGUAGE',
      searchText,
      embedding,
    },
  });
  
  return Response.json({ recipe });
}
```

### Tags & Filters

```
GET    /api/tags                 - List all tags with recipe counts
GET    /api/cuisines             - List cuisines with counts
GET    /api/filters              - Get all available filter options
```

---

## Page Structure

### 1. Landing Page (`/`)

**Purpose**: Browse and discover recipes

**Components**:
- Hero section with search bar (prominent)
- Quick filter chips (Favorites, Quick Meals, Recently Added)
- Recipe grid with infinite scroll
- Sidebar filters (desktop)

**Features**:
- Real-time search as you type
- Filter by cuisine, course, time, difficulty
- Sort by: Recent, Popular, Rating, Quick to make
- Masonry or grid layout toggle

```typescript
// app/page.tsx

export default async function HomePage({
  searchParams
}: {
  searchParams: { q?: string; cuisine?: string; course?: string }
}) {
  const filters = parseFilters(searchParams);
  
  const recipes = searchParams.q
    ? await semanticSearch(searchParams.q, filters)
    : await getRecentRecipes(filters);
    
  return (
    <main className="min-h-screen bg-cream">
      <HeroSearch />
      <FilterBar />
      <RecipeGrid recipes={recipes} />
    </main>
  );
}
```

### 2. Recipe Detail Page (`/recipe/[slug]`)

**Purpose**: View full recipe

**Layout**:
```
+----------------------------------+
|  [← Back]           [Edit] [⭐]  |
+----------------------------------+
|                                  |
|  [Recipe Image - Full Width]     |
|                                  |
+----------------------------------+
|  Title                           |
|  Description                     |
|  ⏱ 30 min | 🍽 4 servings | ⭐⭐⭐ |
+----------------------------------+
|                                  |
|  INGREDIENTS  |  INSTRUCTIONS    |
|  (sticky)     |                  |
|               |  1. First step   |
|  • 2 cups     |                  |
|  • 1 tbsp     |  2. Second step  |
|               |                  |
+----------------------------------+
|  Tags: Italian, Pasta, Quick     |
+----------------------------------+
|  Notes (editable)                |
|  Source: example.com             |
+----------------------------------+
```

**Features**:
- Sticky ingredients panel (desktop)
- Checkbox ingredients (client-side)
- Step-by-step mode with timers
- Scaling calculator
- Print-friendly view
- Share functionality

### 3. Add Recipe Page (`/add`)

**Purpose**: Multiple ways to add recipes

**Tabs/Modes**:
1. **Import from URL** (default)
   - Paste URL input
   - Preview parsed recipe before saving
   - Edit any field

2. **Write it out**
   - Natural language textarea
   - "Paste your recipe from anywhere"
   - AI parses and structures

3. **Manual Entry**
   - Full form with all fields
   - Dynamic ingredient/instruction lists
   - Image upload

```typescript
// app/add/page.tsx

export default function AddRecipePage() {
  return (
    <main className="container max-w-3xl py-12">
      <h1 className="text-3xl font-playfair mb-8">Add a Recipe</h1>
      
      <Tabs defaultValue="url">
        <TabsList>
          <TabsTrigger value="url">From URL</TabsTrigger>
          <TabsTrigger value="text">Paste Text</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>
        
        <TabsContent value="url">
          <UrlImportForm />
        </TabsContent>
        
        <TabsContent value="text">
          <TextImportForm />
        </TabsContent>
        
        <TabsContent value="manual">
          <ManualRecipeForm />
        </TabsContent>
      </Tabs>
    </main>
  );
}
```

### 4. Search Page (`/search`)

**Purpose**: Advanced search experience

**Features**:
- Large search input with suggestions
- Real-time results as you type (debounced)
- Highlighted matching text
- Advanced filters panel
- Search history
- Suggested queries

**Search UX Flow**:
```
1. User types: "easy chicken dinner under 30 minutes"
2. Debounce 300ms
3. Generate embedding for query
4. Query pgvector with filters
5. Display results with relevance scores
6. Show "Related searches" and filter suggestions
```

### 5. Edit Recipe Page (`/recipe/[slug]/edit`)

**Purpose**: Modify existing recipes

- Same form as manual entry, pre-filled
- Track changes history (optional)
- Delete recipe with confirmation

---

## Key Components (shadcn/ui)

```
components/
├── ui/                    # shadcn base components
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── tabs.tsx
│   ├── badge.tsx
│   ├── checkbox.tsx
│   ├── select.tsx
│   ├── slider.tsx
│   ├── skeleton.tsx
│   └── ...
├── recipe/
│   ├── recipe-card.tsx        # Grid card preview
│   ├── recipe-grid.tsx        # Responsive grid layout
│   ├── recipe-detail.tsx      # Full recipe view
│   ├── ingredient-list.tsx    # Checkable ingredients
│   ├── instruction-steps.tsx  # Step-by-step view
│   ├── recipe-meta.tsx        # Time, servings, difficulty
│   └── recipe-actions.tsx     # Favorite, edit, delete
├── search/
│   ├── search-bar.tsx         # Main search input
│   ├── search-results.tsx     # Results list
│   ├── filter-panel.tsx       # Sidebar filters
│   ├── filter-chips.tsx       # Quick filter badges
│   └── search-suggestions.tsx # Autocomplete
├── forms/
│   ├── url-import-form.tsx
│   ├── text-import-form.tsx
│   ├── manual-recipe-form.tsx
│   ├── ingredient-input.tsx   # Dynamic list
│   └── instruction-input.tsx  # Dynamic list
└── layout/
    ├── header.tsx
    ├── sidebar.tsx
    └── footer.tsx
```

---

## Embedding Strategy

### What Gets Embedded

Create a composite search text for each recipe:

```typescript
function generateSearchText(recipe: Recipe): string {
  return [
    recipe.title,
    recipe.description,
    recipe.cuisine,
    recipe.course,
    recipe.tags?.join(' '),
    recipe.ingredients.map(i => i.name).join(' '),
    recipe.instructions.map(i => i.text).join(' '),
    // Add semantic hints
    recipe.totalTime && recipe.totalTime < 30 ? 'quick fast easy' : '',
    recipe.difficulty === 'EASY' ? 'simple beginner' : '',
    recipe.difficulty === 'EXPERT' ? 'advanced chef professional' : '',
  ].filter(Boolean).join(' ');
}
```

### When to Regenerate

- On recipe create
- On recipe update (debounced)
- Batch job for re-indexing

### Search Query Enhancement

```typescript
async function enhanceSearchQuery(query: string): Promise<string> {
  // Expand abbreviations and synonyms
  const expansions: Record<string, string> = {
    'quick': 'quick fast easy under 30 minutes',
    'healthy': 'healthy light low-calorie nutritious',
    'comfort food': 'comfort food hearty warming cozy',
  };
  
  let enhanced = query;
  for (const [term, expansion] of Object.entries(expansions)) {
    if (query.toLowerCase().includes(term)) {
      enhanced = enhanced.replace(term, expansion);
    }
  }
  
  return enhanced;
}
```

---

## Environment Variables

```env
# .env.local

# Database
DATABASE_URL="postgresql://user:pass@host:5432/cookbook?schema=public"

# OpenAI for embeddings and parsing
OPENAI_API_KEY="sk-..."

# Optional: Image storage
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="cookbook-images"

# Optional: Auth
NEXTAUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"
```

---

## Implementation Phases

### Phase 1: Core MVP
- [ ] Database setup with Prisma + pgvector
- [ ] Basic CRUD API routes
- [ ] Landing page with recipe grid
- [ ] Recipe detail page
- [ ] Manual recipe entry form
- [ ] Basic keyword search

### Phase 2: Smart Import
- [ ] URL import with JSON-LD parsing
- [ ] AI-powered URL content extraction
- [ ] Natural language recipe parsing
- [ ] Preview and edit before save

### Phase 3: Semantic Search
- [ ] OpenAI embeddings integration
- [ ] Vector search implementation
- [ ] Hybrid search (semantic + keyword)
- [ ] Search suggestions and filters
- [ ] Search result highlighting

### Phase 4: Enhanced UX
- [ ] Ingredient checkbox state
- [ ] Recipe scaling calculator
- [ ] Print-friendly styles
- [ ] Favorites and collections
- [ ] Recipe notes
- [ ] Cook count tracking

### Phase 5: Polish
- [ ] Image upload and optimization
- [ ] Share functionality
- [ ] PWA support (offline recipes)
- [ ] Recipe export (PDF, share link)
- [ ] Analytics and popular recipes

---

## File Structure

```
cookbook/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                 # Landing/home
│   ├── search/
│   │   └── page.tsx             # Search page
│   ├── add/
│   │   └── page.tsx             # Add recipe
│   ├── recipe/
│   │   └── [slug]/
│   │       ├── page.tsx         # Recipe detail
│   │       └── edit/
│   │           └── page.tsx     # Edit recipe
│   └── api/
│       ├── recipes/
│       │   ├── route.ts         # GET, POST
│       │   └── [id]/
│       │       └── route.ts     # GET, PUT, DELETE
│       ├── search/
│       │   └── route.ts
│       ├── import/
│       │   ├── url/
│       │   │   └── route.ts
│       │   └── text/
│       │       └── route.ts
│       └── tags/
│           └── route.ts
├── components/
│   ├── ui/                      # shadcn components
│   ├── recipe/
│   ├── search/
│   ├── forms/
│   └── layout/
├── lib/
│   ├── prisma.ts                # Prisma client
│   ├── search.ts                # Search utilities
│   ├── embeddings.ts            # OpenAI embeddings
│   ├── recipe-parser.ts         # URL/text parsing
│   └── utils.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   └── fonts/
├── styles/
│   └── globals.css
├── types/
│   └── recipe.ts
└── package.json
```

---

## Example Search Queries

The semantic search should handle these naturally:

| Query | Expected Behavior |
|-------|-------------------|
| "quick weeknight dinner" | Recipes under 30 min, dinner course |
| "something with chicken and lemon" | Ingredient matching |
| "Italian grandma style" | Cuisine + comfort/traditional |
| "healthy meal prep" | Light, batch-cookable recipes |
| "impressive dinner party" | Higher difficulty, elegant dishes |
| "what can I make with eggs and cheese" | Ingredient-based discovery |
