# 0009. SEO foundation: verify

Local (`npm run build && npm run start`):
- [ ] View source on `/`: title `Erskine Duenas | Software Engineer and Aspiring Architect`, home description, no "Created using NextJs" → AC-1
- [ ] View source on `/products`: title `Products | Erskine Duenas`, its description → AC-2
- [ ] Both pages: canonical is `https://erskine.vercel.app` and `https://erskine.vercel.app/products` → AC-3
- [ ] Both pages: `og:title`, `og:description`, `og:url`, `og:type`, `og:site_name`, `og:locale`, `og:image` (absolute, 1200x630, alt), `twitter:card=summary_large_image`, `twitter:image`; `/products` still has `og:site_name` and `og:locale` → AC-4
- [ ] Open the `og:image` URL from each page's source (hashed path such as `/opengraph-image-12o0cb`): 1200x630 PNG with name, role line, page headline, domain → AC-5
- [ ] `/sitemap.xml` lists exactly the two URLs, no `/studio` → AC-6
- [ ] `/robots.txt` allows all, points to the sitemap, no `/studio` → AC-7
- [ ] `/` has one `application/ld+json` script: `ProfilePage` → `Person` with `name`, `jobTitle`, `url`, `image`, `sameAs` (GitHub, LinkedIn); no email, phone, address; `/profile-image` returns a PNG → AC-8, AC-9
- [ ] `curl -I` on a studio page and on a studio route handler shows `X-Robots-Tag: noindex, nofollow`; studio pages still have the `noindex, nofollow` meta and no `og:image` or JSON-LD → AC-10
- [ ] `npm run lint` and `npm run build` (leak check included) pass; `/` and `/products` look unchanged in light and dark theme → AC-10, AC-11

After deploy (production URL):
- [ ] LinkedIn Post Inspector or opengraph.xyz shows the right card for `/` and `/products` → AC-5
- [ ] validator.schema.org: zero errors; Google Rich Results Test: Profile page detected → AC-8
