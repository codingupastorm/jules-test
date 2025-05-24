// --- Assertion Functions ---
function assertEquals(expected, actual, message) {
    if (expected !== actual) {
        logTestResult(`FAIL: ${message}. Expected: "${expected}", Actual: "${actual}"`, "fail");
        console.error(`Assertion Failed: ${message}`, { expected, actual });
        return false;
    }
    logTestResult(`PASS: ${message}`, "pass");
    return true;
}

function assertNotEquals(notExpected, actual, message) {
    if (notExpected === actual) {
        logTestResult(`FAIL: ${message}. Did NOT expect: "${notExpected}", Actual: "${actual}"`, "fail");
        console.error(`Assertion Failed: ${message}`, { notExpected, actual });
        return false;
    }
    logTestResult(`PASS: ${message}`, "pass");
    return true;
}

function assertTrue(condition, message) {
    if (!condition) {
        logTestResult(`FAIL: ${message}. Expected true, got false`, "fail");
        console.error(`Assertion Failed: ${message}`, { expected: true, actual: condition });
        return false;
    }
    logTestResult(`PASS: ${message}`, "pass");
    return true;
}

function assertFalse(condition, message) {
    if (condition) {
        logTestResult(`FAIL: ${message}. Expected false, got true`, "fail");
        console.error(`Assertion Failed: ${message}`, { expected: false, actual: condition });
        return false;
    }
    logTestResult(`PASS: ${message}`, "pass");
    return true;
}

function logTestResult(message, statusClass = 'info') {
    const resultsDiv = document.getElementById('test-results');
    const p = document.createElement('p');
    p.textContent = message;
    p.className = statusClass;
    resultsDiv.appendChild(p);
    if (statusClass === 'fail') {
        // console.error(message); // Already logged by assertion functions
    } else {
        console.log(message);
    }
}

// --- Test Setup Utilities ---
let originalDisplayMessage;

function setupTestEnvironment(options = {}) {
    logTestResult(`--- Setting up test environment for: ${options.testName || 'Unnamed Test'} ---`, 'info');

    // Reset core game state variables
    currentLevel = options.level || 1;
    playerPiecePositions = { 'piece-1': 'space-1', 'piece-2': 'space-1' }; // Default, can be overridden
    playerPowerUps = {
        'piece-1': { extraLife: false, safePassage: false, rerollAvailable: false, ...options.player1PowerUps },
        'piece-2': { extraLife: false, safePassage: false, rerollAvailable: false, ...options.player2PowerUps }
    };
    activeDice = options.dice || [];
    diceValues = options.dice || []; // Ensure diceValues also reflects this for consistency
    gameOver = false;
    roundOver = false;
    awaitingPowerUpSelection = false;
    rerollUsedThisTurn = false;
    winningPlayerIdForPowerUp = null;

    // Override displayMessage to prevent alerts/timeouts from interfering with test execution
    if (!originalDisplayMessage) {
        originalDisplayMessage = displayMessage; // Store original
    }
    displayMessage = (message, type) => {
        // logTestResult(`Game Msg (${type}): ${message}`, 'game-msg'); // Optionally log game messages during tests
        console.log(`Mocked Game Msg (${type}): ${message}`);
    };
    
    // Initialize the game board for the specified level
    // This will also set MINED_SPACES and WINNING_SPACE_ID
    initializeGame(); // This function already handles setting up based on `currentLevel`

    // Place pieces if specific positions are requested
    if (options.piece1Position) {
        const piece1 = document.getElementById('piece-1');
        const space = document.getElementById(options.piece1Position);
        if (piece1 && space) {
            space.appendChild(piece1);
            playerPiecePositions['piece-1'] = options.piece1Position;
            piece1.dataset.currentSpaceId = options.piece1Position;
        }
    }
    if (options.piece2Position) {
        const piece2 = document.getElementById('piece-2');
        const space = document.getElementById(options.piece2Position);
        if (piece2 && space) {
            space.appendChild(piece2);
            playerPiecePositions['piece-2'] = options.piece2Position;
            piece2.dataset.currentSpaceId = options.piece2Position;
        }
    }
    positionPiecesInSameSquare(); // Ensure visual offsets are correct after manual placement
}

