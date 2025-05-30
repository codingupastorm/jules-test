document.addEventListener('DOMContentLoaded', () => {
    // Global Variables
    const GRID_SIZE = 5;
    let board = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    
    const gridContainer = document.getElementById('grid-container');
    const levelDisplay = document.getElementById('level-display');
    const targetDisplay = document.getElementById('target-display');
    const messageArea = document.getElementById('message-area');

    let currentLevel = 1;
    let targetNumber = 0; // Will be set per level

    // Level Data Structure
    const LEVELS = [
      {
        levelNumber: 1,
        targetNumber: 6,
        initialBoard: [
          [2, 'X', 3, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null]
        ]
      }
      // More levels can be added here
    ];

    /**
     * Renders the game board in the DOM based on the `board` array.
     */
    function renderBoard() {
        gridContainer.innerHTML = ''; // Clear existing content

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cellDiv = document.createElement('div');
                cellDiv.classList.add('grid-cell');
                cellDiv.dataset.row = r; // Store row and col for event handling
                cellDiv.dataset.col = c;

                const cellValue = board[r][c];

                if (cellValue !== null) {
                    const blockDiv = document.createElement('div');
                    blockDiv.textContent = cellValue;
                    blockDiv.classList.add('block');

                    if (typeof cellValue === 'number') {
                        blockDiv.classList.add('block-number');
                    } else if (typeof cellValue === 'string' && ['+', '-', 'X', '/'].includes(cellValue)) {
                        blockDiv.classList.add('block-operator');
                    }
                    // TODO: Add click event listener to blockDiv for selection
                    cellDiv.appendChild(blockDiv);
                }
                gridContainer.appendChild(cellDiv);
            }
        }
    }

    /**
     * Loads a specific level configuration.
     * @param {number} levelNum - The number of the level to load.
     */
    function loadLevel(levelNum) {
        const levelData = LEVELS.find(l => l.levelNumber === levelNum);

        if (levelData) {
            currentLevel = levelData.levelNumber;
            targetNumber = levelData.targetNumber;

            // Deep copy initialBoard to global board
            board = levelData.initialBoard.map(row => [...row]);

            levelDisplay.textContent = currentLevel;
            targetDisplay.textContent = targetNumber;
            messageArea.textContent = `Level ${currentLevel}: Make ${targetNumber}`;
            
            renderBoard();
            displayMessage(`Level ${currentLevel}: Make ${targetNumber}`); // Use displayMessage
        } else {
            console.error(`Level ${levelNum} not found.`);
            displayMessage(`Error: Level ${levelNum} not found.`, 'error');
        }
    }

    /**
     * Displays a message to the user.
     * @param {string} text - The message to display.
     * @param {string} type - The type of message ('info', 'win', 'error').
     */
    function displayMessage(text, type = 'info') {
        messageArea.textContent = text;
        messageArea.className = 'message-area'; // Reset classes
        if (type === 'win') {
            messageArea.classList.add('message-win');
        } else if (type === 'error') {
            messageArea.classList.add('message-error');
        }
        // In style.css, you would add:
        // .message-win { color: green; font-weight: bold; }
        // .message-error { color: red; font-weight: bold; }
    }


    /**
     * Performs a calculation between two numbers based on an operator.
     * @param {number} num1 - The first number.
     * @param {string} operator - The operator ('+', '-', 'X', '/').
     * @param {number} num2 - The second number.
     * @returns {number|null} The result of the calculation or null if invalid (e.g., division by zero).
     */
    function performCalculation(num1, operator, num2) {
        switch (operator) {
            case '+':
                return num1 + num2;
            case '-':
                return num1 - num2; // Assuming N1 - N2 (Left/Top is N1)
            case 'X':
                return num1 * num2;
            case '/':
                if (num2 === 0) {
                    displayMessage("Error: Division by zero!", "error");
                    return null;
                }
                return num1 / num2;
            default:
                return null;
        }
    }

    // --- Movement Logic ---
    // Note: The rule "division and subtraction always executes either left-to-right, or up-to-down"
    // implies that the first number in the sequence (leftmost or topmost) is N1.

    function moveLeft() {
        let moved = false;
        for (let r = 0; r < GRID_SIZE; r++) {
            const currentRow = board[r];
            const newRow = [];
            // Collect all blocks
            for (let c = 0; c < GRID_SIZE; c++) {
                if (currentRow[c] !== null) {
                    newRow.push(currentRow[c]);
                }
            }
            // Fill remaining with null
            while (newRow.length < GRID_SIZE) {
                newRow.push(null);
            }
            // Check if row changed BEFORE modification for merging.
            // The 'moved' flag will now be more complex. If a value changes or position changes.
            let initialRowState = [...board[r]]; // shallow copy for comparison

            // Phase 1: Collect non-null items for potential merging
            let line = [];
            for (let c = 0; c < GRID_SIZE; c++) {
                if (board[r][c] !== null) {
                    line.push(board[r][c]);
                }
            }

            // Phase 2: Merge items in the collected line (LTR)
            for (let i = 0; i < line.length - 2; i++) {
                if (typeof line[i] === 'number' && typeof line[i+2] === 'number' && ['+', '-', 'X', '/'].includes(line[i+1])) {
                    const num1 = line[i];
                    const operator = line[i+1];
                    const num2 = line[i+2];
                    const result = performCalculation(num1, operator, num2);
                    if (result !== null) {
                        line.splice(i, 3, result); // Replace N, O, N with Result
                        i--; // Re-check from the new result's position in case of chained ops like 1+2+3
                        // moved = true; // A merge counts as a move. This will be set later by comparing initialRowState
                    }
                }
            }
            
            // Phase 3: Place merged line back, aligned left
            const newRow = Array(GRID_SIZE).fill(null);
            for (let i = 0; i < line.length; i++) {
                newRow[i] = line[i];
            }

            // Check if row actually changed compared to its initial state
            for (let c = 0; c < GRID_SIZE; c++) {
                if (initialRowState[c] !== newRow[c]) {
                    moved = true;
                    break;
                }
            }
            board[r] = newRow;
        }
        return moved;
    }

    function moveRight() {
        let moved = false;
        for (let r = 0; r < GRID_SIZE; r++) {
            let initialRowState = [...board[r]];
            let line = [];
            for (let c = 0; c < GRID_SIZE; c++) {
                if (board[r][c] !== null) {
                    line.push(board[r][c]);
                }
            }

            // Merge (LTR evaluation always, so N1, O, N2)
            for (let i = 0; i < line.length - 2; i++) {
                 if (typeof line[i] === 'number' && typeof line[i+2] === 'number' && ['+', '-', 'X', '/'].includes(line[i+1])) {
                    const num1 = line[i];
                    const operator = line[i+1];
                    const num2 = line[i+2];
                    const result = performCalculation(num1, operator, num2);
                    if (result !== null) {
                        line.splice(i, 3, result);
                        i--; 
                        // moved = true;
                    }
                }
            }

            const newRow = Array(GRID_SIZE).fill(null);
            let newRowIdx = GRID_SIZE - 1;
            for (let i = line.length - 1; i >= 0; i--) {
                newRow[newRowIdx--] = line[i];
            }
            
            for (let c = 0; c < GRID_SIZE; c++) {
                if (initialRowState[c] !== newRow[c]) {
                    moved = true;
                    break;
                }
            }
            board[r] = newRow;
        }
        return moved;
    }

    function moveUp() {
        let moved = false;
        for (let c = 0; c < GRID_SIZE; c++) {
            let initialColState = [];
            for(let r=0; r<GRID_SIZE; r++) initialColState.push(board[r][c]);

            let line = [];
            for (let r = 0; r < GRID_SIZE; r++) {
                if (board[r][c] !== null) {
                    line.push(board[r][c]);
                }
            }

            // Merge (TTB evaluation always, so N1, O, N2)
            for (let i = 0; i < line.length - 2; i++) {
                if (typeof line[i] === 'number' && typeof line[i+2] === 'number' && ['+', '-', 'X', '/'].includes(line[i+1])) {
                    const num1 = line[i];
                    const operator = line[i+1];
                    const num2 = line[i+2];
                    const result = performCalculation(num1, operator, num2);
                    if (result !== null) {
                        line.splice(i, 3, result);
                        i--;
                        // moved = true;
                    }
                }
            }

            const newCol = Array(GRID_SIZE).fill(null);
            for (let i = 0; i < line.length; i++) {
                newCol[i] = line[i];
            }

            for (let r = 0; r < GRID_SIZE; r++) {
                if (initialColState[r] !== newCol[r]) {
                    moved = true;
                }
                board[r][c] = newCol[r];
            }
        }
        return moved;
    }

    function moveDown() {
        let moved = false;
        for (let c = 0; c < GRID_SIZE; c++) {
            let initialColState = [];
            for(let r=0; r<GRID_SIZE; r++) initialColState.push(board[r][c]);

            let line = [];
            for (let r = 0; r < GRID_SIZE; r++) {
                if (board[r][c] !== null) {
                    line.push(board[r][c]);
                }
            }

            // Merge (TTB evaluation always, so N1, O, N2)
             for (let i = 0; i < line.length - 2; i++) {
                if (typeof line[i] === 'number' && typeof line[i+2] === 'number' && ['+', '-', 'X', '/'].includes(line[i+1])) {
                    const num1 = line[i];
                    const operator = line[i+1];
                    const num2 = line[i+2];
                    const result = performCalculation(num1, operator, num2);
                    if (result !== null) {
                        line.splice(i, 3, result);
                        i--;
                        // moved = true;
                    }
                }
            }
            
            const newCol = Array(GRID_SIZE).fill(null);
            let newColIdx = GRID_SIZE - 1;
            for (let i = line.length - 1; i >= 0; i--) {
                newCol[newColIdx--] = line[i];
            }

            for (let r = 0; r < GRID_SIZE; r++) {
                if (initialColState[r] !== newCol[r]) {
                    moved = true;
                }
                board[r][c] = newCol[r];
            }
        }
        return moved;
    }

    let gameOver = false;

    function checkWinCondition() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (board[r][c] === targetNumber) {
                    displayMessage(`You Win! ${board[r][c]} matches target ${targetNumber}.`, "win");
                    gameOver = true;
                    // Potentially disable key listener here or in handleKeyPress
                    return true;
                }
            }
        }
        // Check for no more moves / loss condition (optional, more complex)
        return false;
    }


    function handleKeyPress(event) {
        if (gameOver) {
            displayMessage("Game Over. Refresh to restart or proceed to next level (if implemented).", "info");
            event.preventDefault();
            return;
        }

        let movedPreviously = false; // To track if any move was made in this key press
        switch (event.key) {
            case 'ArrowLeft':
                movedPreviously = moveLeft();
                break;
            case 'ArrowRight':
                movedPreviously = moveRight();
                break;
            case 'ArrowUp':
                movedPreviously = moveUp();
                break;
            case 'ArrowDown':
                movedPreviously = moveDown();
                break;
            default:
                return; // Do nothing for other keys
        }

        if (movedPreviously) {
            renderBoard();
            if (checkWinCondition()) {
                // Win message is already displayed by checkWinCondition
                // Further actions like loading next level could be triggered here.
            } else {
                 // Update general game message if no win yet and a move was made
                 displayMessage(`Level ${currentLevel}: Make ${targetNumber}`, 'info');
            }
        }
        event.preventDefault(); // Prevent default arrow key actions (scrolling)
    }

    /**
     * Initializes the game.
     */
    function initGame() {
        gameOver = false; // Reset game over flag on init
        loadLevel(1); // Load the first level
        document.addEventListener('keydown', handleKeyPress); // Add key listener
    }

    // Start the game
    initGame();
});
