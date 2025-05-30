document.addEventListener('DOMContentLoaded', () => {
    const testResultsDiv = document.getElementById('test-results');
    const runTestsButton = document.getElementById('run-tests-button');
    let testsPassed = 0;
    let testsFailed = 0;

    // --- Assertion Functions ---
    function logResult(passed, message) {
        const resultDiv = document.createElement('div');
        resultDiv.classList.add('test-result');
        resultDiv.classList.add(passed ? 'pass' : 'fail');
        resultDiv.textContent = (passed ? 'PASS: ' : 'FAIL: ') + message;
        testResultsDiv.appendChild(resultDiv);
        if (passed) testsPassed++; else testsFailed++;
    }

    function assertEquals(expected, actual, message) {
        logResult(expected === actual, `${message} (Expected: ${expected}, Got: ${actual})`);
    }

    function assertTrue(condition, message) {
        logResult(condition === true, `${message} (Expected: true, Got: ${condition})`);
    }

    function assertFalse(condition, message) {
        logResult(condition === false, `${message} (Expected: false, Got: ${condition})`);
    }

    function assertNull(value, message) {
        logResult(value === null, `${message} (Expected: null, Got: ${value})`);
    }
    
    function assertNotNull(value, message) {
        logResult(value !== null, `${message} (Expected: not null, Got: ${value})`);
    }

    function assertBoardEquals(expectedBoard, actualBoard, message) {
        let boardsMatch = true;
        if (expectedBoard.length !== actualBoard.length) {
            boardsMatch = false;
        } else {
            for (let r = 0; r < expectedBoard.length; r++) {
                if (expectedBoard[r].length !== actualBoard[r].length) {
                    boardsMatch = false;
                    break;
                }
                for (let c = 0; c < expectedBoard[r].length; c++) {
                    if (expectedBoard[r][c] !== actualBoard[r][c]) {
                        boardsMatch = false;
                        break;
                    }
                }
                if (!boardsMatch) break;
            }
        }
        logResult(boardsMatch, `${message} (Expected: ${JSON.stringify(expectedBoard)}, Got: ${JSON.stringify(actualBoard)})`);
    }


    // --- Test Setup ---
    function setupTestBoard(testBoardConfig, testTargetNumber = 0) {
        // Ensure board is a deep copy if testBoardConfig is provided
        board = testBoardConfig ? testBoardConfig.map(row => [...row]) : Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        targetNumber = testTargetNumber;
        gameOver = false; // Reset game over state for each test
        // Potentially reset currentLevel, other game state vars if needed by tests
        renderBoard(); // Update the visual board (optional for tests but good for debugging)
    }
    
    // Call initGame once to ensure all global vars from script.js are initialized
    // This is important because script.js functions might rely on them.
    // We hide the actual game elements in tests.html so this doesn't interfere visually.
    initGame(); 


    // --- Test Suites ---

    function runCalculationTests() {
        testResultsDiv.innerHTML += '<h3>Calculation Tests</h3>';
        assertEquals(5, performCalculation(2, '+', 3), "2 + 3 should be 5");
        assertEquals(3, performCalculation(5, '-', 2), "5 - 2 should be 3");
        assertEquals(12, performCalculation(3, 'X', 4), "3 X 4 should be 12");
        assertEquals(5, performCalculation(10, '/', 2), "10 / 2 should be 5");
        assertNull(performCalculation(5, '/', 0), "5 / 0 should be null (division by zero)");
        assertEquals(2.5, performCalculation(5, '/', 2), "5 / 2 should be 2.5");
        assertEquals(-1, performCalculation(2, '-', 3), "2 - 3 should be -1");
    }

    function runMovementAndMergeTests() {
        testResultsDiv.innerHTML += '<h3>Movement & Merge Tests</h3>';

        // Test Simple Slide Right
        setupTestBoard([
            [1, null, null, null, null],
            [null, 2, null, null, null],
            [null, null, 3, null, null],
            [null, null, null, 4, null],
            [null, null, null, null, 5]
        ]);
        moveRight();
        assertBoardEquals([
            [null, null, null, null, 1],
            [null, null, null, null, 2],
            [null, null, null, null, 3],
            [null, null, null, null, 4],
            [null, null, null, null, 5]
        ], board, "Slide Right: Basic");

        // Test Simple Slide Left
        setupTestBoard([
            [null, null, null, null, 1],
            [null, null, null, 2, null],
            [null, null, 3, null, null],
            [null, 4, null, null, null],
            [5, null, null, null, null]
        ]);
        moveLeft();
        assertBoardEquals([
            [1, null, null, null, null],
            [2, null, null, null, null],
            [3, null, null, null, null],
            [4, null, null, null, null],
            [5, null, null, null, null]
        ], board, "Slide Left: Basic");
        
        // Test Merge Left: Simple Addition
        setupTestBoard([[2, '+', 3, null, null]]); // Only one row for simplicity
        moveLeft();
        assertBoardEquals([[5, null, null, null, null]], board, "Merge Left: 2 + 3 = 5");

        // Test Merge Left: Subtraction
        setupTestBoard([[5, '-', 1, null, null]]);
        moveLeft();
        assertBoardEquals([[4, null, null, null, null]], board, "Merge Left: 5 - 1 = 4");

        // Test Merge Left: Multiple numbers, no merge
        setupTestBoard([[5, 1, 2, null, null]]);
        moveLeft();
        assertBoardEquals([[5, 1, 2, null, null]], board, "Merge Left: 5, 1, 2 (no merge) -> 5, 1, 2");
        
        // Test Merge Left: N-O-N-O-N
        setupTestBoard([[2, '+', 3, '+', 4]]);
        moveLeft(); // Should calculate 2+3 first -> [5, '+', 4, null, null], then 5+4 -> [9, null, null, null, null]
        assertBoardEquals([[9, null, null, null, null]], board, "Merge Left: 2 + 3 + 4 = 9");

        // Test Merge Right: N-O-N-O-N (LTR evaluation still applies before slide)
        // The merging part happens LTR, then the whole resulting line slides right.
        setupTestBoard([[2, '+', 3, '+', 4]]);
        moveRight(); // Merge: 2+3 -> 5; then 5+4 -> 9. Slide [9] right.
        assertBoardEquals([[null, null, null, null, 9]], board, "Merge Right: 2 + 3 + 4 = 9 (slides right)");
        
        // Test Merge Up: Vertical N-O-N
        setupTestBoard([
            [2, null, null, null, null],
            ['+', null, null, null, null],
            [3, null, null, null, null],
            ['+', null, null, null, null],
            [4, null, null, null, null]
        ]);
        moveUp(); // 2+3 -> 5; then 5+4 -> 9.
        assertBoardEquals([
            [9, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null]
        ], board, "Merge Up: 2+3+4 (vertical) = 9");

        // Test Merge Down: Vertical N-O-N
         setupTestBoard([
            [2, null, null, null, null],
            ['+', null, null, null, null],
            [3, null, null, null, null],
            ['+', null, null, null, null],
            [4, null, null, null, null]
        ]);
        moveDown(); // Merge: 2+3 -> 5; then 5+4 -> 9. Slide [9] down.
        assertBoardEquals([
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [9, null, null, null, null]
        ], board, "Merge Down: 2+3+4 (vertical) = 9 (slides down)");

        // Test Division by Zero during merge
        setupTestBoard([[5, '/', 0, null, null]]);
        moveLeft(); // Should not merge, 5 / 0 is invalid
        assertBoardEquals([[5, '/', 0, null, null]], board, "Merge Left: 5 / 0 (no merge, error handled by performCalc)");
        assertNotNull(document.querySelector('#message-area.message-error'), "Division by zero error message should be shown");

    }

    function runWinConditionTests() {
        testResultsDiv.innerHTML += '<h3>Win Condition Tests</h3>';

        setupTestBoard([[10, null, null, null, null]], 10);
        assertTrue(checkWinCondition(), "Win Condition: Board has 10, target is 10");
        assertTrue(gameOver, "Win Condition: gameOver flag should be true after win");

        setupTestBoard([[5, null, null, null, null]], 10); // Target 10, board has 5
        assertFalse(checkWinCondition(), "Win Condition: Board does not have 10, target is 10");
        assertFalse(gameOver, "Win Condition: gameOver flag should be false if no win");
        
        setupTestBoard([[null, null, 20, null, null]], 20);
        assertTrue(checkWinCondition(), "Win Condition: Board has 20 in middle, target is 20");

        // Test if a calculation results in win
        setupTestBoard([[10, '+', 10, null, null]], 20);
        moveLeft(); // board becomes [[20, null, null, null, null]]
        assertTrue(checkWinCondition(), "Win Condition: Calculation 10+10 results in 20 (target)");
    }


    // --- Main Test Runner ---
    function runAllTests() {
        // Clear previous results
        testResultsDiv.innerHTML = '';
        testsPassed = 0;
        testsFailed = 0;

        runCalculationTests();
        runMovementAndMergeTests();
        runWinConditionTests();
        // Add more test suites here

        // Display summary
        const summaryDiv = document.createElement('div');
        summaryDiv.classList.add('summary');
        summaryDiv.textContent = `Tests Complete: ${testsPassed} Passed, ${testsFailed} Failed.`;
        if (testsFailed > 0) {
            summaryDiv.style.color = '#721c24'; // Red for failures
        } else {
            summaryDiv.style.color = '#155724'; // Green for all pass
        }
        testResultsDiv.insertBefore(summaryDiv, testResultsDiv.firstChild); // Prepend summary
        testResultsDiv.scrollTop = 0; // Scroll to top to see summary
    }

    if (runTestsButton) {
        runTestsButton.addEventListener('click', runAllTests);
    } else {
        console.error("Run Tests button not found!");
    }
    
    // Optionally run tests automatically on load for CI/CD or quick checks
    // runAllTests(); 
});
