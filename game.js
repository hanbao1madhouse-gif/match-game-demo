const boardElement = document.querySelector("#board");
const scoreElement = document.querySelector("#scoreValue");
const movesElement = document.querySelector("#movesValue");
const statusElement = document.querySelector("#statusLine");
const restartButton = document.querySelector("#restartButton");
const effectsLayer = document.querySelector("#effectsLayer");

const size = 8;
const colors = ["red", "blue", "green", "yellow", "purple", "orange"];
const colorValues = {
  red: "#d84f5f",
  blue: "#3d7fd8",
  green: "#3fa76d",
  yellow: "#e2b93b",
  purple: "#9166d8",
  orange: "#db7b3d",
};
const targetScore = 3000;
const startingMoves = 30;

let board = [];
let selected = null;
let score = 0;
let moves = startingMoves;
let locked = false;

function randomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

function tileAt(row, col) {
  return board[row]?.[col];
}

function setStatus(text) {
  statusElement.textContent = text;
  statusElement.classList.remove("combo");

  if (text.includes("连锁") || text.includes("漂亮") || text.includes("目标")) {
    window.requestAnimationFrame(() => {
      statusElement.classList.add("combo");
    });
  }
}

function updateStats() {
  scoreElement.textContent = String(score);
  movesElement.textContent = String(moves);
}

function createBoard() {
  board = Array.from({ length: size }, () => Array.from({ length: size }, () => randomColor()));

  let matches = findMatches();
  while (matches.size > 0) {
    for (const key of matches) {
      const [row, col] = key.split(",").map(Number);
      board[row][col] = randomColor();
    }
    matches = findMatches();
  }
}

function renderBoard(clearingKeys = new Set()) {
  boardElement.innerHTML = "";

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `tile ${tileAt(row, col)}`;
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.ariaLabel = `第 ${row + 1} 行，第 ${col + 1} 列`;

      if (selected?.row === row && selected?.col === col) {
        button.classList.add("selected");
      }

      if (clearingKeys.has(`${row},${col}`)) {
        button.classList.add("clearing");
      }

      button.addEventListener("click", () => handleTileClick(row, col));
      boardElement.append(button);
    }
  }
}

function tileCenter(row, col) {
  const tile = boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  const layerRect = effectsLayer.getBoundingClientRect();
  const tileRect = tile.getBoundingClientRect();

  return {
    x: tileRect.left - layerRect.left + tileRect.width / 2,
    y: tileRect.top - layerRect.top + tileRect.height / 2,
  };
}

function removeAfterAnimation(element) {
  element.addEventListener("animationend", () => element.remove(), { once: true });
}

function createParticle(x, y, color, index) {
  const particle = document.createElement("span");
  const angle = (Math.PI * 2 * index) / 8 + Math.random() * 0.35;
  const distance = 22 + Math.random() * 34;
  const sizeValue = 5 + Math.random() * 7;

  particle.className = "particle";
  particle.style.setProperty("--x", `${x}px`);
  particle.style.setProperty("--y", `${y}px`);
  particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
  particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
  particle.style.setProperty("--size", `${sizeValue}px`);
  particle.style.setProperty("--color", color);
  effectsLayer.append(particle);
  removeAfterAnimation(particle);
}

function showScorePop(x, y, points) {
  const scorePop = document.createElement("span");
  scorePop.className = "score-pop";
  scorePop.textContent = `+${points}`;
  scorePop.style.setProperty("--x", `${x}px`);
  scorePop.style.setProperty("--y", `${y}px`);
  effectsLayer.append(scorePop);
  removeAfterAnimation(scorePop);
}

function showComboBurst(chain) {
  if (chain < 2) {
    return;
  }

  const burst = document.createElement("span");
  burst.className = "combo-burst";
  burst.textContent = `Combo x${chain}`;
  effectsLayer.append(burst);
  removeAfterAnimation(burst);
}

function playClearEffects(matches, chain, points) {
  let centerX = 0;
  let centerY = 0;

  for (const key of matches) {
    const [row, col] = key.split(",").map(Number);
    const { x, y } = tileCenter(row, col);
    const color = colorValues[tileAt(row, col)];
    centerX += x;
    centerY += y;

    for (let i = 0; i < 8; i += 1) {
      createParticle(x, y, color, i);
    }
  }

  showScorePop(centerX / matches.size, centerY / matches.size, points);
  showComboBurst(chain);

  if ("vibrate" in navigator) {
    navigator.vibrate(chain > 1 ? [18, 35, 24] : 18);
  }
}

