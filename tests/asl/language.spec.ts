import assert from 'node:assert/strict'
import test from 'node:test'
import { isAslFileName } from '../../src/asl/language.ts'

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
