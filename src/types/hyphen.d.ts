// The hyphen package ships no types; only the synchronous hyphenator is used.
declare module "hyphen/en-us" {
  export function hyphenateSync(
    text: string,
    options?: { hyphenChar?: string; minWordLength?: number },
  ): string;
}
