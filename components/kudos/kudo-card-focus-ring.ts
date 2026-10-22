/*
 * Keyboard focus ring for controls drawn on the cream Kudo card (--color-kudos-card #fff8e1). The site-wide ring colour
 * (login-accent #ffea9e) is only 1.13:1 against that cream, so on the card it is the ink colour (login-bg #00101a, about
 * 18:1; WCAG 1.4.11 asks for 3:1). Controls on dark surfaces (header, lightbox) keep FOCUS_RING.
 */
export const KUDO_CARD_FOCUS_RING = "outline-offset-2 focus-visible:outline-2 focus-visible:outline-login-bg";
