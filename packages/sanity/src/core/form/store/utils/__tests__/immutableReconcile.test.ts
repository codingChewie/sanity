import {immutableReconcile} from '../immutableReconcile'

test('it preserves previous value if shallow equal', () => {
  const prev = {test: 'hi'}
  const next = {test: 'hi'}
  expect(immutableReconcile(prev, next)).toBe(prev)
})

test('it preserves previous value if deep equal', () => {
  const prev = {arr: [{foo: 'bar'}]}
  const next = {arr: [{foo: 'bar'}]}
  expect(immutableReconcile(prev, next)).toBe(prev)
})

test('it preserves previous nodes that are deep equal', () => {
  const prev = {arr: [{foo: 'bar'}], x: 1}
  const next = {arr: [{foo: 'bar'}]}
  expect(immutableReconcile(prev, next).arr).toBe(prev.arr)
})

test('it keeps equal objects in arrays', () => {
  const prev = {arr: ['foo', {greet: 'hello'}, {other: []}], x: 1}
  const next = {arr: ['bar', {greet: 'hello'}, {other: []}]}
  expect(immutableReconcile(prev, next).arr).not.toBe(prev.arr)
  expect(immutableReconcile(prev, next).arr[1]).toBe(prev.arr[1])
  expect(immutableReconcile(prev, next).arr[2]).toBe(prev.arr[2])
})

test('it handles a cyclic structures', () => {
  const cyclic1: Record<string, unknown> = {test: 'foo'}
  cyclic1.self = cyclic1

  const cyclic2: Record<string, unknown> = {test: 'foo'}
  cyclic2.self = cyclic2

  const prev = {arr: [{foo: 'bar'}], cyclic: cyclic1}
  const next = {arr: [{foo: 'bar'}], cyclic: cyclic2}
  expect(immutableReconcile(prev, next).arr).toBe(prev.arr)

  // Note: it picks from ´next´
  expect(immutableReconcile(prev, next).cyclic).toBe(cyclic2)
})

test('keeps the previous values where they deep equal to the next', () => {
  const prev = {
    test: 'hi',
    array: ['aloha', {foo: 'bar'}],
    object: {
      x: {y: 'CHANGE'},
      keep: {foo: 'bar'},
    },
  }
  const next = {
    test: 'hi',
    array: ['aloha', {foo: 'bar'}],
    object: {
      x: {y: 'CHANGED'},
      keep: {foo: 'bar'},
    },
    new: ['foo', 'bar'],
  }

  const result = immutableReconcile(prev, next)

  expect(result).not.toBe(prev)
  expect(result).not.toBe(next)

  expect(result.array).toBe(prev.array)
  expect(result.object.keep).toBe(prev.object.keep)
})

test('does not mutate any of its input', () => {
  const prev = Object.freeze({
    test: 'hi',
    array: ['aloha', {foo: 'bar'}],
    object: {
      x: {y: 'z'},
      keep: {foo: 'bar'},
    },
  })
  const next = Object.freeze({
    test: 'hi',
    array: ['aloha', {foo: 'bar'}],
    object: {x: {y: 'x'}, keep: {foo: 'bar'}},
    new: ['foo', 'bar'],
  })

  expect(() => immutableReconcile(prev, next)).not.toThrow()
})

test('returns new object when previous and next has different number of keys', () => {
  const moreKeys = {
    key1: 'value1',
    key2: 'value2',
    key3: 'value3',
  }
  const lessKeys = {
    key1: 'value1',
    key2: 'value2',
  }

  expect(immutableReconcile(moreKeys, lessKeys)).not.toBe(moreKeys)
  expect(immutableReconcile(lessKeys, moreKeys)).not.toBe(lessKeys)
})

test('returns new array when previous and next has different length', () => {
  const moreItems = ['a', 'b']
  const lessItems = ['a']

  expect(immutableReconcile(moreItems, lessItems)).not.toBe(moreItems)

  expect(immutableReconcile(lessItems, moreItems)).not.toBe(lessItems)
})
