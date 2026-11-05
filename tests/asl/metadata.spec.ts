import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isBuiltInEvent,
  isKnownCommand,
  isSystemVariableName,
  normalizeCommand,
  suggestCommand,
  toAsciiLowerCase,
} from '../../src/asl/metadata.ts'

void test('lowercases the ascii letters only', () => {
  assert.equal(toAsciiLowerCase('SET'), 'set')
  assert.equal(toAsciiLowerCase('§X'), '§x')
  assert.equal(toAsciiLowerCase('abc'), 'abc')
})

void test('normalizes the command names the way the engine does', () => {
  assert.equal(normalizeCommand('SET_MATERIAL'), 'setmaterial')
  assert.equal(normalizeCommand('SETMATERIAL'), 'setmaterial')
  assert.equal(normalizeCommand('s_e_t'), 'set')
})

void test('knows the commands of the engine', () => {
  assert.equal(isKnownCommand('SETMATERIAL'), true)
  assert.equal(isKnownCommand('setmaterial'), true)
  assert.equal(isKnownCommand('TIMERwait'), true)
  assert.equal(isKnownCommand('TIMER'), true)
  assert.equal(isKnownCommand('SETMATERIALS'), false)
})

void test('knows the built in events', () => {
  assert.equal(isBuiltInEvent('INIT'), true)
  assert.equal(isBuiltInEvent('init'), true)
  assert.equal(isBuiltInEvent('repaired'), false)
})

void test('knows the system variables and their families', () => {
  assert.equal(isSystemVariableName('^life'), true)
  assert.equal(isSystemVariableName('^player_life'), true)
  assert.equal(isSystemVariableName('^dist_player'), true)
  assert.equal(isSystemVariableName('^nonexistent'), false)
})

void test('suggests the closest command', () => {
  assert.equal(suggestCommand('SETMATERIALS'), 'setmaterial')
  assert.equal(suggestCommand('SENDEVENT'), 'sendevent')
  assert.equal(suggestCommand('qqqqqqqq'), null)
})