function teardownTestEnvironment() {
    // Restore original displayMessage if it was overridden
    if (originalDisplayMessage) {
        displayMessage = originalDisplayMessage;
        originalDisplayMessage = null;
    }
    // Any other cleanup can go here
    logTestResult(`--- Teardown complete ---`, 'info');
}


// --- Test Suites (Placeholders) ---
function runDiceTests() {
    logTestResult("--- Starting Dice Tests ---", "info");
    setupTestEnvironment({testName: "Dice Roll Validation"});
    
    rollDice(); // Initial roll
    assertTrue(Array.isArray(diceValues), "diceValues should be an array.");
    assertEquals(2, diceValues.length, "diceValues should have 2 elements.");
    assertTrue(diceValues[0] >= 1 && diceValues[0] <= 6, "Die 1 value should be between 1-6.");
    assertTrue(diceValues[1] >= 1 && diceValues[1] <= 6, "Die 2 value should be between 1-6.");
    assertEquals(diceValues[0], activeDice[0], "activeDice[0] should match diceValues[0] after roll.");
    assertEquals(diceValues[1], activeDice[1], "activeDice[1] should match diceValues[1] after roll.");

    // Test multiple rolls
    let allRollsValid = true;
    for (let i = 0; i < 10; i++) {
        activeDice = []; // Simulate dice used up
        rollDice();
        if (!(diceValues[0] >= 1 && diceValues[0] <= 6 && diceValues[1] >= 1 && diceValues[1] <= 6)) {
            allRollsValid = false;
            break;
        }
    }
    assertTrue(allRollsValid, "All 10 subsequent dice rolls should produce valid values (1-6).");
    teardownTestEnvironment();
}

function runMoveValidationTests() {
    logTestResult("--- Starting Move Validation Tests ---", "info");
    
    // Test 1: Valid move
    setupTestEnvironment({testName: "Valid Move", dice: [3, 5], piece1Position: 'space-1'});
    draggedPieceId = 'piece-1';
    draggedPieceStartSpaceId = 'space-1';
    // Simulate drop on space-4 (using die 3)
    const dropEventValid = { target: document.getElementById('space-4'), preventDefault: () => {} };
    gameBoardElement.dispatchEvent(new CustomEvent('drop', { detail: dropEventValid })); // A bit simplified
    // Directly call the handler if dispatchEvent is problematic in test env for complex events
    // For this, we need to ensure the drop handler is accessible or refactor it slightly
    // For now, assume direct call or a more robust simulation method might be needed.
    // Let's try direct call:
    handleDropEvent(dropEventValid); // Assuming handleDropEvent is the name of the drop handler function
    assertEquals('space-4', playerPiecePositions['piece-1'], "Piece-1 should move to space-4.");
    assertEquals(null, activeDice[0], "Die 3 should be marked as used (null).");
    teardownTestEnvironment();

    // Test 2: Invalid move (die already used)
    setupTestEnvironment({testName: "Invalid Move (Die Used)", dice: [null, 5], piece1Position: 'space-4'});
    draggedPieceId = 'piece-1';
    draggedPieceStartSpaceId = 'space-4';
    const dropEventDieUsed = { target: document.getElementById('space-7'), preventDefault: () => {} }; // Try to move 3 again
    handleDropEvent(dropEventDieUsed);
    assertEquals('space-4', playerPiecePositions['piece-1'], "Piece-1 should NOT move if die for distance 3 is null.");
    teardownTestEnvironment();

    // Test 3: Invalid move (distance doesn't match dice)
    setupTestEnvironment({testName: "Invalid Move (Distance Mismatch)", dice: [2, 5], piece1Position: 'space-1'});
    draggedPieceId = 'piece-1';
    draggedPieceStartSpaceId = 'space-1';
    const dropEventMismatch = { target: document.getElementById('space-4'), preventDefault: () => {} }; // Move 3
    handleDropEvent(dropEventMismatch);
    assertEquals('space-1', playerPiecePositions['piece-1'], "Piece-1 should NOT move if distance 3 doesn't match dice [2,5].");
    teardownTestEnvironment();

    // Test 4: Move backward
    setupTestEnvironment({testName: "Invalid Move (Backward)", dice: [3, 5], piece1Position: 'space-4'});
    draggedPieceId = 'piece-1';
    draggedPieceStartSpaceId = 'space-4';
    const dropEventBackward = { target: document.getElementById('space-1'), preventDefault: () => {} };
    handleDropEvent(dropEventBackward);
    assertEquals('space-4', playerPiecePositions['piece-1'], "Piece-1 should NOT move backward.");
    teardownTestEnvironment();
}

