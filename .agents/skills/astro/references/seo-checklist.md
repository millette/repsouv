# SEO Checklist & Components Reference

## Table of Contents
1. [Head Component](#head-component)
2. [Per-Page Checklist](#per-page-checklist)
3. [Structured Data Templates](#structured-data-templates)
4. [Content Optimization Rules](#content-optimization-rules)
5. [Technical SEO](#technical-seo)

---

## Head Component

Create `src/components/Head.astro`:

```astro
---
interface Props {
  title: string;
  description: string;
  siteName?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  author?: string;
  publishDate?: string;
  modifiedDate?: string;
  tags?: string[];
  structuredData?: object;
  noindex?: boolean;
}

const {
  title,
  description,
  siteName,
  ogImage = '/og-default.png',
  ogType = 'website',
  canonicalUrl = new URL(Astro.url.pathname, Astro.site).toString(),
  author,
  publishDate,
  modifiedDate,
  tags = [],
  structuredData,
  noindex = false,
} = Astro.props;

const siteUrl = Astro.site?.toString() || '';
const fullOgImage = ogImage.startsWith('http') ? ogImage : new URL(ogImage, siteUrl).toString();
---

<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="generator" content={Astro.generator} />

<!-- Primary Meta -->
<title>{title}</title>
<meta name="description" content={description} />
{noindex && <meta name="robots" content="noindex, nofollow" />}

<!-- Canonical -->
<link rel="canonical" href={canonicalUrl} />

<!-- Open Graph -->
<meta property="og:type" content={ogType} />
<meta property="og:url" content={canonicalUrl} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={fullOgImage} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content={siteName} />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content={canonicalUrl} />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={fullOgImage} />

<!-- Article Metadata -->
{author && <meta name="author" content={author} />}
{publishDate && <meta property="article:published_time" content={publishDate} />}
{modifiedDate && <meta property="article:modified_time" content={modifiedDate} />}
{tags.map((tag) => <meta property="article:tag" content={tag} />)}

<!-- Favicon -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

<!-- Structured Data -->
{structuredData && (
  <script type="application/ld+json" set:html={JSON.stringify(structuredData)} />
)}
```

---

## Per-Page Checklist

Apply this to EVERY page you create. No exceptions.

### Title Tag
- Unique across the entire site
- Contains primary keyword, ideally near the start
- Under 60 characters
- Format: "Primary Keyword | Brand Name" or "Primary Keyword — Brand Name"
- Compelling to click — think of it as an ad headline

### Meta Description
- Unique across the entire site
- Contains primary keyword naturally
- Under 160 characters
- Includes a call to action or value proposition
- Written to increase click-through rate from search results

### URL Slug
- Short, descriptive, lowercase
- Contains primary keyword
- Uses hyphens, not underscores
- No stop words (the, a, an, of) unless they add clarity

### Heading Hierarchy
- Exactly ONE H1 per page — matches the page's main topic
- H1 contains the primary keyword
- H2s for major sections, H3s for subsections
- Never skip heading levels (no H1 → H3)
- Headings describe what the section is about (not "Section 1")

### Content
- First paragraph mentions the primary keyword naturally
- Minimum word counts: Home 500-1000, Service pages 800-1500, Blog posts 1500-3000
- Internal links to at least 2-3 other pages using descriptive anchor text
- External links to authoritative sources where relevant
- Short paragraphs (2-4 sentences), scannable structure
- Answers the search intent — what would someone searching this keyword want to know?

### Images
- Descriptive alt text on every image (include keywords where natural)
- Use Astro's `<Image>` component for automatic optimization
- Serve WebP format where possible
- Appropriate width/height to prevent layout shift
- Lazy load images below the fold

### Structured Data
- Every page gets at least one JSON-LD block
- Test validity: https://search.google.com/test/rich-results
- Fallback validator: https://validator.schema.org/

---

## Structured Data Templates

> **Tip:** The templates below use placeholder URLs like `https://yourdomain.com`. In practice, derive the domain dynamically from `Astro.site` so the data stays correct across environments:
> ```astro
> const siteUrl = Astro.site?.toString().replace(/\/$/, '') || 'https://yourdomain.com';
> ```
> Then use `siteUrl` to build absolute URLs in your JSON-LD objects.

### WebSite (home page)
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Business Name",
  "url": "https://yourdomain.com",
  "description": "Site description",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://yourdomain.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

### LocalBusiness (for local businesses)
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Business Name",
  "image": "https://yourdomain.com/logo.png",
  "url": "https://yourdomain.com",
  "telephone": "+1-555-123-4567",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main Street",
    "addressLocality": "Your City",
    "addressRegion": "Your State",
    "postalCode": "12345",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 40.7128,
    "longitude": -74.006
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "09:00",
      "closes": "17:30"
    }
  ],
  "priceRange": "$$"
}
```

### BlogPosting (blog posts)
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Article Title",
  "description": "Article description",
  "image": "https://yourdomain.com/images/post.jpg",
  "datePublished": "2026-03-26T00:00:00Z",
  "dateModified": "2026-03-26T00:00:00Z",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Business Name",
    "logo": {
      "@type": "ImageObject",
      "url": "https://yourdomain.com/logo.png"
    }
  }
}
```

### FAQPage (FAQ sections — great for featured snippets)
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What does your service cost?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our services start from..."
      }
    }
  ]
}
```

### Service (service pages)
```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Service Name",
  "description": "Service description",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Business Name"
  },
  "areaServed": {
    "@type": "City",
    "name": "Your City"
  },
  "serviceType": "Your Service Type"
}
```

### BreadcrumbList (for navigation breadcrumbs)
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://yourdomain.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Services",
      "item": "https://yourdomain.com/services"
    }
  ]
}
```

