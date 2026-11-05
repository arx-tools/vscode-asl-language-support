import assert from 'node:assert/strict'
import test from 'node:test'
import { BINARY_LANGUAGE_ID, isAslFileName, needsAslLanguage } from '../../src/asl/language.ts'

void test('accepts the lowercase extension', () => {
  assert.equal(isAslFileName('dog.asl'), true)
  assert.equal(isAslFileName('/a/b/dog.asl'), true)
})

void test('accepts the uppercase extension of the original corpus', () => {
  assert.equal(isAslFileName('akbaa_phase1.ASL'), true)
  assert.equal(isAslFileName('DOG_0009.AsL'), true)
})

void test('rejects the other files', () => {
  assert.equal(isAslFileName('dog.asl.bak'), false)
  assert.equal(isAslFileName('asl'), false)
  assert.equal(isAslFileName('dog.txt'), false)
  assert.equal(isAslFileName('Untitled-1'), false)
})

void test('takes over the plain text and the binary documents', () => {
  assert.equal(needsAslLanguage('dog.asl', 'plaintext'), true)
  assert.equal(needsAslLanguage('dog.asl', BINARY_LANGUAGE_ID), true)
  assert.equal(needsAslLanguage('dog.asl', 'asl'), false)
  assert.equal(needsAslLanguage('dog.txt', 'plaintext'), false)
})
