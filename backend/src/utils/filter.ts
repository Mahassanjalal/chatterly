
// const { createRequire } = require('module');
// const requireModule = createRequire(__filename);

// const BadWords = requireModule('bad-words');

// export const filter = new BadWords();
import leoProfanity from 'leo-profanity';

leoProfanity.loadDictionary(); // Load default English dictionary

export const filter = {
  clean: (text: string) => leoProfanity.clean(text),
  isProfane: (text: string) => leoProfanity.check(text),
  addWords: (words: string[]) => leoProfanity.add(words),
};