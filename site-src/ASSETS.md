# Homepage content and art

The site is built from this directory by `scripts/build-site.mjs`; do not edit
the generated `site/` directory. No new framework, font download, analytics,
WebGL runtime or third-party asset host is required.

## Shared BaziWei family art

`assets/time-atlas.webp` (253,948 bytes) and `time-atlas-mobile.webp` (114,450 bytes)
are project-maintained AI-generated brand artwork: engraved jade relief,
bronze time paths and an open junction. The mobile image is a separately composed
companion, not a cropped factual chart. The image has no lettering, interface,
star placements or calculation claims. All functional content is HTML.

They were prepared with OpenAI image generation during the joint BaziWei
homepage design work and exported to WebP. Full prompts and original renders
are maintained by the parent-brand design owner in the BaziWei repository at
`docs/design/homepage/assets/time-atlas.md`; this site ships only the two final
assets. These assets follow this repository's Apache-2.0 license. Do not copy
the parent's private reports, credentials or application assets into this site.

The endpoint panel, copper-edged input/output spread and numbered principles
apply the same family language to a different task: connect a calculation tool.
Each site ships its own image files; neither depends on the other at runtime.

## Real output, not illustrative AI copy

`example.json` contains a saved official remote MCP response for a fictional
1990-05-15 10:00 male birth in `Asia/Taipei`, plus its endpoint and version.
The site prints the original Chinese `bazi_basic` and `ziwei_basic` responses
unchanged in all four interfaces. It does not infer or translate a reading.

`test/site-assets.test.ts` repeats both calls through the current in-memory MCP
server and compares the full text. A calculation change must not silently make
the public example stale: recapture with the same public input, review the
difference and update the source artifact together. Do not use visitor data or
perform live tool calls on page load. Clipboard success is not connection proof.