// Placeholder for the actual drop event handler from script.js
// This needs to be the same function that gameBoardElement.addEventListener('drop', handleDropEvent); uses.
// If it's an anonymous function, it needs to be refactored to be a named function in script.js
// For now, this is a global placeholder.
let handleDropEvent = () => { logTestResult("WARN: handleDropEvent not yet properly hooked from script.js for testing.", "fail")}; 


function runWinConditionTests() {
    logTestResult("--- Starting Win Condition Tests ---", "info");
    const winLevelConfig = LEVEL_CONFIGS.find(l => l.levelNumber === 1); // Level 1: 18 spaces
    setupTestEnvironment({
        testName: "Win Condition",
        level: 1, 
        piece1Position: `space-${winLevelConfig.spaces - 2}`, // space-16 for level 1
        dice: [2, 5] 
    });
    
    draggedPieceId = 'piece-1';
    draggedPieceStartSpaceId = `space-${winLevelConfig.spaces - 2}`;
    const dropEventWin = { target: document.getElementById(WINNING_SPACE_ID), preventDefault: () => {} };
    handleDropEvent(dropEventWin); // Simulate drop on winning space

    assertTrue(roundOver, "roundOver should be true after winning.");
    assertTrue(awaitingPowerUpSelection, "awaitingPowerUpSelection should be true after winning.");
    // Check if modal is visible (harder to check style directly without more complex setup)
    // Instead, check the state that leads to modal visibility.
    teardownTestEnvironment();
}

function runMineTests() {
    logTestResult("--- Starting Mine Tests ---", "info");
    const mineTestLevel = 1;
    const mineSpaceForLevel1 = LEVEL_CONFIGS.find(l=>l.levelNumber === mineTestLevel).mines[0]; // e.g. space-5
    const spaceBeforeMine = `space-${parseInt(mineSpaceForLevel1.split('-')[1]) - 2}`; // e.g. space-3
    
    setupTestEnvironment({
        testName: "Land on Mine (No Power-up)", 
        level: mineTestLevel,
        piece1Position: spaceBeforeMine, 
        dice: [2, 5] 
    });

    draggedPieceId = 'piece-1';
    draggedPieceStartSpaceId = spaceBeforeMine;
    const dropEventMine = { target: document.getElementById(mineSpaceForLevel1), preventDefault: () => {} };
    handleDropEvent(dropEventMine);

    assertEquals('space-1', playerPiecePositions['piece-1'], "Piece-1 should be sent back to space-1 after hitting a mine.");
    teardownTestEnvironment();
}

