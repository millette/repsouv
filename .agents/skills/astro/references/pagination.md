# Pagination

Astro's `paginate()` function splits large collections across multiple pages, generating static routes at build time.

---

## Basic example

File: `src/pages/astronauts/[page].astro`

```astro
---
export function getStaticPaths({ paginate }) {
  const astronauts = [
    { name: "Neil Armstrong" },
    { name: "Buzz Aldrin" },
    { name: "Sally Ride" },
    { name: "John Glenn" },
  ];
  return paginate(astronauts, { pageSize: 2 });
}

const { page } = Astro.props;
---

<h1>Page {page.currentPage} of {page.lastPage}</h1>
<ul>
  {page.data.map(({ name }) => <li>{name}</li>)}
</ul>

<!-- Navigation links -->
{page.url.prev && <a href={page.url.prev}>Previous</a>}
{page.url.next && <a href={page.url.next}>Next</a>}
```

This generates:
- `/astronauts/1` — Neil Armstrong, Buzz Aldrin
- `/astronauts/2` — Sally Ride, John Glenn

### The `page` prop

```ts
interface Page<T = any> {
  data: T[];           // current page's slice of data
  start: number;       // count of first item (from 0)
  end: number;         // count of last item (from 0)
  total: number;       // total number of results
  currentPage: number; // current page number (from 1)
  size: number;        // items per page (default: 10)
  lastPage: number;    // total number of pages
  url: {
    current: string;
    prev: string | undefined;
    next: string | undefined;
    first: string | undefined;
    last: string | undefined;
  };
}
```

### Nested pagination (by tag/category)

Combine pagination with other dynamic route params. File: `src/pages/[tag]/[page].astro`

```astro
---
import { getCollection } from 'astro:content';

export function getStaticPaths({ paginate }) {
  const tags = ["design", "development", "marketing"];

  return tags.flatMap(async (tag) => {
    const allPosts = await getCollection('blog', ({ data }) => data.status === 'published');
    const filtered = allPosts.filter((p) => p.data.tags.includes(tag));
    return paginate(filtered, { params: { tag }, pageSize: 10 });
  });
}

const { page } = Astro.props;
const { tag } = Astro.params;
---
```

Generates URLs like `/design/1`, `/design/2`, `/development/1`, `/marketing/1`.

---

## Tips

- For the first page, consider also creating `src/pages/posts/index.astro` that mirrors page 1 content or redirects to `/posts/1`.
- Use `pageSize` to control items per page — default is 10 for `paginate()`.
- For infinite scroll UX, use a framework component island with `client:visible` that fetches paginated data from an API endpoint.
