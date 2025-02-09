const messages = require('../lang/en/en.js');

class Utility {
  constructor() {
    // Using an array named 'dictionary' to store entries as objects { word, definition }
    this.dictionary = [];
  }

  getDate() {
    return new Date();
  }

  getTotalWords() {
    return this.dictionary.length;
  }

  addWord(word, definition) {
    // Add a new entry to the dictionary array
    this.dictionary.push({ word, definition });
  }

  wordExists(word) {
    // Check if the word already exists in the dictionary array
    return this.dictionary.some(entry => entry.word === word);
  }

  getDefinition(word) {
    // Search for the word and return its definition if found
    const entry = this.dictionary.find(entry => entry.word === word);
    return entry ? entry.definition : null;
  }
}

module.exports = Utility;