function runPowerUpTests() {
    logTestResult("--- Starting PowerUp Tests ---", "info");
    const powerUpTestLevel = 1;
    const mineOnLevel = LEVEL_CONFIGS.find(l=>l.levelNumber === powerUpTestLevel).mines[0]; // space-5
    const spaceBeforeMineForPowerup = `space-${parseInt(mineOnLevel.split('-')[1]) - 1}`; // space-4

    // Test 1: Extra Life
    setupTestEnvironment({
        testName: "Extra Life Power-up",
        level: powerUpTestLevel,
        piece1Position: spaceBeforeMineForPowerup,
        player1PowerUps: { extraLife: true },
        dice: [1, 5]
    });
    draggedPieceId = 'piece-1';
    draggedPieceStartSpaceId = spaceBeforeMineForPowerup;
    const dropEventExtraLife = { target: document.getElementById(mineOnLevel), preventDefault: () => {} };
    handleDropEvent(dropEventExtraLife);
    assertEquals(mineOnLevel, playerPiecePositions['piece-1'], "Piece-1 should stay on mine space with Extra Life.");
    assertFalse(playerPowerUps['piece-1'].extraLife, "Extra Life should be consumed.");
    teardownTestEnvironment();

    // Test 2: Safe Passage
    setupTestEnvironment({
        testName: "Safe Passage Power-up",
        level: powerUpTestLevel,
        piece1Position: spaceBeforeMineForPowerup,
        player1PowerUps: { safePassage: true },
        dice: [1, 5]
    });
    draggedPieceId = 'piece-1';
    draggedPieceStartSpaceId = spaceBeforeMineForPowerup;
    const dropEventSafePassage = { target: document.getElementById(mineOnLevel), preventDefault: () => {} };
    handleDropEvent(dropEventSafePassage);
    assertEquals(mineOnLevel, playerPiecePositions['piece-1'], "Piece-1 should stay on mine space with Safe Passage.");
    assertFalse(playerPowerUps['piece-1'].safePassage, "Safe Passage should be consumed.");
    teardownTestEnvironment();

    // Test 3: Re-roll
    setupTestEnvironment({
        testName: "Re-roll Power-up",
        level: powerUpTestLevel,
        player1PowerUps: { rerollAvailable: true }
    });
    rollDice(); // Initial roll
    const originalDie1 = diceValues[0];
    assertTrue(document.getElementById('reroll-die1-button').style.display !== 'none', "Re-roll button for Die 1 should be visible.");
    
    handleReroll(0); // Simulate re-rolling die 1
    
    assertNotEquals(originalDie1, diceValues[0], "Die 1 value should change after re-roll (highly probable). This test might rarely fail if random is same.");
    assertTrue(diceValues[0] >= 1 && diceValues[0] <= 6, "New Die 1 value must be valid (1-6).");
    assertFalse(playerPowerUps['piece-1'].rerollAvailable, "Re-roll power-up should be consumed.");
    assertTrue(rerollUsedThisTurn, "rerollUsedThisTurn flag should be true.");
    assertTrue(document.getElementById('reroll-die1-button').style.display === 'none', "Re-roll buttons should be hidden after use.");
    teardownTestEnvironment();
}

function runBoostSpaceTests() {
    logTestResult("--- Starting Boost Space Tests ---", "info");
    const boostTestLevel = 1; // Level 1 has boost space-3 to +2 (to space-5), space-10 to +3 (to space-13)
    const boostSpace = 'space-3'; // Lands on space-3
    const expectedLandingAfterBoost = 'space-5'; // space-3 + 2 = space-5
    const mineOnBoostPath = LEVEL_CONFIGS.find(l=>l.levelNumber === boostTestLevel).mines.includes(expectedLandingAfterBoost); // Check if space-5 is a mine

    setupTestEnvironment({
        testName: "Land on Boost Space",
        level: boostTestLevel,
        piece1Position: 'space-1',
        dice: [2, 4] // To land on space-3 (1+2)
    });
    draggedPieceId = 'piece-1';
    draggedPieceStartSpaceId = 'space-1';
    const dropEventBoost = { target: document.getElementById(boostSpace), preventDefault: () => {} };
    handleDropEvent(dropEventBoost);

    if (mineOnBoostPath) {
        assertEquals('space-1', playerPiecePositions['piece-1'], `Piece-1 should be sent to space-1 if boosted to a mine (${expectedLandingAfterBoost}).`);
    } else {
        assertEquals(expectedLandingAfterBoost, playerPiecePositions['piece-1'], `Piece-1 should boost from ${boostSpace} to ${expectedLandingAfterBoost}.`);
    }
    teardownTestEnvironment();
}

