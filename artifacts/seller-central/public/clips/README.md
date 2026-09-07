# Background video

One full-bleed clip behind the sign-in, sign-up and onboarding screens.

`market-hero.mp4` — 18s, 960x540, ~4.4 MB, silent, loops.
`market-hero.jpg` — a frame from the same clip, used as the poster and as the still shown
instead of the video on a metered connection.

Lagos market women trading, by Shedrack Salami on Pexels:
https://www.pexels.com/video/lagos-market-women-trading-27165007/

Served from our own domain on purpose — the free video CDNs block hotlinking, which
would leave a dead black screen. The poster is local too, so nothing on these screens
depends on an outside host.

960x540 is deliberate. It is soft on a large desktop display but sits behind a scrim,
and 1280x720 costs far more. Buyers here are on metered mobile data. The component also
skips video entirely on data-saver or 2G/3G and shows the still.

To swap: replace the files, keep the names. To disable video: set `CLIPS_AVAILABLE = false`
in `src/components/commerce-background.tsx`.
