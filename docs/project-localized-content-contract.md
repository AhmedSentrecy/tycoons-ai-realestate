# Localized project content contract

Version 1 content is stored inside the existing `projects.targeting` JSON object. Existing top-level `article_sections`, `faq`, and SEO fields remain unchanged as the Arabic legacy fallback.

```json
{
  "localized_content_version": 1,
  "localized_content": {
    "ar": {
      "h1": "...",
      "seo_title": "...",
      "seo_description": "...",
      "article_sections": [
        {
          "key": "overview",
          "heading": "...",
          "blocks": [
            { "type": "paragraph", "content": [{ "text": "..." }, { "text": "...", "href": "/ar/areas/new-cairo" }] },
            { "type": "subheading", "text": "..." },
            { "type": "ordered_list", "items": [[{ "text": "..." }]] }
          ]
        }
      ],
      "faq": [{ "question": "...", "answer": "..." }]
    },
    "en": { "h1": "...", "seo_title": "...", "seo_description": "...", "article_sections": [], "faq": [] }
  }
}
```

Only relative site paths beginning with one `/` and absolute `https://` links are retained. Text is rendered as text, never as raw HTML. Unknown block types and unsafe links are discarded. Locale data is selected independently; a missing locale continues to use the existing renderer fallback and canonical route.
