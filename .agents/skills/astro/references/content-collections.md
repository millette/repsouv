# Astro Content Collections Reference

## Table of Contents
1. [Setup](#setup)
2. [Defining Schemas](#defining-schemas)
3. [Creating Content](#creating-content)
4. [Querying Content](#querying-content)
5. [Dynamic Routes](#dynamic-routes)
6. [Advanced Patterns](#advanced-patterns)

---

## Setup

Content collections live in `src/content/`. Each subfolder is a collection.

**IMPORTANT (Astro v5+):** The config file MUST be at `src/content.config.ts` (NOT `src/content/config.ts`). The old `src/content/config.ts` location is legacy and will throw `LegacyContentConfigError`. Every collection MUST have a `loader` defined.

```
src/
├── content.config.ts    # Collection schemas (NOT in content/ folder!)
├── content/
│   ├── blog/
│   │   ├── first-post.md
│   │   └── second-post.md
│   ├── services/
│   │   ├── web-design.md
│   │   └── seo-audit.md
│   └── testimonials/
│       ├── alex-rivera.json
│       └── jordan-lee.json
```

## Defining Schemas

Create `src/content.config.ts` (in the `src/` root, NOT inside `src/content/`):

```typescript
import { z, defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';

const blogCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    image: z.image().optional(),
    imageAlt: z.string().optional(),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Site Author'),
    status: z.enum(['draft', 'published', 'archived']).default('published'),
    relatedPosts: z.array(reference('blog')).default([]),
  }),
});

const servicesCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    icon: z.string().optional(),
    order: z.number().default(0),
    featured: z.boolean().default(false),
  }),
});

const testimonialsCollection = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/testimonials' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    quote: z.string(),
    rating: z.number().min(1).max(5).default(5),
    image: z.image().optional(),
  }),
});

export const collections = {
  blog: blogCollection,
  services: servicesCollection,
  testimonials: testimonialsCollection,
};
```

## Creating Content

### Blog post (`src/content/blog/first-post.md`):
```markdown
---
title: "My First Blog Post"
description: "A short description for this post."
pubDate: 2026-03-26
image: "./first-post.jpg"
imageAlt: "Descriptive alt text"
tags: ["example", "tutorial"]
author: "Jane Smith"
status: "published"
---

# My First Blog Post

Your content here.
```

### Service page (`src/content/services/web-design.md`):
```markdown
---
title: "Web Design"
description: "Custom, responsive websites built for performance and accessibility."
icon: "Layout"
order: 1
featured: true
---

Content about the service.
```

### Testimonial (`src/content/testimonials/alex-rivera.json`):
```json
{
  "name": "Alex Rivera",
  "role": "Homeowner",
  "quote": "Called at 11pm on a Sunday and they were here in 30 minutes. Fixed the burst pipe and cleaned up. Couldn't ask for more.",
  "rating": 5
}
```

> Use realistic, creative names — avoid generic placeholders like "John Doe".

## Querying Content

### Get all posts (sorted by date):
```typescript
import { getCollection } from 'astro:content';

const posts = await getCollection('blog', ({ data }) => data.status === 'published');
const sorted = posts.sort(
  (a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime()
);
```

### Get a single entry:
```typescript
import { getEntry } from 'astro:content';

const post = await getEntry('blog', 'first-post');
const { Content } = await post.render();

// Access raw markdown body for excerpts/previews
const excerpt = post.body?.slice(0, 200) + '...';
```

### Get featured services:
```typescript
const services = await getCollection('services');
const featured = services
  .filter(s => s.data.featured)
  .sort((a, b) => a.data.order - b.data.order);
```

### Get testimonials:
```typescript
const testimonials = await getCollection('testimonials');
```

## Dynamic Routes

### Blog post pages (`src/pages/blog/[...slug].astro`):

```astro
---
import { getCollection } from 'astro:content';
import Layout from '@/layouts/Layout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => data.status === 'published');
  return posts.map((entry) => ({
    params: { slug: entry.slug },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await entry.render();

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: entry.data.title,
  description: entry.data.description,
  image: entry.data.image?.src,
  datePublished: entry.data.pubDate.toISOString(),
  dateModified: (entry.data.updatedDate || entry.data.pubDate).toISOString(),
  author: { '@type': 'Person', name: entry.data.author },
};
---

<Layout
  title={entry.data.title}
  description={entry.data.description}
  ogImage={entry.data.image?.src}
  ogType="article"
  structuredData={structuredData}
>
  <article class="max-w-3xl mx-auto px-4 py-12 prose prose-lg prose-zinc">
    <Content />
  </article>
</Layout>
```

### Service pages (`src/pages/services/[...slug].astro`):

```astro
---
import { getCollection } from 'astro:content';
import Layout from '@/layouts/Layout.astro';

export async function getStaticPaths() {
  const services = await getCollection('services');
  return services.map((entry) => ({
    params: { slug: entry.slug },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await entry.render();

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: entry.data.title,
  description: entry.data.description,
};
---

<Layout
  title={`${entry.data.title} | Your Business`}
  description={entry.data.description}
  structuredData={structuredData}
>
  <article class="max-w-4xl mx-auto px-4 py-12">
    <Content />
  </article>
</Layout>
```

## Advanced Patterns

### Collection references (relations between collections)

Use `reference()` to link entries across collections:

```typescript
import { z, defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';

const authorsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/authors' }),
  schema: z.object({
    name: z.string(),
    bio: z.string(),
    avatar: z.image().optional(),
  }),
});

const blogCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    // Reference an entry in the authors collection
    author: reference('authors'),
    // Reference multiple entries
    relatedPosts: z.array(reference('blog')).default([]),
  }),
});
```

In your frontmatter, reference by entry ID (the filename):

```markdown
---
title: "My Post"
author: "jane-smith"
relatedPosts: ["first-post", "second-post"]
---
```

### Image fields with `z.image()`

`z.image()` validates that the field points to an actual image file and returns an optimized image object:

```typescript
schema: z.object({
  // Local image — path relative to the content file or src/assets/
  cover: z.image(),
  // Optional gallery
  gallery: z.array(z.image()).default([]),
})
```

Access the optimized image in templates:

```astro
<Image src={entry.data.cover} alt={entry.data.imageAlt} />
```

### Accessing the raw markdown body

With glob loaders, `entry.body` contains the raw markdown string — useful for generating excerpts or search indices:

```typescript
const posts = await getCollection('blog');
const withExcerpts = posts.map((post) => ({
  ...post,
  excerpt: post.body?.slice(0, 200) + '...',
}));
```
