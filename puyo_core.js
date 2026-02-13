(function (global) {
  function createField(rows = 12, cols = 6) {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
  }

  function placeCells(field, cells) {
    const rows = field.length;
    const cols = field[0].length;
    for (const cell of cells) {
      if (cell.y < 0 || cell.y >= rows) continue;
      if (cell.x < 0 || cell.x >= cols) continue;
      field[cell.y][cell.x] = cell.c;
    }
  }

  function applyGravity(field) {
    const rows = field.length;
    const cols = field[0].length;
    for (let x = 0; x < cols; x++) {
      let write = rows - 1;
      for (let y = rows - 1; y >= 0; y--) {
        if (field[y][x] !== 0) {
          if (write !== y) {
            field[write][x] = field[y][x];
            field[y][x] = 0;
          }
          write--;
        }
      }
    }
  }

  function findMatches(field) {
    const rows = field.length;
    const cols = field[0].length;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const matches = [];
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const color = field[y][x];
        if (color === 0 || visited[y][x]) continue;
        const stack = [{ x, y }];
        const group = [];
        visited[y][x] = true;

        while (stack.length) {
          const cur = stack.pop();
          group.push(cur);
          for (const d of dirs) {
            const nx = cur.x + d.x;
            const ny = cur.y + d.y;
            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
            if (visited[ny][nx]) continue;
            if (field[ny][nx] !== color) continue;
            visited[ny][nx] = true;
            stack.push({ x: nx, y: ny });
          }
        }

        if (group.length >= 4) {
          matches.push(...group);
        }
      }
    }

    return matches;
  }

  const api = {
    createField,
    placeCells,
    applyGravity,
    findMatches,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (global) {
    global.PuyoCore = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
