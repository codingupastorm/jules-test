document.addEventListener('DOMContentLoaded', () => {
    // Game state variables
    let diceValues = []; // Raw dice roll (e.g., [3, 5])
    let activeDice = []; // Dice available for use in the current turn, values can be set to null (e.g., [3, null])
    let playerPiecePositions = {}; // e.g., { "piece-1": "space-1", "piece-2": "space-1" }
    
    let currentLevel = 1;
    const MAX_LEVELS = 10;
    let MINED_SPACES = []; // Will be set by level config
    let WINNING_SPACE_ID = ''; // Will be set by level config
    
    const LEVEL_CONFIGS = [
        // Columns are assumed to be 6 for now
        { levelNumber: 1, spaces: 18, rows: 3, mines: ['space-5', 'space-12', 'space-16'], boostSpaces: { 'space-3': 2, 'space-10': 3 } },
        { levelNumber: 2, spaces: 24, rows: 4, mines: ['space-4', 'space-10', 'space-15', 'space-22'], boostSpaces: { 'space-7': 3, 'space-18': 2 } },
        { levelNumber: 3, spaces: 30, rows: 5, mines: ['space-6', 'space-12', 'space-18', 'space-24', 'space-28'], boostSpaces: { 'space-5': 4, 'space-15': 3, 'space-25': 2 } },
        { levelNumber: 4, spaces: 18, rows: 3, mines: ['space-2', 'space-7', 'space-11', 'space-15'], boostSpaces: { 'space-4': 3 } }, // Shorter, more mines
        { levelNumber: 5, spaces: 24, rows: 4, mines: ['space-3', 'space-8', 'space-13', 'space-17', 'space-21'], boostSpaces: { 'space-6': 2, 'space-19': 3 } },
        { levelNumber: 6, spaces: 30, rows: 5, mines: ['space-5', 'space-10', 'space-15', 'space-20', 'space-25', 'space-29'] }, // No boost spaces this level
        { levelNumber: 7, spaces: 18, rows: 3, mines: ['space-1', 'space-3', 'space-5', 'space-7', 'space-9', 'space-11', 'space-13', 'space-15', 'space-17'], boostSpaces: { 'space-2': 5 } }, // Many mines, one big boost
        { levelNumber: 8, spaces: 24, rows: 4, mines: ['space-2', 'space-8', 'space-14', 'space-20'], boostSpaces: { 'space-5': 3, 'space-12': 2, 'space-19': 2 } },
        { levelNumber: 9, spaces: 30, rows: 5, mines: ['space-4', 'space-9', 'space-11', 'space-16', 'space-19', 'space-23', 'space-27'], boostSpaces: { 'space-2': 4, 'space-14': 3 } },
        { levelNumber: 10, spaces: 36, rows: 6, mines: ['space-6', 'space-12', 'space-18', 'space-24', 'space-30', 'space-35'], boostSpaces: { 'space-3': 3, 'space-10': 4, 'space-20': 2, 'space-28': 3 } }
    ];

    let gameOver = false; // True when a player has won the FINAL level, or explicitly quit.
    let roundOver = false; // True when a player has won the current round and power-up is being chosen.
    let awaitingPowerUpSelection = false; // True when the power-up modal is shown.

    // Power-up Definitions
    const POWER_UPS = [
        {
            id: 'extraLife',
            name: 'Extra Life',
            description: 'Avoid being sent back by a mine once.'
        },
        {
            id: 'safePassage',
            name: 'Safe Passage',
            description: 'Your next mine encounter is ignored.'
        },
        {
            id: 'rerollDie',
            name: 'Re-roll One Die',
            description: 'After rolling, choose one die to roll again (once).'
        }
        // Future power-ups can be added here
    ];

    // Player Power-up States - assuming piece IDs 'piece-1' and 'piece-2' correspond to players
    let playerPowerUps = {
        'piece-1': { extraLife: false, safePassage: false, rerollAvailable: false },
        'piece-2': { extraLife: false, safePassage: false, rerollAvailable: false }
    };
    
    let winningPlayerIdForPowerUp = null; // Stores the ID of the player who won the round
    let rerollUsedThisTurn = false; // Prevents using reroll multiple times if both players had it

    // DOM element references
    const pieces = [document.getElementById('piece-1'), document.getElementById('piece-2')];
    // const spaces = document.querySelectorAll('.space'); // Will be dynamic, so direct selection at start is less useful
    const gameBoardElement = document.getElementById('game-board'); // The main game board container
    const rollDiceButton = document.getElementById('roll-dice-button');
    const die1ValueDisplay = document.getElementById('die1-value');
    const die2ValueDisplay = document.getElementById('die2-value');
    const rerollDie1Button = document.getElementById('reroll-die1-button'); // New
    const rerollDie2Button = document.getElementById('reroll-die2-button'); // New
    const gameMessagesDisplay = document.getElementById('game-messages');
    const powerUpSelectionModal = document.getElementById('powerup-selection');
    const powerUpOptionsContainer = document.getElementById('powerup-options');
    const currentLevelDisplay = document.getElementById('current-level-display'); 

    // Drag state
    let draggedPieceId = null;
    let draggedPieceStartSpaceId = null;

    // --- Helper function to clear valid drop target highlights ---
    function clearValidDropTargets() {
        const targets = document.querySelectorAll('.valid-drop-target');
        targets.forEach(target => {
            target.classList.remove('valid-drop-target');
        });
    }

    // --- Helper function to display messages ---
    function displayMessage(message, type = 'info') {
        if (gameMessagesDisplay) {
            gameMessagesDisplay.textContent = message;
            gameMessagesDisplay.className = 'game-messages'; // Reset classes
            if (type === 'error') gameMessagesDisplay.classList.add('error');
            else if (type === 'win') gameMessagesDisplay.classList.add('win');
            else if (type === 'mine') gameMessagesDisplay.classList.add('mine');
            
            // Clear message after some time, unless it's a win or persistent error
            if (type !== 'win' && type !== 'error') {
                setTimeout(() => {
                    if (gameMessagesDisplay.textContent === message) { // Clear only if it's the same message
                        gameMessagesDisplay.textContent = '---';
                        gameMessagesDisplay.className = 'game-messages';
                    }
                }, 3000);
            }
        }
        console.log(`Msg: ${message} (Type: ${type})`);
    }

    // --- Game Initialization ---
    function initializeGame() {
        roundOver = false; // Start of a new round/level
        awaitingPowerUpSelection = false; 
        if (powerUpSelectionModal) powerUpSelectionModal.style.display = 'none';
        if (rollDiceButton) rollDiceButton.disabled = gameOver; 
        if (rerollDie1Button) rerollDie1Button.style.display = 'none'; // Hide reroll buttons
        if (rerollDie2Button) rerollDie2Button.style.display = 'none';
        rerollUsedThisTurn = false;


        const levelConfig = LEVEL_CONFIGS.find(cfg => cfg.levelNumber === currentLevel);
        if (!levelConfig) {
            console.error(`Configuration for level ${currentLevel} not found!`);
            displayMessage("Error: Level configuration missing. Game cannot continue.", "error");
            gameOver = true; // Stop the game
            if (rollDiceButton) rollDiceButton.disabled = true;
            return;
        }

        MINED_SPACES = levelConfig.mines;
        WINNING_SPACE_ID = `space-${levelConfig.spaces}`;

        // Dynamically create board spaces
        gameBoardElement.innerHTML = ''; // Clear existing spaces
        gameBoardElement.style.gridTemplateRows = `repeat(${levelConfig.rows}, 100px)`; // Assuming 100px fixed height for rows
        // gameBoardElement.style.gridTemplateColumns = `repeat(6, 1fr)`; // This is in CSS, can be confirmed or set here too

        for (let i = 0; i < levelConfig.spaces; i++) {
            const space = document.createElement('div');
            space.classList.add('space');
            space.id = `space-${i + 1}`;
            let textContent = `${i + 1}`;
            if (i === 0) textContent = `Start (1)`;
            if (i + 1 === levelConfig.spaces) textContent = `End (${i + 1})`;
            space.textContent = textContent;

            // Add class for boost spaces
            if (levelConfig.boostSpaces && levelConfig.boostSpaces[`space-${i + 1}`]) {
                space.classList.add('boost-space');
            }
            // Add class for visible mines
            if (MINED_SPACES.includes(`space-${i + 1}`)) { // MINED_SPACES is already set from levelConfig
                space.classList.add('mine-visible');
            }

            gameBoardElement.appendChild(space);
        }
        
        activeDice = []; 
        if (die1ValueDisplay) die1ValueDisplay.textContent = '0';
        if (die2ValueDisplay) die2ValueDisplay.textContent = '0';
        if (currentLevelDisplay) currentLevelDisplay.textContent = currentLevel;


        pieces.forEach(piece => {
            if (piece) {
                const startSpaceElement = document.getElementById('space-1'); // First space of the new board
                if (startSpaceElement) {
                    playerPiecePositions[piece.id] = 'space-1';
                    piece.dataset.currentSpaceId = 'space-1';
                    startSpaceElement.appendChild(piece); 
                    piece.setAttribute('draggable', 'true');
                } else {
                    console.error("Could not find space-1 to place pieces.");
                }
            }
        });
        
        positionPiecesInSameSquare(); 
        displayMessage(`Level ${currentLevel} Started. Roll dice to move.`, "info");
        if (gameOver) { // If game was marked as completely over (e.g. beat all levels)
             displayMessage("Congratulations! You've beaten all levels!", "win");
             if (rollDiceButton) rollDiceButton.disabled = true;
             pieces.forEach(p => p.setAttribute('draggable', 'false'));
        }
    }


    // --- Power-up Functions ---
    function offerPowerUps(playerId) {
        winningPlayerIdForPowerUp = playerId; 
        roundOver = true; // Mark round as over, awaiting powerup
        awaitingPowerUpSelection = true;
        if (rollDiceButton) rollDiceButton.disabled = true; 

        if (!powerUpSelectionModal || !powerUpOptionsContainer) {
            console.error("Power-up modal elements not found!");
            initializeGame(); // Failsafe: just restart the game
            return;
        }

        powerUpOptionsContainer.innerHTML = ''; // Clear previous options

        // Randomly select 2 power-ups (or all if fewer than 2 defined)
        const availablePowerUps = [...POWER_UPS];
        const selectedPowerUps = [];
        const numToSelect = Math.min(2, availablePowerUps.length);

        for (let i = 0; i < numToSelect; i++) {
            const randomIndex = Math.floor(Math.random() * availablePowerUps.length);
            selectedPowerUps.push(availablePowerUps.splice(randomIndex, 1)[0]);
        }

        if (selectedPowerUps.length === 0) {
             displayMessage("No power-ups available this round. Starting next round.", "info");
             setTimeout(initializeGame, 2000); // Start next round after a delay
             return;
        }

        selectedPowerUps.forEach(powerUp => {
            const button = document.createElement('button');
            button.innerHTML = `<span class="powerup-name">${powerUp.name}</span><span class="powerup-description">${powerUp.description}</span>`;
            button.onclick = () => applyPowerUp(powerUp); // Pass the whole powerUp object
            powerUpOptionsContainer.appendChild(button);
        });

        displayMessage(`${playerId.replace('piece-', 'Player ')} won the round! Choose a power-up to start the next level.`, 'win');
        powerUpSelectionModal.style.display = 'flex';
    }

    function applyPowerUp(powerUp) {
        if (!winningPlayerIdForPowerUp || !powerUp) {
            console.error("Error applying power-up: Missing player ID or power-up data.");
            if (powerUpSelectionModal) powerUpSelectionModal.style.display = 'none';
            initializeGame(); // Failsafe
            return;
        }

        // Universal application for boolean powerups
        if (typeof playerPowerUps[winningPlayerIdForPowerUp][powerUp.id] === 'boolean') {
            playerPowerUps[winningPlayerIdForPowerUp][powerUp.id] = true;
        }
        // Specific logic for other types if any in future.

        displayMessage(`${winningPlayerIdForPowerUp.replace('piece-', 'Player ')} selected ${powerUp.name}!`, 'info');
        // For debugging, show current powerups:
        console.log("Player PowerUps after selection:", JSON.stringify(playerPowerUps));
        
        if (powerUpSelectionModal) powerUpSelectionModal.style.display = 'none';
        
        currentLevel++;
        winningPlayerIdForPowerUp = null; 
        awaitingPowerUpSelection = false; // Done with selection

        if (currentLevel > MAX_LEVELS) {
            displayMessage("Congratulations! You've beaten all levels!", "win");
            gameOver = true; // Permanent game over
            if (rollDiceButton) rollDiceButton.disabled = true;
            pieces.forEach(p => p.setAttribute('draggable', 'false'));
        } else {
            initializeGame(); // Setup next level
        }
    }


    // --- Dice Rolling Functionality ---
    function rollDice() {
        if (gameOver || roundOver || awaitingPowerUpSelection) { 
            let message = "Cannot roll dice now.";
            if (gameOver) message = "Game is over. No more rolls.";
            else if (awaitingPowerUpSelection) message = "Choose your power-up!";
            else if (roundOver) message = "Round is over. Choose power-up or start next level.";
            displayMessage(message, 'info');
            return;
        }
        if (activeDice.some(die => die !== null) && !rerollUsedThisTurn) { // Allow reroll even if dice are active
            displayMessage("Use your current dice values first, or re-roll one!", 'error');
            return;
        }
        
        // Hide re-roll buttons before a new main roll
        if (rerollDie1Button) rerollDie1Button.style.display = 'none';
        if (rerollDie2Button) rerollDie2Button.style.display = 'none';
        rerollUsedThisTurn = false; // Reset flag for the new turn

        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        diceValues = [die1, die2];
        activeDice = [...diceValues]; 

        if (die1ValueDisplay) die1ValueDisplay.textContent = die1;
        if (die2ValueDisplay) die2ValueDisplay.textContent = die2;
        
        displayMessage(`Dice rolled: ${die1}, ${die2}. Drag a piece to move.`, 'info');
        console.log('Dice rolled:', diceValues, 'Active Dice:', activeDice);

        // Show re-roll buttons if power-up is available for any player piece
        // and this is the first roll of the turn (rerollUsedThisTurn is false)
        let canReroll = false;
        if (playerPowerUps['piece-1'].rerollAvailable || playerPowerUps['piece-2'].rerollAvailable) {
            canReroll = true;
        }

        if (canReroll && !rerollUsedThisTurn) {
            if (rerollDie1Button) rerollDie1Button.style.display = 'inline-block';
            if (rerollDie2Button) rerollDie2Button.style.display = 'inline-block';
            displayMessage(`Dice rolled: ${die1}, ${die2}. You can re-roll one die.`, 'info');
        }
    }

    // --- Re-roll Logic ---
    function setupRerollListeners() {
        if (rerollDie1Button) {
            rerollDie1Button.addEventListener('click', () => handleReroll(0));
        }
        if (rerollDie2Button) {
            rerollDie2Button.addEventListener('click', () => handleReroll(1));
        }
    }

    function handleReroll(dieIndex) {
        if (rerollUsedThisTurn || activeDice[dieIndex] === null) {
            displayMessage("Cannot re-roll now.", "error");
            return;
        }

        let powerUpOwnerId = null;
        if (playerPowerUps['piece-1'].rerollAvailable) {
            powerUpOwnerId = 'piece-1';
        } else if (playerPowerUps['piece-2'].rerollAvailable) {
            powerUpOwnerId = 'piece-2';
        }

        if (!powerUpOwnerId) {
            displayMessage("No re-roll power-up available!", "error");
            return;
        }

        const newDieValue = Math.floor(Math.random() * 6) + 1;
        diceValues[dieIndex] = newDieValue;
        activeDice[dieIndex] = newDieValue; // Ensure activeDice also reflects the change

        if (dieIndex === 0 && die1ValueDisplay) {
            die1ValueDisplay.textContent = newDieValue;
        } else if (dieIndex === 1 && die2ValueDisplay) {
            die2ValueDisplay.textContent = newDieValue;
        }

        playerPowerUps[powerUpOwnerId].rerollAvailable = false; // Consume power-up
        rerollUsedThisTurn = true; // Mark as used for this turn

        if (rerollDie1Button) rerollDie1Button.style.display = 'none';
        if (rerollDie2Button) rerollDie2Button.style.display = 'none';

        displayMessage(`Re-rolled Die ${dieIndex + 1} to ${newDieValue}. Remaining dice: ${activeDice.filter(d=>d!==null).join(', ')}`, "info");
        console.log("After reroll - DiceValues:", diceValues, "ActiveDice:", activeDice);
        console.log("Player PowerUps after reroll:", JSON.stringify(playerPowerUps));
    }

    // --- Piece Positioning Helper ---
    function positionPiecesInSameSquare() {
        const piece1 = document.getElementById('piece-1');
        const piece2 = document.getElementById('piece-2');

        if (!piece1 || !piece2) return;

        const parent1 = piece1.parentElement;
        const parent2 = piece2.parentElement;

        if (parent1 && parent1 === parent2) { // Both pieces are in the same square
            piece1.style.transform = 'translate(-10px, -5px)';
            piece2.style.transform = 'translate(10px, 5px)';
        } else { // Pieces are in different squares or one is not on board
            if (parent1 && parent1.classList.contains('space')) piece1.style.transform = 'translate(-50%, -50%)'; // Center piece1
            if (parent2 && parent2.classList.contains('space')) piece2.style.transform = 'translate(-50%, -50%)'; // Center piece2
        }
    }
    
    // --- Drag and Drop Functionality ---
    pieces.forEach(piece => {
        if (piece) {
            piece.addEventListener('dragstart', (event) => {
                if (gameOver || roundOver || awaitingPowerUpSelection) { 
                    event.preventDefault();
                    return;
                }
                if (activeDice.length === 0 || activeDice.every(d => d === null)) {
                    displayMessage("Roll the dice first!", 'error');
                    event.preventDefault();
                    return;
                }
                
                draggedPieceId = event.target.id;
                draggedPieceStartSpaceId = playerPiecePositions[draggedPieceId];
                event.dataTransfer.setData('text/plain', event.target.id);
                // event.target.style.opacity = '0.7'; // Visual cue

                // Highlight valid drop targets
                clearValidDropTargets(); // Clear any previous ones
                const startSpaceNumber = parseInt(draggedPieceStartSpaceId.split('-')[1]);
                const maxSpaceNumber = parseInt(WINNING_SPACE_ID.split('-')[1]);

                activeDice.forEach(dieValue => {
                    if (dieValue !== null) {
                        const targetSpaceNumber = startSpaceNumber + dieValue;
                        if (targetSpaceNumber > 0 && targetSpaceNumber <= maxSpaceNumber) {
                            const targetSpaceElement = document.getElementById(`space-${targetSpaceNumber}`);
                            if (targetSpaceElement) {
                                targetSpaceElement.classList.add('valid-drop-target');
                            }
                        }
                    }
                });
            });

            piece.addEventListener('dragend', (event) => {
                clearValidDropTargets();
                // event.target.style.opacity = '1'; // Reset opacity if it was changed
            });
        }
    });

    // Event Delegation for game board interactions
    if (gameBoardElement) {
        gameBoardElement.addEventListener('dragover', (event) => {
            if (gameOver || roundOver || awaitingPowerUpSelection) return;
            const targetSpace = event.target.closest('.space');
            if (targetSpace) {
                event.preventDefault(); // Allow drop only on spaces
            }
        });

        gameBoardElement.addEventListener('drop', (event) => {
            event.preventDefault();
            if (gameOver || roundOver || awaitingPowerUpSelection || !draggedPieceId) return;

            const draggedPiece = document.getElementById(draggedPieceId);
            const targetSpace = event.target.closest('.space');

            if (!draggedPiece || !targetSpace) {
                console.error("Drop error: Missing dragged piece or target space.");
                draggedPieceId = null; 
                return;
            }

            const startSpaceId = draggedPieceStartSpaceId;
            const targetSpaceId = targetSpace.id;

            if (startSpaceId === targetSpaceId) {
                displayMessage("Choose a different square.", "info");
                draggedPieceId = null;
                return;
            }
            
            const startSpaceNumber = parseInt(startSpaceId.split('-')[1]);
            const targetSpaceNumber = parseInt(targetSpaceId.split('-')[1]);

            if (isNaN(startSpaceNumber) || isNaN(targetSpaceNumber)) {
                displayMessage("Error with space ID parsing.", 'error');
                draggedPieceId = null;
                return;
            }

            const moveDistance = targetSpaceNumber - startSpaceNumber;

            if (moveDistance <= 0) {
                displayMessage("Invalid move! Must move forward.", 'error');
                draggedPieceId = null; 
                return;
            }

            let dieUsedIndex = -1;
            for (let i = 0; i < activeDice.length; i++) {
                if (activeDice[i] !== null && activeDice[i] === moveDistance) {
                    dieUsedIndex = i;
                    break;
                }
            }

            if (dieUsedIndex !== -1) { // Valid move
                targetSpace.appendChild(draggedPiece);
                playerPiecePositions[draggedPieceId] = targetSpaceId;
                draggedPiece.dataset.currentSpaceId = targetSpaceId;
                activeDice[dieUsedIndex] = null; 

                let message = `Moved ${draggedPieceId.replace('piece-', 'Player ')} by ${moveDistance}.`;

                let originalTargetSpaceId = targetSpaceId; // Store before potential boost
                let finalLandingSpaceId = targetSpaceId; // This will be updated by boost/mine logic

                function handlePostMoveChecks(currentPieceId, currentSpaceId) {
                    // Check for win condition first on any new square
                    if (currentSpaceId === WINNING_SPACE_ID) {
                        roundOver = true;
                        offerPowerUps(currentPieceId);
                        return true; // Win occurred
                    }

                    // Check for mines on the new square (if not a win)
                    if (MINED_SPACES.includes(currentSpaceId)) {
                        let mineMsg = ` Boom! ${currentPieceId.replace('piece-', 'Player ')} hit a mine on ${currentSpaceId}.`;
                        if (playerPowerUps[currentPieceId].safePassage) {
                            playerPowerUps[currentPieceId].safePassage = false;
                            mineMsg += " Safe Passage used!";
                            displayMessage(mineMsg, 'info');
                        } else if (playerPowerUps[currentPieceId].extraLife) {
                            playerPowerUps[currentPieceId].extraLife = false;
                            mineMsg += " Extra Life used!";
                            displayMessage(mineMsg, 'info');
                        } else {
                            mineMsg += " Sent back to Start!";
                            displayMessage(mineMsg, 'mine');
                            const firstSpaceEl = document.getElementById('space-1');
                            const pieceEl = document.getElementById(currentPieceId);
                            if (firstSpaceEl && pieceEl) {
                                firstSpaceEl.appendChild(pieceEl);
                                playerPiecePositions[currentPieceId] = 'space-1';
                                pieceEl.dataset.currentSpaceId = 'space-1';
                                finalLandingSpaceId = 'space-1'; // Update final landing for message
                            }
                        }
                        message = mineMsg;
                        return false; // Mine interaction happened, might not be a win
                    }
                    return false; // No win or mine
                }
                
                // Initial move message
                message = `Moved ${draggedPieceId.replace('piece-', 'Player ')} by ${moveDistance} to ${targetSpaceId}.`;
                displayMessage(message, 'info');


                if (handlePostMoveChecks(draggedPieceId, targetSpaceId)) { // Check win/mine on initial drop
                    // Win path is handled inside offerPowerUps which calls initializeGame
                } else {
                    // Check for Boost Space only if not a win and after initial mine check
                    const levelConfig = LEVEL_CONFIGS.find(cfg => cfg.levelNumber === currentLevel);
                    if (levelConfig.boostSpaces && levelConfig.boostSpaces[targetSpaceId]) {
                        const boostValue = levelConfig.boostSpaces[targetSpaceId];
                        message += ` Landed on a Boost Space! Moving ${boostValue} more.`;
                        
                        const currentSpaceNum = parseInt(targetSpaceId.split('-')[1]);
                        let newPositionNum = currentSpaceNum + boostValue;
                        const maxSpaces = levelConfig.spaces;
                        
                        if (newPositionNum > maxSpaces) {
                            newPositionNum = maxSpaces; // Cap at winning space
                        }
                        finalLandingSpaceId = `space-${newPositionNum}`;
                        
                        const boostedPiece = document.getElementById(draggedPieceId);
                        const newBoostedSpaceElement = document.getElementById(finalLandingSpaceId);

                        if (boostedPiece && newBoostedSpaceElement) {
                            newBoostedSpaceElement.appendChild(boostedPiece);
                            playerPiecePositions[draggedPieceId] = finalLandingSpaceId;
                            boostedPiece.dataset.currentSpaceId = finalLandingSpaceId;
                            message += ` Moved to ${finalLandingSpaceId}.`;
                            displayMessage(message, 'info');

                            // Re-check for win/mine on the boosted landing spot
                            handlePostMoveChecks(draggedPieceId, finalLandingSpaceId);
                        }
                    }
                }
                
                positionPiecesInSameSquare();

                if (activeDice.every(d => d === null) && !roundOver && !gameOver) {
                    displayMessage(message + (!MINED_SPACES.includes(finalLandingSpaceId) && !(levelConfig.boostSpaces && levelConfig.boostSpaces[originalTargetSpaceId]) ? " All dice used. Roll again!" : ""), 'info');
                }
            } else { 
                displayMessage(`Invalid move! Distance ${moveDistance} does not match an available die (${activeDice.filter(d => d !== null).join(' or ')}).`, 'error');
            }
            
            draggedPieceId = null; 
            draggedPieceStartSpaceId = null;
            clearValidDropTargets(); // Clear highlights after drop attempt
        });
    } else {
        console.error("Game board element not found for event delegation!");
    }

    // Event listener for the roll dice button
    if (rollDiceButton) {
        rollDiceButton.addEventListener('click', rollDice);
    }
    
    // Setup listeners for reroll buttons
    setupRerollListeners();

    // Initialize Game
    initializeGame(); // This will set up Level 1
});