---

## Content Optimization Rules

### Keyword Placement Priority
1. Title tag
2. H1 heading
3. First 100 words of content
4. URL slug
5. Meta description
6. H2/H3 headings (secondary keywords)
7. Image alt text
8. Internal link anchor text

### Internal Linking Strategy
- Every page links to 2-3 other relevant pages minimum
- Use descriptive anchor text: "our emergency plumbing services" not "click here"
- Blog posts link to relevant service pages (and vice versa)
- Create pillar/cluster content: one main page linking to detailed sub-pages
- Navigation should surface your most important pages

### Local SEO Signals (for local businesses)
- NAP (Name, Address, Phone) consistent on every page, usually in footer
- Include city/region names in titles and content naturally
- Create "Areas We Serve" pages if targeting multiple locations
- Use LocalBusiness schema on every page
- Embed Google Maps on contact page

---

## Technical SEO

### Core Web Vitals Optimization
- Use `<Image>` component for all images (automatic lazy loading, format conversion)
- Minimize client-side JavaScript — use `client:visible` instead of `client:load` where possible
- Inline critical CSS (Astro does this automatically)
- Prefetch links for faster navigation: `<link rel="prefetch" href="/about" />`

### Internationalization (hreflang)
- Use `<link rel="alternate" hreflang="xx" href="..." />` for each language version
- Include `x-default` for the fallback/default language
- Every language version must reference all others (including itself)
- Use absolute URLs, not relative paths

```astro
<link rel="alternate" hreflang="en" href="https://yourdomain.com/en/page" />
<link rel="alternate" hreflang="fr" href="https://yourdomain.com/fr/page" />
<link rel="alternate" hreflang="x-default" href="https://yourdomain.com/en/page" />
```

### Canonical URLs
- Every page must have a canonical URL
- Self-referencing canonicals (page points to itself) are the default
- If content appears on multiple URLs, canonical should point to the preferred version

### Trailing Slashes
- **Always use trailing slashes** on internal links: `/about/` not `/about`
- `/about` and `/about/` are technically two different URLs. Inconsistent trailing slashes create duplicate content issues that hurt SEO
- Astro's `trailingSlash` config defaults to `'ignore'`. Set it to `'always'` in `astro.config.mjs` to enforce trailing slashes across all generated URLs:
  ```js
  export default defineConfig({
    trailingSlash: 'always',
  });
```
- Audit all `<a href>`, canonical URLs, sitemap entries, and `robots.txt` paths to ensure they all include trailing slashes consistently

### Sitemap
- Auto-generated by `@astrojs/sitemap`
- Exclude admin pages, API routes, and utility pages
- Verify after build: check `dist/sitemap-index.xml`

### robots.txt
- Allow all public pages
- Block CMS admin paths, API routes, and utility pages from crawlers
- Include sitemap URL
