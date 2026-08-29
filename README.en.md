# Mingpan — Deterministic Chinese Metaphysics Calculator for AI Agents

**简体中文（主文档）** | English (this page) | [日本語](README.ja.md)

An [MCP](https://modelcontextprotocol.io) server that computes traditional Chinese metaphysics charts — **BaZi, Zi Wei Dou Shu, LiuYao, MeiHua YiShu, Da Liu Ren, and Qi Men Dun Jia** — with calendar-grade rigor, so your AI agent can focus on what it does best: interpretation.

```json
{
  "mcpServers": {
    "mingpan": { "command": "npx", "args": ["-y", "mingpan"] }
  }
}
```

## The problem it solves

LLMs are unreliable at the computational half of Chinese divination: deriving ganzhi pillars from solar terms, converting between lunar and solar calendars, adjusting for timezones and true solar time. They hallucinate these values. Mingpan is the deterministic other half:

- **Deterministic-only output policy.** Every value a tool returns — four pillars, hidden stems, ten gods, na yin, life palace, palaces & stars, mutagens, hexagram lines — is a verifiable fact from classical lookup tables. Fortune scores, auspiciousness labels, and interpretive judgments are deliberately excluded: those belong to your AI.
- **Correctness discipline.** 218 tests including minute-level LiChun (Start of Spring) boundary cases, golden cases verified against historical records and classical texts, and cross-validation against reference implementations (lunar-javascript, iztro, kinqimen). All caliber decisions are documented in-repo.
- **Timezone & true-solar-time aware.** IANA timezone input with historical DST handling (including China's 1986–1991 DST), longitude-based true solar time correction applied consistently to all four pillars. CI enforces cross-timezone reproducibility.

## Tools (16)

| Domain | Tools | Notes |
|---|---|---|
| BaZi (Four Pillars) | `bazi_basic`, `bazi_dayun`, `bazi_liunian`, `bazi_liuyue`, `bazi_liuri` | Pillars w/ na yin, hidden stems & ten gods (all hidden stems), 12 growth stages, life palace & conception pillar, void; decade/year/month/day cycles |
| Zi Wei Dou Shu | `ziwei_basic`, `ziwei_daxian`, `ziwei_xiaoxian`, `ziwei_liunian`, `ziwei_liuyue`, `ziwei_liuri` | 12 palaces, stars & brightness, five-element bureau, soul/body masters, four transformations; time-cycle lists |
| LiuYao | `liuyao_basic` | Najia, six relatives, six spirits, ying/shi, void, hidden spirits, advance/retreat |
| MeiHua YiShu | `meihua_basic` | Time- or number-cast hexagrams, mutual/transformed, ti-yong relation |
| Da Liu Ren | `daliuren_basic` | Just supply a Gregorian time — seasonal general, pillars, four lessons, three transmissions, twelve generals |
| Qi Men Dun Jia | `qimen_basic`, `qimen_yongshen` | Rotating & flying styles, four pan types, chaibu/maoshan; yong-shen analysis with deterministic facts only |

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
- [`docs/qimen-correctness-notes.md`](docs/qimen-correctness-notes.md) — Qi Men caliber adjudications
- [`docs/product-roadmap.md`](docs/product-roadmap.md) — product principles & roadmap
- [`docs/release-notes-0.1.4.md`](docs/release-notes-0.1.4.md) — latest release notes

Apache-2.0 · This is a condensed edition; the Chinese README is the single source of truth. Last synced: **v0.1.4**
