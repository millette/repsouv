# Astro Image Optimizations

## Images

Always use the `<Image />` component from `astro:assets` for local and remote images — it handles optimization and responsive sizing automatically.

### In Astro Components

```astro
---
import { Image } from 'astro:assets';
import heroImage from '@/assets/images/heroImage.png';
---

<Image
  src={heroImage}
  alt="Description of the image"
  width="1024"
  height="1024"
  class="w-full h-auto object-cover"
/>
```

> **Tip:** `width` and `height` are auto-inferred from the source image, but setting them explicitly is a powerful optimization. For example, if your source image is 10000×10000 but you only need 1024×1024, passing `width="1024" height="1024"` tells Astro to resize and convert to WebP at that size — drastically reducing the output file size.

### In Markdown Files

Use standard `![alt](src)` syntax. Local images in `src/` and remote images will be processed and optimized automatically. When responsive images are configured globally, these will also be responsive.

> **Note:** Images stored in the `public/` folder are **never** optimized.

```md
# My Markdown Page

![A starry night sky.](../assets/images/stars.png)
```

## SVG Components

Astro allows you to import `.svg` files and use them as Astro components. The SVG content is inlined into your HTML output.

```astro
---
import Logo from './path/to/svg/file.svg';
---

<Logo />
```

## Aspect Ratios

| Use Case         | Ratio   | Notes                          |
| ---------------- | ------- | ------------------------------ |
| Hero/banner      | `16:9`  | Full-width sections            |
| Blog featured    | `16:9`  | Open Graph / social sharing    |
| Service card     | `4:3`   | Inline content images          |
| Square thumbnail | `1:1`   | Grid layouts, testimonials     |
| Mobile hero      | `9:16`  | Portrait orientation           |
