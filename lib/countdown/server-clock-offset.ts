/** Offset to add to the client clock to get server time. */
export function getClockOffsetMs(serverNowMs: number, clientNowMs: number): number {
  return serverNowMs - clientNowMs;
}

export function getCorrectedNowMs(offsetMs: number, clientNowMs: number): number {
  return clientNowMs + offsetMs;
}