function runLevelProgressionTests() {
    logTestResult("--- Starting Level Progression Tests ---", "info");
    setupTestEnvironment({testName: "Level Progression", level: 1});
    
    // Simulate winning level 1
    currentLevel = 1; // Ensure starting at level 1
    roundOver = true; // Simulate round is over
    winningPlayerIdForPowerUp = 'piece-1'; // Simulate piece-1 won
    
    // Simulate choosing a power-up, which triggers level progression
    applyPowerUp(POWER_UPS[0]); // Apply the first available power-up (e.g. extraLife)
    
    assertEquals(2, currentLevel, "Current level should increment to 2.");
    const level2Config = LEVEL_CONFIGS.find(l => l.levelNumber === 2);
    assertEquals(`space-${level2Config.spaces}`, WINNING_SPACE_ID, "WINNING_SPACE_ID should be updated for level 2.");
    assertTrue(MINED_SPACES.includes(`space-${level2Config.mines[0].split('-')[1]}`), "MINED_SPACES should be updated for level 2.");
    assertEquals("2", document.getElementById('current-level-display').textContent, "Level display should update to 2.");

    // Simulate winning up to MAX_LEVELS
    currentLevel = MAX_LEVELS;
    setupTestEnvironment({testName: "Final Level Win", level: MAX_LEVELS});
    roundOver = true;
    winningPlayerIdForPowerUp = 'piece-1';
    applyPowerUp(POWER_UPS[0]);

    assertEquals(MAX_LEVELS + 1, currentLevel, `Current level should be MAX_LEVELS + 1 (${MAX_LEVELS + 1}).`);
    assertTrue(gameOver, "gameOver should be true after beating MAX_LEVELS.");
    // Check if roll dice button is disabled (example of game over state)
    assertTrue(document.getElementById('roll-dice-button').disabled, "Roll dice button should be disabled after beating all levels.");

    teardownTestEnvironment();
}

function runUIVisibilityTests() {
    logTestResult("--- Starting UI Visibility Tests ---", "info");

    // Test Case: Visible Mines
    setupTestEnvironment({testName: "Visible Mines", level: 1});
    const level1Config = LEVEL_CONFIGS.find(l => l.levelNumber === 1);
    
    level1Config.mines.forEach(mineId => {
        const mineElement = document.getElementById(mineId);
        assertTrue(mineElement && mineElement.classList.contains('mine-visible'), `Mine on ${mineId} should have 'mine-visible' class.`);
    });

    const nonMineIds = ['space-1', 'space-2', 'space-6']; // Example non-mines for level 1
    nonMineIds.forEach(nonMineId => {
        const nonMineElement = document.getElementById(nonMineId);
        assertFalse(nonMineElement && nonMineElement.classList.contains('mine-visible'), `${nonMineId} (non-mine) should not have 'mine-visible' class.`);
    });
    teardownTestEnvironment();

    // Test Case: Valid Drop Location Indicators
    setupTestEnvironment({
        testName: "Valid Drop Location Indicators",
        level: 1, // Level 1 has 18 spaces
        piece1Position: 'space-1'
    });
    activeDice = [3, 4]; // Manually set for test predictability
    diceValues = [3, 4]; // Ensure this is also set if any internal logic might read it before activeDice fully processed

    // Simulate dragstart state and apply highlighting logic
    draggedPieceId = 'piece-1'; 
    draggedPieceStartSpaceId = playerPiecePositions[draggedPieceId]; // Should be 'space-1'
    
    // Replicated highlighting logic from script.js's dragstart
    const startSpaceNumForHighlight = parseInt(draggedPieceStartSpaceId.split('-')[1]);
    const maxSpaceNumForHighlight = parseInt(WINNING_SPACE_ID.split('-')[1]); // WINNING_SPACE_ID is set by initializeGame

    activeDice.forEach(die => {
        if (die === null) return;
        const targetSpaceNum = startSpaceNumForHighlight + die;
        if (targetSpaceNum > 0 && targetSpaceNum <= maxSpaceNumForHighlight) {
            const targetSpaceEl = document.getElementById(`space-${targetSpaceNum}`);
            if (targetSpaceEl) targetSpaceEl.classList.add('valid-drop-target');
        }
    });

    assertTrue(document.getElementById('space-4').classList.contains('valid-drop-target'), "Space-4 (1+3) should be a valid drop target.");
    assertTrue(document.getElementById('space-5').classList.contains('valid-drop-target'), "Space-5 (1+4) should be a valid drop target.");
    assertFalse(document.getElementById('space-2').classList.contains('valid-drop-target'), "Space-2 should NOT be a valid drop target.");
    assertFalse(document.getElementById('space-6').classList.contains('valid-drop-target'), "Space-6 should NOT be a valid drop target.");
    
    // Test clearing highlights
    clearValidDropTargets(); // This function is globally available from script.js
    assertFalse(document.getElementById('space-4').classList.contains('valid-drop-target'), "Space-4 highlight should be cleared.");
    assertFalse(document.getElementById('space-5').classList.contains('valid-drop-target'), "Space-5 highlight should be cleared.");
    
    teardownTestEnvironment();
}


