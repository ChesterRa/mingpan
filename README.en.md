# Mingpan — Deterministic Chinese Metaphysics Calculator for AI Agents

**简体中文（主文档）** | English (this page) | [日本語](README.ja.md)

An open-source [MCP](https://modelcontextprotocol.io) calculation engine for traditional Chinese metaphysics — **BaZi, Zi Wei Dou Shu, LiuYao, MeiHua YiShu, Da Liu Ren, and Qi Men Dun Jia** — with calendar-grade rigor, so your AI agent can focus on interpretation. BaziWei also operates the official hosted service.

```text
https://mingpan.bzwai.com/mcp
```

Add this endpoint to any AI client that supports Remote MCP / Streamable HTTP. No Node.js installation or server deployment is required. Visit the [Mingpan open-source project site](https://mingpan.bzwai.com) for the capability overview and connection guide. The service is operated by [BaziWei](https://bzwai.com); the source and calculation conventions remain open here for inspection and collaboration.

For local development or data that must remain on-device, the stdio package remains available:

```json
{ "mcpServers": { "mingpan": { "command": "npx", "args": ["-y", "mingpan"] } } }
```

## The problem it solves

LLMs are unreliable at the computational half of Chinese divination: deriving ganzhi pillars from solar terms, converting between lunar and solar calendars, adjusting for timezones and true solar time. They hallucinate these values. Mingpan is the deterministic other half:

- **Deterministic-only output policy.** Every value a tool returns — four pillars, hidden stems, ten gods, na yin, life palace, palaces & stars, mutagens, hexagram lines — is a verifiable fact from classical lookup tables. Fortune scores, auspiciousness labels, and interpretive judgments are deliberately excluded: those belong to your AI.
- **Correctness discipline.** 300 tests including minute-level LiChun (Start of Spring) boundary cases, golden cases verified against historical records and classical texts, cross-validation against reference implementations, remote MCP boundary tests, and localized project-site contracts.
- **Timezone & true-solar-time aware.** IANA timezone input with historical DST handling (including China's 1986–1991 DST), longitude-based true solar time correction applied consistently to all four pillars. CI enforces cross-timezone reproducibility.
- **Hardened official service.** The stateless remote service does not store, cache, or log birth inputs or chart results, and enforces Host/Origin validation, request-size limits, and rate limiting.

## Tools (18)

| Domain | Tools | Notes |
|---|---|---|
| BaZi (Four Pillars) | `bazi_basic`, `bazi_dayun`, `bazi_liunian`, `bazi_liuyue`, `bazi_liuri` | Pillars w/ na yin, hidden stems & ten gods (all hidden stems), 12 growth stages, life palace & conception pillar, void; decade/year/month/day cycles |
| Zi Wei Dou Shu | `ziwei_basic`, `ziwei_daxian`, `ziwei_xiaoxian`, `ziwei_liunian`, `ziwei_liuyue`, `ziwei_liuri` | 12 palaces, stars & brightness, five-element bureau, soul/body masters, four transformations; time-cycle lists |
| LiuYao | `liuyao_basic` | Najia, six relatives, six spirits, ying/shi, void, hidden spirits, advance/retreat |
| MeiHua YiShu | `meihua_basic` | Time- or number-cast hexagrams, mutual/transformed, ti-yong relation |
| Da Liu Ren | `daliuren_basic` | Just supply a Gregorian time — seasonal general, pillars, four lessons, three transmissions, twelve generals |
| Qi Men Dun Jia | `qimen_basic`, `qimen_yongshen` | Rotating & flying styles, four pan types, chaibu/maoshan; yong-shen analysis with deterministic facts only |
| Calendar primitives | `jieqi_query`, `calendar_convert` | 24 solar terms to the second (AI's most-hallucinated value) · Solar↔lunar conversion with leap months |

## Example output (`bazi_basic`)

The chart text is Chinese by design (terms are canonical). Structure: birth data → four pillars with na yin → void → life palace & conception pillar → stem ten gods → hidden-stem ten gods → 12 growth stages.

```text
=== 命主資料 ===
性別：男
公曆：1992-04-12 07:30:00
農曆：壬申年三月初十辰時

=== 八字命盤 ===
年柱：壬申（剑锋金）  月柱：甲辰（覆灯火）  日柱：戊午（天上火）  時柱：丙辰（沙中土）
日柱旬空：子丑
命宮：己酉　胎元：乙未
天干十神：年干水=偏財　月干木=七殺　時干火=偏印
藏干十神（※本氣）：年申[庚食神※ 壬偏財 戊比肩]　月辰[戊比肩※ 乙正官 癸正財]　日午[丁正印※ 己劫財]　時辰[戊比肩※ 乙正官 癸正財]
十二長生（自坐）：年长生　月衰　日帝旺　時冠带
```

## Scope

Year range 1900–2100 · Beijing time (UTC+8) as internal canonical representation · interpretation intentionally left to the AI.

## Documentation

- [README（简体中文 · authoritative）](README.md) — full parameter reference, calendar conventions, version history

Apache-2.0 · This is a condensed edition; the Chinese README is the single source of truth. Last synced: **v0.1.7**
