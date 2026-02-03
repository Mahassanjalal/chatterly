// Mock implementation of bad-words filter for testing
class Filter {
  private badWords: Set<string>;

  constructor() {
    // Simple set of bad words for testing
    this.badWords = new Set(['damn', 'shit', 'ass', 'crap', 'bastard', 'bitch']);
  }

  clean(text: string): string {
    if (!text) return '';
    
    let result = text;
    this.badWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      result = result.replace(regex, '*'.repeat(word.length));
    });
    return result;
  }

  isProfane(text: string): boolean {
    if (!text) return false;
    
    const lowerText = text.toLowerCase();
    for (const word of this.badWords) {
      // Use word boundary matching to avoid false positives (e.g., "hello" containing "hell")
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(lowerText)) {
        return true;
      }
    }
    return false;
  }

  addWords(...words: string[]): void {
    words.forEach(word => this.badWords.add(word.toLowerCase()));
  }
}

module.exports = Filter;
export default Filter;