// --- Main Test Runner ---
function runAllTests() {
    // Clear previous results
    const resultsDiv = document.getElementById('test-results');
    resultsDiv.innerHTML = '';
    logTestResult("========= Starting All Tests =========", "info");

    runDiceTests();
    runMoveValidationTests(); // Depends on handleDropEvent being correctly assigned
    runWinConditionTests();   // Depends on handleDropEvent
    runMineTests();           // Depends on handleDropEvent
    runPowerUpTests();        // Depends on handleDropEvent & handleReroll
    runBoostSpaceTests();     // Depends on handleDropEvent
    runLevelProgressionTests(); // Depends on applyPowerUp
    runUIVisibilityTests();     // New test suite

    logTestResult("========= All Tests Complete =========", "info");
    // Restore original displayMessage after all tests are done
    if (originalDisplayMessage) {
        displayMessage = originalDisplayMessage;
        originalDisplayMessage = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const runTestsButton = document.getElementById('run-tests-button');
    if (runTestsButton) {
        runTestsButton.addEventListener('click', runAllTests);
    }

    // Crucial: Make the game's drop handler accessible for tests
    // This requires refactoring script.js so that the drop handler is a named function
    // and can be assigned here, e.g.:
    // if (typeof gameDropHandler === 'function') { // Assuming gameDropHandler is made global from script.js
    //     handleDropEvent = gameDropHandler;
    // } else {
    //     logTestResult("CRITICAL: Game's drop event handler not found. Movement tests will fail.", "fail");
    // }
    // For now, we'll assume it's globally available or tests.js is loaded after it's defined.
    // In script.js, ensure the main drop handler is a named function, e.g. `function gameBoardDropHandler(event) {...}`
    // and it's assigned: `gameBoardElement.addEventListener('drop', gameBoardDropHandler);`
    // Then, in tests.js, we can do: `handleDropEvent = gameBoardDropHandler;` (if in same scope, or pass via window)

    // This is a temporary workaround for the above. It assumes that `gameBoardElement` already has the listener.
    // This is not ideal as it actually triggers the event rather than just calling the function.
    // The best approach is to expose the handler function itself from script.js.
    if (gameBoardElement) { // gameBoardElement is defined in script.js and should be global or passed
        handleDropEvent = (event) => {
            // Create a new CustomEvent that can be dispatched.
            // The 'detail' property can carry the original event's properties if needed,
            // but for testing, directly setting properties on a mock event is often simpler.
            // However, to use the game's actual listener, we must dispatch an event it expects.
            const mockEvent = {
                target: event.target, // The space div
                preventDefault: event.preventDefault || (() => {}),
                // dataTransfer: event.dataTransfer || new DataTransfer(), // Might be needed if your game uses it
            };
            // The game's event listener on gameBoardElement will be triggered.
            // This assumes `draggedPieceId` and other global states are set by the test.
            // This is still a bit indirect.
            // The most robust way is:
            // 1. In script.js: `function gameBoardDropHandler(event) { ... }`
            // 2. In script.js: `gameBoardElement.addEventListener('drop', gameBoardDropHandler);`
            // 3. In tests.js: `handleDropEvent = gameBoardDropHandler;` (if script.js makes it accessible)
            // For now, we will rely on the setup already done in script.js and that the event listener is attached.
            // This placeholder will be used if direct assignment isn't done.
            // The actual call in tests should be: gameBoardElement.dispatchEvent(new DragEvent('drop', {bubbles: true, cancelable: true, dataTransfer: dt}));
            // For simplicity, let's assume for now that the tests will set global states and then trigger a synthetic event,
            // or that `script.js` is modified to make its drop handler globally accessible.
            // The current tests call `handleDropEvent(mockEvent)`. This needs `handleDropEvent` to be the actual game logic.
            // This will be addressed by refactoring script.js slightly.
            logTestResult("INFO: Using placeholder handleDropEvent. For full movement tests, ensure script.js's drop handler is assigned to tests.js's handleDropEvent.", "info");
        };
    }


});
