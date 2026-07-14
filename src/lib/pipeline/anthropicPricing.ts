// Rough cost estimate for the admin dashboard, based on claude-sonnet-5
// pricing. These are approximate and should be checked against Anthropic's
// current published pricing (console.anthropic.com) if it changes.
const SONNET_INPUT_PER_MILLION_TOKENS = 3;
const SONNET_OUTPUT_PER_MILLION_TOKENS = 15;
const WEB_SEARCH_PER_1000_USES = 10;

export function estimateCostUsd(
  inputTokens: number,
  outputTokens: number,
  webSearches: number,
): number {
  const tokenCost =
    (inputTokens / 1_000_000) * SONNET_INPUT_PER_MILLION_TOKENS +
    (outputTokens / 1_000_000) * SONNET_OUTPUT_PER_MILLION_TOKENS;
  const searchCost = (webSearches / 1000) * WEB_SEARCH_PER_1000_USES;
  return tokenCost + searchCost;
}
