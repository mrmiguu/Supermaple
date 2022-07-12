// import seedrandom, { PRNG } from 'seedrandom'
import seedrandom, { PRNG } from 'seedrandom'
import { Tail } from './types'

const { log, warn, error } = console
const { stringify, parse } = JSON
const { keys, values, entries } = Object
const { min, max, floor, ceil, abs, sin, cos, tan, PI } = Math

function assert(...args: Parameters<typeof console['assert']>) {
  const [condition, ...data] = args
  if (!condition) throw new Error(`Assertion failed${data && data.length ? `: ${data.join(' ')}` : ''}`)
}

async function sleep(...args: Tail<Parameters<typeof setTimeout>>) {
  return new Promise<void>(resolve => setTimeout(resolve, ...args))
}

function random(seed?: string) {
  if (!random_cache.has(seed)) random_cache.set(seed, seedrandom(seed))
  return random_cache.get(seed)!()
}
const random_cache = new Map<string | undefined, PRNG>()

export {
  log,
  warn,
  error,
  assert,
  stringify,
  parse,
  keys,
  values,
  entries,
  min,
  max,
  floor,
  ceil,
  abs,
  sin,
  cos,
  tan,
  PI,
  sleep,
  random,
}
