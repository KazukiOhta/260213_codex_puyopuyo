const assert = require('assert');
const { createField, placeCells, applyGravity } = require('./puyo_core');

function cloneField(field) {
  return field.map((row) => row.slice());
}

function testGravityCompactsColumns() {
  const field = createField(4, 2);
  // Column 0: [0,1,0,3] Column 1: [0,0,2,0]
  placeCells(field, [
    { x: 0, y: 1, c: 1 },
    { x: 0, y: 3, c: 3 },
    { x: 1, y: 2, c: 2 },
  ]);

  applyGravity(field);

  const expected = [
    [0, 0],
    [0, 0],
    [1, 0],
    [3, 2],
  ];
  assert.deepStrictEqual(field, expected, 'applyGravity should compact each column to the bottom');
}

function testUnevenLandingSettlesHigherCell() {
  const field = createField(4, 2);
  // Existing block at bottom of column 0
  placeCells(field, [{ x: 0, y: 3, c: 9 }]);
  // Horizontal pair locks at y=2 on both columns
  placeCells(field, [
    { x: 0, y: 2, c: 1 },
    { x: 1, y: 2, c: 2 },
  ]);

  applyGravity(field);

  const expected = [
    [0, 0],
    [0, 0],
    [1, 0],
    [9, 2],
  ];
  assert.deepStrictEqual(field, expected, 'higher cell should fall to the lowest empty space in its column');
}

function testNoChangeWhenAlreadySettled() {
  const field = createField(3, 3);
  placeCells(field, [
    { x: 0, y: 2, c: 1 },
    { x: 1, y: 2, c: 2 },
    { x: 2, y: 2, c: 3 },
  ]);

  const before = cloneField(field);
  applyGravity(field);
  assert.deepStrictEqual(field, before, 'applyGravity should not move settled cells');
}

function run() {
  const tests = [
    testGravityCompactsColumns,
    testUnevenLandingSettlesHigherCell,
    testNoChangeWhenAlreadySettled,
  ];

  for (const test of tests) {
    test();
  }

  console.log('All tests passed.');
}

run();
