/**
 * Comprehensive written number parser for chapter detection
 * Handles ordinals, conjunctions, and various magnitudes
 */

interface NumberWords {
  ones: { [key: string]: number };
  teens: { [key: string]: number };
  tens: { [key: string]: number };
  hundreds: { [key: string]: number };
  magnitudes: { [key: string]: number };
  ordinals: { [key: string]: number };
}

const NUMBER_WORDS: NumberWords = {
  ones: {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9
  },
  teens: {
    'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
    'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19
  },
  tens: {
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90
  },
  hundreds: {
    'hundred': 100
  },
  magnitudes: {
    'thousand': 1000, 'million': 1000000, 'billion': 1000000000
  },
  ordinals: {
    'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
    'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
    'eleventh': 11, 'twelfth': 12, 'thirteenth': 13, 'fourteenth': 14, 'fifteenth': 15,
    'sixteenth': 16, 'seventeenth': 17, 'eighteenth': 18, 'nineteenth': 19, 'twentieth': 20,
    'twenty-first': 21, 'twenty-second': 22, 'twenty-third': 23, 'twenty-fourth': 24, 'twenty-fifth': 25,
    'twenty-sixth': 26, 'twenty-seventh': 27, 'twenty-eighth': 28, 'twenty-ninth': 29, 'thirtieth': 30,
    'thirty-first': 31, 'thirty-second': 32, 'thirty-third': 33, 'thirty-fourth': 34, 'thirty-fifth': 35,
    'thirty-sixth': 36, 'thirty-seventh': 37, 'thirty-eighth': 38, 'thirty-ninth': 39, 'fortieth': 40,
    'fiftieth': 50, 'sixtieth': 60, 'seventieth': 70, 'eightieth': 80, 'ninetieth': 90, 'hundredth': 100
  }
};

/**
 * Check if a text contains valid written numbers that could be chapter numbers
 */
export function containsWrittenChapterNumber(text: string): boolean {
  if (!text || text.length === 0) {
    return false;
  }

  const lowerText = text.toLowerCase().trim();
  
  // Remove common conjunctions and normalize separators
  const normalized = lowerText
    .replace(/\band\b/g, ' ') // Remove "and"
    .replace(/[-]/g, ' ') // Convert hyphens to spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .trim();

  const words = normalized.split(' ').filter(word => word.length > 0);
  
  if (words.length === 0) {
    return false;
  }

  // Check if all words are valid number words
  for (const word of words) {
    if (!isValidNumberWord(word)) {
      return false;
    }
  }

  // Basic structural validation
  return isValidNumberStructure(words);
}

/**
 * Check if a word is a valid number word
 */
function isValidNumberWord(word: string): boolean {
  return !!(
    NUMBER_WORDS.ones[word] ||
    NUMBER_WORDS.teens[word] ||
    NUMBER_WORDS.tens[word] ||
    NUMBER_WORDS.hundreds[word] ||
    NUMBER_WORDS.magnitudes[word] ||
    NUMBER_WORDS.ordinals[word]
  );
}

/**
 * Validate the structure of number words to prevent nonsense like "hundred hundred"
 */
function isValidNumberStructure(words: string[]): boolean {
  if (words.length === 0) {
    return false;
  }

  // Simple case: single number word
  if (words.length === 1) {
    return isValidNumberWord(words[0]);
  }

  // Complex case: validate ordering
  let hasHundreds = false;
  let hasTens = false;
  let hasOnes = false;
  let hasMagnitude = false;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    if (NUMBER_WORDS.ordinals[word]) {
      // Ordinals should generally be at the end or standalone
      return i === words.length - 1 || words.length === 1;
    }
    
    if (NUMBER_WORDS.magnitudes[word]) {
      if (hasMagnitude) return false; // No double magnitudes
      hasMagnitude = true;
    } else if (NUMBER_WORDS.hundreds[word]) {
      if (hasHundreds || hasTens || hasOnes) return false; // Hundreds must come first
      hasHundreds = true;
    } else if (NUMBER_WORDS.tens[word]) {
      if (hasTens || hasOnes) return false; // Tens before ones
      hasTens = true;
    } else if (NUMBER_WORDS.teens[word]) {
      if (hasTens || hasOnes) return false; // Teens don't combine with tens/ones
      hasTens = true; // Treat teens as tens for validation
    } else if (NUMBER_WORDS.ones[word]) {
      if (hasOnes) return false; // No double ones
      hasOnes = true;
    }
  }
  
  return true;
}

/**
 * Check if a text line could be a chapter heading with written numbers
 */
export function isWrittenNumberChapterHeading(text: string): boolean {
  if (!text || text.length === 0) {
    return false;
  }

  const trimmed = text.trim();
  
  // Pattern 1: "Chapter [Written Number]" or "[Written Number]"
  const chapterPattern = /^(?:Chapter\s+)?([A-Za-z\s\-]+?)(?:\s*[:.-]\s*.*)?$/i;
  const match = chapterPattern.exec(trimmed);
  
  if (!match) {
    return false;
  }
  
  const numberPart = match[1].trim();
  
  // Must be a reasonable length for a chapter number
  if (numberPart.length > 50) {
    return false;
  }
  
  return containsWrittenChapterNumber(numberPart);
}