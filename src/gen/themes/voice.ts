/** "a" or "an" before a trade name ("an electrician", "a plumber"). */
export const article = (word: string): string => (/^[aeiou]/i.test(word) ? 'an' : 'a')