function isNeighbor(first, second) {
  const rowDistance = Math.abs(first.row - second.row);
  const colDistance = Math.abs(first.col - second.col);
  return rowDistance + colDistance === 1;
}

function swapTiles(first, second) {
  const temp = board[first.row][first.col];
  board[first.row][first.col] = board[second.row][second.col];
  board[second.row][second.col] = temp;
}

function findMatches() {
  const matches = new Set();

  for (let row = 0; row < size; row += 1) {
    let runStart = 0;
    for (let col = 1; col <= size; col += 1) {
      if (col < size && board[row][col] === board[row][runStart]) {
        continue;
      }

      if (col - runStart >= 3) {
        for (let matchCol = runStart; matchCol < col; matchCol += 1) {
          matches.add(`${row},${matchCol}`);
        }
      }
      runStart = col;
    }
  }

  for (let col = 0; col < size; col += 1) {
    let runStart = 0;
    for (let row = 1; row <= size; row += 1) {
      if (row < size && board[row][col] === board[runStart][col]) {
        continue;
      }

      if (row - runStart >= 3) {
        for (let matchRow = runStart; matchRow < row; matchRow += 1) {
          matches.add(`${matchRow},${col}`);
        }
      }
      runStart = row;
    }
  }

  return matches;
}

function collapseBoard(matches) {
  for (const key of matches) {
    const [row, col] = key.split(",").map(Number);
    board[row][col] = null;
  }

  for (let col = 0; col < size; col += 1) {
    const remaining = [];

    for (let row = size - 1; row >= 0; row -= 1) {
      if (board[row][col]) {
        remaining.push(board[row][col]);
      }
    }

    for (let row = size - 1; row >= 0; row -= 1) {
      board[row][col] = remaining[size - 1 - row] || randomColor();
    }
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function resolveMatches() {
  let chain = 0;
  let matches = findMatches();

  while (matches.size > 0) {
    chain += 1;
    const points = matches.size * 100 * chain;
    score += points;
    updateStats();
    renderBoard(matches);
    playClearEffects(matches, chain, points);
    setStatus(chain > 1 ? `连锁 x${chain}！` : `消除了 ${matches.size} 个色块。`);
    await wait(260);
    collapseBoard(matches);
    renderBoard();
    await wait(120);
    matches = findMatches();
  }

  if (moves <= 0 && score >= targetScore) {
    setStatus("目标达成！本局结束，点右上角可以再来一局。");
    locked = true;
  } else if (score >= targetScore) {
    setStatus("目标达成！还可以继续刷分。");
  } else if (moves <= 0) {
    setStatus("步数用完了，点右上角重新开始。");
    locked = true;
  } else if (chain === 0) {
    setStatus("这次没有消除，换个方向试试。");
  } else {
    setStatus("漂亮，继续找下一组。");
  }
}

async function trySwap(first, second) {
  locked = true;
  swapTiles(first, second);
  selected = null;
  renderBoard();
  await wait(100);

  if (findMatches().size === 0) {
    swapTiles(first, second);
    renderBoard();
    setStatus("这一步不能形成消除，已经换回来了。");
    locked = false;
    return;
  }

  moves -= 1;
  updateStats();
  await resolveMatches();
  locked = moves <= 0;
}

function handleTileClick(row, col) {
  if (locked) {
    return;
  }

  const current = { row, col };

  if (!selected) {
    selected = current;
    renderBoard();
    setStatus("再选择一个相邻色块。");
    return;
  }

  if (selected.row === row && selected.col === col) {
    selected = null;
    renderBoard();
    setStatus("已取消选择。");
    return;
  }

  if (!isNeighbor(selected, current)) {
    selected = current;
    renderBoard();
    setStatus("只能交换上下左右相邻的色块。");
    return;
  }

  trySwap(selected, current);
}

function restartGame() {
  score = 0;
  moves = startingMoves;
  selected = null;
  locked = false;
  effectsLayer.innerHTML = "";
  createBoard();
  updateStats();
  renderBoard();
  setStatus("选择一个色块，再选择相邻色块进行交换。");
}

restartButton.addEventListener("click", restartGame);
restartGame();
