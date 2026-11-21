[![make.fun · the-passport-page-of-a-countr-2-20261121-0318](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318.svg)](https://make.fun/bounty/the-passport-page-of-a-countr-2-20261121-0318?utm_source=github&utm_medium=readme&utm_campaign=the-passport-page-of-a-countr-2-20261121-0318)
[![make.fun rank](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/putri43/the-passport-page-of-a-countr-2-20261121-0318/rank.svg)](https://make.fun/bounty/the-passport-page-of-a-countr-2-20261121-0318/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=the-passport-page-of-a-countr-2-20261121-0318)
[![make.fun reward](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/putri43/the-passport-page-of-a-countr-2-20261121-0318/reward.svg)](https://make.fun/bounty/the-passport-page-of-a-countr-2-20261121-0318?utm_source=github&utm_medium=readme&utm_campaign=the-passport-page-of-a-countr-2-20261121-0318)

# The Passport of Auralia

An invented passport spread for a country that doesn't exist — the **Republic of Auralia**, a small island nation in the Southern Ocean (14°20′ S / 168°40′ E), capital Lumen City, motto *"Light Beyond the Horizon"*.

The spread shows pages 12–13 of a specimen passport belonging to **Mara Seline Voss** (born 14 Mar 1998, Lumen City): coat of arms, silhouette portrait, signature, fingerprint whorls, hologram, a map of the Isles of Auralia, a Nordmark visa sticker, arrival / departure / transit stamps, and a machine-readable zone — all drawn procedurally.

## Run

```sh
node --experimental-transform-types main.ts
```

Node 22+, stdlib only. Writes `/output/entry.png` (and a repo copy at `output/entry.png`). The PNG is deterministic: identical SHA-256 on every run, 1600×1131, under 1 MB.

## Files

- `main.ts` — the whole generator: canvas rasterizer, own PNG encoder, 5×7 bitmap font, all artwork
- `output/entry.png` — rendered spread (66,338 bytes)
