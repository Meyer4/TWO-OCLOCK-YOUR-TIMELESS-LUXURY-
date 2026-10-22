import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fuzzyScore, levenshtein, tokenMatches, tokenize } from '../src/lib/fuzzy.js';

test('levenshtein distance', () => {
  assert.equal(levenshtein('rolex', 'rolex'), 0);
  assert.equal(levenshtein('rolx', 'rolex'), 1);
  assert.equal(levenshtein('', 'abc'), 3);
  assert.equal(levenshtein('kitten', 'sitting'), 3);
});

test('typos match close tokens but short words stay strict', () => {
  assert.equal(tokenMatches('rolx', 'rolex'), true);
  assert.equal(tokenMatches('sneekers', 'sneakers'), true);
  assert.equal(tokenMatches('watch', 'watches'), true); // prefix-tolerant
  assert.equal(tokenMatches('ab', 'ac'), false); // too short to allow typos
  assert.equal(tokenMatches('omega', 'seamaster'), false);
});

test('fuzzy score is the share of query tokens that match', () => {
  assert.equal(fuzzyScore('oyster chronometer', 'Oyster Chronometer 41 Meridian'), 1);
  assert.equal(fuzzyScore('oyster unknownword', 'Oyster Chronometer'), 0.5);
  assert.equal(fuzzyScore('', 'anything'), 0);
});

test('tokenize strips accents and punctuation', () => {
  assert.deepEqual(tokenize('Café-Élégant, 41mm!'), ['cafe', 'elegant', '41mm']);
});
