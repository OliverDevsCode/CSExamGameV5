const gameUI = document.getElementById('gameUI');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const retryButtonElement = document.getElementById('retryButton');
const leaderboardButtonElement = document.getElementById('leaderboardButton');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const bulletsElement = document.getElementById('bullets');
const speedElement = document.getElementById('speed');
const leaderboardScreen = document.getElementById('leaderboardScreen');
const leaderboardList = document.getElementById('leaderboard');
const leaderboardBackButton = document.getElementById('leaderboardBack');
const playPauseButton = document.getElementById('playPauseButton');
const viewLeaderboardButton = document.getElementById('viewLeaderboardButton');

// Add these constants at the top with the other DOM elements
const instructionsElement = document.querySelector('.game-container > p');

// Add touchControlsElement
const touchControlsElement = document.getElementById('touchControls');

// Images
let alienImage;
let playerImage;

// Game instance
let game;

const API_BASE = '';

// Remove the global keyState object as it will be moved to the Controls class

// This will run immediately when the script is loaded
document.addEventListener('DOMContentLoaded', function() {
    // load user-info
    const userInfoEl = document.getElementById('user-info');
    const storedName = localStorage.getItem('msal_userName');
    if (userInfoEl && storedName) {
        userInfoEl.innerText = `Welcome, ${storedName}`;
    }

    debugScreenVisibility("DOM Content Loaded");
    
    // Force override any conflicting styles
    gameOverScreen.style.display = "none";
    leaderboardScreen.style.display = "none";
    gameOverScreen.classList.add('hidden');
    leaderboardScreen.classList.add('hidden');
    
    // Always show controls regardless of device type
    touchControlsElement.classList.remove('hidden');
    
    // Update instructions based on screen size
    updateInstructions();
    
    // Add listener to update instructions when screen size changes
    window.addEventListener('resize', updateInstructions);
    
    // Detect devices with notches and add the appropriate class
    detectNotchedDevices();
});

// Function to update instructions based on screen size
function updateInstructions() {
    if (window.innerWidth <= 768) {
        // Hide or simplify instructions for mobile devices
        instructionsElement.textContent = "Tap to play";
        instructionsElement.style.fontSize = window.innerWidth <= 480 ? "0.5rem" : "0.7rem";
    } else {
        // Show full instructions for desktop
        instructionsElement.textContent = "Use WASD to move and space to shoot";
        instructionsElement.style.fontSize = "0.8rem";
    }
}

// Function to detect devices with notches (like iPhone X and newer)
function detectNotchedDevices() {
    // First check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // Add data attribute to track if device has a notch
    document.documentElement.setAttribute('data-has-notch', 'false');
    
    // Detection method 1: CSS supports env() variables (safe area insets)
    if (CSS.supports('padding-top: env(safe-area-inset-top)')) {
        console.log("Device supports safe area insets");
        document.documentElement.setAttribute('data-supports-safe-area', 'true');
        
        // iOS devices with a notch
        if (isIOS) {
            // Check aspect ratio - notched devices have ratio >= 2
            const aspectRatio = window.screen.height / window.screen.width;
            if (aspectRatio >= 2 || aspectRatio <= 0.5) { // Check both portrait and landscape
                document.body.classList.add('has-notch');
                document.documentElement.setAttribute('data-has-notch', 'true');
                console.log("iOS device with aspect ratio suggesting notch detected");
            }
        }
    }
    
    // Detection method 2: Check specific device dimensions
    const isNotchedIPhone = 
        // iPhone X/XS/11 Pro
        (window.screen.height === 812 && window.screen.width === 375) || 
        (window.screen.height === 375 && window.screen.width === 812) ||
        
        // iPhone XR/11, XS Max/11 Pro Max
        (window.screen.height === 896 && window.screen.width === 414) || 
        (window.screen.height === 414 && window.screen.width === 896) ||
        
        // iPhone 12/12 Pro/13/13 Pro
        (window.screen.height === 844 && window.screen.width === 390) || 
        (window.screen.height === 390 && window.screen.width === 844) ||
        
        // iPhone 12 Pro Max/13 Pro Max
        (window.screen.height === 926 && window.screen.width === 428) || 
        (window.screen.height === 428 && window.screen.width === 926) ||
        
        // iPhone 14/14 Pro
        (window.screen.height === 852 && window.screen.width === 393) || 
        (window.screen.height === 393 && window.screen.width === 852) ||
        
        // iPhone 14 Pro Max/15 Pro Max
        (window.screen.height === 932 && window.screen.width === 430) ||
        (window.screen.height === 430 && window.screen.width === 932) ||
        
        // iPhone 15/15 Pro
        (window.screen.height === 852 && window.screen.width === 393) ||
        (window.screen.height === 393 && window.screen.width === 852);

    if (isNotchedIPhone) {
        document.body.classList.add('has-notch');
        document.documentElement.setAttribute('data-has-notch', 'true');
        console.log("Detected iPhone model with notch by exact dimensions");
        
        // Add extra padding to game container for notched iPhones
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            // This padding is added once during initialization
            gameContainer.style.paddingTop = "env(safe-area-inset-top, 10px)";
        }
    }
    
    // Add listener for orientation changes to reapply the detection
    window.addEventListener('orientationchange', function() {
        // Short delay to allow screen dimensions to update
        setTimeout(() => {
            detectNotchedDevices();
        }, 100);
    });
    
    // Apply safe area insets regardless of notch detection
    // This ensures devices with future notches will still work
    document.body.style.paddingTop = "env(safe-area-inset-top, 10px)";
}

// Add new Controls class
class Controls {
    constructor(game) {
        this.game = game;
        this.keyState = {
            w: false,
            a: false,
            s: false,
            d: false
        };
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Remove existing event listeners if they exist to prevent duplicates
        window.removeEventListener('keydown', this._handleKeyDown);
        window.removeEventListener('keyup', this._handleKeyUp);
        
        // Store bound methods for potential future removal
        this._handleKeyDown = this.handleKeyDown.bind(this);
        this._handleKeyUp = this.handleKeyUp.bind(this);
        
        // Add event listeners with stored bound methods
        window.addEventListener('keydown', this._handleKeyDown);
        window.addEventListener('keyup', this._handleKeyUp);
        
        // Debug output
        console.log("Controls: Event listeners set up");
    }
    
    handleKeyDown(event) {
        const key = event.key.toLowerCase();
        
        // Debug the key press
        console.log(`Key pressed: ${key}`);
        
        // Handle Escape key for pausing/unpausing - with improved handling
        if (key === 'escape') {
            console.log("Escape key detected, game over state:", this.game.isGameOver);
            
            // Only toggle pause if game is not over
            if (!this.game.isGameOver) {
                console.log("Toggling pause. Current state:", this.game.isPaused);
                // Force immediate pause/unpause with explicit state changes
                if (this.game.isPaused) {
                    this.game.setPaused(false);
                } else {
                    this.game.setPaused(true);
                }
            }
            // Prevent default action & event bubbling
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        
        // Handle space key for firing (only if game is not paused)
        if (key === ' ' && !this.game.isPaused && !this.game.isGameOver) {
            this.game.fireBullet();
            event.preventDefault();
            return;
        }
        
        // Update key state (only if game is running)
        if ((key === 'a' || key === 'w' || key === 's' || key === 'd')) {
            this.keyState[key] = true;
            
            // Only update player direction if the game is active
            if (!this.game.isPaused && !this.game.isGameOver) {
                this.updatePlayerDirection();
            }
        }
    }
    
    handleKeyUp(event) {
        const key = event.key.toLowerCase();
        
        // Update key state when keys are released
        if (key === 'a' || key === 'w' || key === 's' || key === 'd') {
            this.keyState[key] = false;
            this.updatePlayerDirection();
        }
    }
    
    updatePlayerDirection() {
        // Calculate x direction
        let xdir = 0;
        if (this.keyState.a) xdir -= 1;
        if (this.keyState.d) xdir += 1;
        
        // Calculate y direction
        let ydir = 0;
        if (this.keyState.w) ydir -= 1;
        if (this.keyState.s) ydir += 1;
        
        // Update player direction
        if (this.game && this.game.player) {
            this.game.updatePlayerDirection(xdir, ydir);
        }
    }
}

// Add global scaling variables
let scaleFactor = 1;
let baseWidth = 900; // Base width for scaling calculations
let baseHeight = 600; // Base height for scaling calculations

class Game {
    constructor() {
        this.player = null;
        this.aliens = [];
        this.fastAliens = [];
        this.shooterAliens = []; // Add shooter aliens array
        this.bullets = [];
        this.enemyBullets = []; // Add enemy bullets array
        this.bulletBox = null; // Single bullet box instead of an array
        this.lives = 3;
        this.score = 0;
        this.speedMultiplier = 1;
        this.bulletCount = 10;
        this.isGameOver = false;
        this.isPaused = true; // Start paused initially
        this.lastShotTime = 0; // Track player's last shot time
        this.playerCooldown = 300; // Cooldown in milliseconds (300ms = 0.3 seconds)
        
        // New properties for alien management
        this.maxAliensOnScreen = 10; // Maximum total aliens allowed on screen
        this.shooterProbability = 0.1; // Initial 10% chance for a new alien to be a shooter
        
        // Create leaderboard
        this.leaderboard = new Leaderboard();
        
        // Bind methods to preserve 'this' context
        this.reset = this.reset.bind(this);
        this.gameOver = this.gameOver.bind(this);
        
        // Add bullet pools
        this.bulletPool = [];
        this.enemyBulletPool = [];
        this.maxBullets = 50;
        this.maxEnemyBullets = 30;
        
        // Add bullet batch processing
        this.bulletUpdateInterval = 2; // Update every 2 frames
        this.currentFrame = 0;
        
        // Add controls property
        this.controls = null;
        
        // Add touch controls property
        this.touchControls = null;
    }
    
    setup() {
        debugScreenVisibility("Game Setup");
        
        // Force hide screens with both class and style
        gameOverScreen.classList.add('hidden');
        leaderboardScreen.classList.add('hidden');
        gameOverScreen.style.display = "none";
        leaderboardScreen.style.display = "none";
        
        // Create player
        this.reset();
        
        // Setup game intervals - use fewer intervals and longer times
        this.spawnAliensInterval = setInterval(() => this.spawnAliens(), 8000); // Slower spawn rate
        this.increaseSpeedInterval = setInterval(() => this.increaseSpeed(), 15000); // Slower speed increase
        this.addBulletInterval = setInterval(() => this.addBullet(), 2000); // Slower bullet regen
        this.spawnBulletBoxInterval = setInterval(() => this.spawnBulletBox(), 10000); // Slower box spawn
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize controls
        this.controls = new Controls(this);
        
        // Initialize touch controls for all devices
        this.touchControls = new TouchControls(this);
        
        // Start in paused state
        this.setPaused(true);
        noLoop();
    }
    
    setupEventListeners() {
        // Reset button
        retryButtonElement.onclick = this.reset;
        
        // Leaderboard button
        leaderboardButtonElement.onclick = () => {
            const playerName = prompt("Enter your name for the leaderboard:", "Player");
            if (playerName) {
                this.leaderboard.addScore(playerName, this.score);
                this.leaderboard.displayLeaderboard();
                gameOverScreen.classList.add('hidden');
                leaderboardScreen.classList.remove('hidden');
            }
        };
        
        // Play/Pause button
        playPauseButton.onclick = () => {
            this.togglePause();
        };
        
        // View Leaderboard button
        viewLeaderboardButton.onclick = () => {
            // Only show leaderboard if game is paused
            this.setPaused(true);
            this.leaderboard.displayLeaderboard();
            gameOverScreen.classList.add('hidden');
            leaderboardScreen.classList.remove('hidden');
            leaderboardScreen.style.display = "flex";
        };
        
        // Back button
        leaderboardBackButton.addEventListener('click', () => {
            leaderboardScreen.classList.add('hidden');
            leaderboardScreen.style.display = "none";
            // Don't automatically reset, just go back to paused/playing game
            if (!this.isGameOver) {
                // Resume the game if it wasn't game over
                this.setPaused(false);
            } else {
                // If it was game over, start a new game
                this.reset();
            }
        });
    }
    
    // Add new methods to handle pause state
    togglePause() {
        if (this.isGameOver) {
            console.log("Toggle pause ignored - game is over");
            return;
        }
        
        console.log(`Toggling pause from ${this.isPaused} to ${!this.isPaused}`);
        this.setPaused(!this.isPaused);
    }
    
    setPaused(value) {
        // Force convert to boolean to handle any unexpected input
        const shouldPause = Boolean(value);
        
        // Debug output
        console.log(`SetPaused called with: ${shouldPause}, current state: ${this.isPaused}`);
        
        // Check if the state is actually changing
        if (this.isPaused === shouldPause) {
            console.log("Pause state unchanged");
            return;
        }
        
        this.isPaused = shouldPause;
        
        if (this.isPaused) {
            // Pause the game
            playPauseButton.textContent = "Play";
            playPauseButton.classList.remove('pause-button');
            playPauseButton.classList.add('play-button');
            
            // Stop the game loop
            console.log("Calling noLoop() to pause game");
            noLoop();
            
            // Force update UI
            this.updateGameUI();
            
            // Debug message
            console.log("Game paused by setPaused");
        } else {
            // Unpause the game
            playPauseButton.textContent = "Pause";
            playPauseButton.classList.remove('play-button');
            playPauseButton.classList.add('pause-button');
            
            // Resume the game loop
            console.log("Calling loop() to resume game");
            loop();
            
            // Force update UI
            this.updateGameUI();
            
            // Debug message
            console.log("Game resumed by setPaused");
        }
    }
    
    reset() {
        debugScreenVisibility("Game Reset");

        // Clear existing intervals to avoid duplicates
        if (this.spawnBulletBoxInterval) {
            clearInterval(this.spawnBulletBoxInterval);
        }
        if (this.spawnAliensInterval) {
            clearInterval(this.spawnAliensInterval);
        }
        if (this.increaseSpeedInterval) {
            clearInterval(this.increaseSpeedInterval);
        }
        if (this.addBulletInterval) {
            clearInterval(this.addBulletInterval);
        }
        
        this.player = new Player();
        this.aliens = [];
        this.fastAliens = [];
        this.shooterAliens = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.bulletBox = null; // Reset to null
        this.lives = 3;
        this.score = 0;
        this.speedMultiplier = 1;
        this.bulletCount = 10;
        this.isGameOver = false;
        this.isPaused = true; // Start paused on reset too
        this.lastShotTime = 0;
        this.shooterProbability = 0.1; // Reset shooter probability
        this.maxAliensOnScreen = 10; // Reset max aliens
        
        playPauseButton.classList.remove('pause-button');
        playPauseButton.classList.add('play-button');
        playPauseButton.textContent = "Play";
        
        // Setup game intervals again - with optimized timing
        this.spawnAliensInterval = setInterval(() => this.spawnAliens(), 8000);
        this.increaseSpeedInterval = setInterval(() => this.increaseSpeed(), 15000);
        this.addBulletInterval = setInterval(() => this.addBullet(), 8000);
        this.spawnBulletBoxInterval = setInterval(() => {
            console.log("Attempting to spawn bullet box"); // Debug output
            this.spawnBulletBox();
        }, 10000);
        
        // Add initial aliens (fewer)
        this.spawnAliens(2); // Start with just 2 aliens
        
        // Create initial bullet box
        this.spawnBulletBox();
        
        // Hide screens with both class and style
        gameOverScreen.classList.add('hidden');
        leaderboardScreen.classList.add('hidden');
        gameOverScreen.style.display = "none";
        leaderboardScreen.style.display = "none";
        
        // Stop the game loop since we're starting paused
        noLoop();
        
        // Reinitialize controls if needed
        if (!this.controls) {
            this.controls = new Controls(this);
        }
        
        // Always initialize touch controls
        if (!this.touchControls) {
            this.touchControls = new TouchControls(this);
        } else {
            // Reset joystick position
            this.touchControls.resetJoystick();
        }
    }
    
    update() {
        // Don't update if game is over
        if (this.isGameOver) return;
        
        this.currentFrame++;
        
        this.updateGameUI();
        this.player.show();
        this.player.move();
        
        // Update touch controls if they exist
        if (this.touchControls) {
            this.touchControls.update();
        }
        
        // Process bullets in batches to improve performance
        const isUpdateFrame = this.currentFrame % this.bulletUpdateInterval === 0;
        
        // Update bullets with optimized code
        const maxBulletsToProcess = Math.min(this.bullets.length, 20); // Reduced from 30
        for (let i = maxBulletsToProcess - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // Always show bullets for smooth visuals
            bullet.show();
            
            // Only move and check boundaries on update frames
            if (isUpdateFrame) {
                bullet.move();
                
                // Remove bullets that go off screen and recycle them
                if (bullet.y < 0) {
                    this.recycleBullet(i);
                }
            }
        }
        
        // Update enemy bullets with optimized code
        const maxEnemyBulletsToProcess = Math.min(this.enemyBullets.length, 15); // Reduced from 20
        for (let i = maxEnemyBulletsToProcess - 1; i >= 0; i--) {
            const enemyBullet = this.enemyBullets[i];
            
            // Always show bullets
            enemyBullet.show();
            
            // Only move and check boundaries on update frames
            if (isUpdateFrame) {
                enemyBullet.move();
                
                // Remove bullets that go off screen and recycle them
                if (enemyBullet.y > height) {
                    this.recycleEnemyBullet(i);
                }
            }
        }
        
        // Update aliens
        for (let alien of this.aliens) {
            alien.show();
            alien.move();
        }
        
        for (let fastAlien of this.fastAliens) {
            fastAlien.show();
            fastAlien.move();
        }

        for (let shooterAlien of this.shooterAliens) {
            shooterAlien.show();
            shooterAlien.move();
            
            // Less frequent shooting but increases with game speed
            if (random() < 0.005 * this.speedMultiplier) { // Reduced from 0.01
                this.spawnShooterAlienBullet(shooterAlien);
            }
        }

        // Show bullet box if it exists
        if (this.bulletBox) {
            this.bulletBox.show();
        }
        
        // Only perform collision detection on update frames
        if (isUpdateFrame) {
            this.checkCollisions();
            this.checkPlayerHit();
            this.checkBulletBoxCollision(); // Changed from plural to singular
            this.checkEnemyBulletCollisions();
        }
    }
    
    updateGameUI() {
        scoreElement.innerHTML = `Score: ${this.score}`;
        livesElement.innerHTML = `Lives: ${this.lives}`;
        bulletsElement.innerHTML = `Bullets: ${this.bulletCount}`;
        speedElement.innerHTML = `Speed: ${this.speedMultiplier.toFixed(2)}x`;
    }
    
    // Modified to take count parameter with default of 3 (down from 5)
    spawnAliens(count = 3) {
        // Check if we're at the alien limit already
        const totalAliens = this.aliens.length + this.fastAliens.length + this.shooterAliens.length;
        if (totalAliens >= this.maxAliensOnScreen) return;
        
        // Calculate how many aliens we can safely add
        const availableSlots = this.maxAliensOnScreen - totalAliens;
        const aliensToAdd = Math.min(count, availableSlots);
        
        // Limit max shooter aliens to 3
        const maxShooterAliens = 3;
        const currentShooterCount = this.shooterAliens.length;
        
        for (let i = 0; i < aliensToAdd; i++) {
            // Random position across the top of the screen, accounting for alien size
            const x = random(width - (60 * scaleFactor));
            const yPos = 40 * scaleFactor; // Scale starting Y position
            
            // Only allow new shooter if we're below the max
            if (random() < this.shooterProbability && currentShooterCount < maxShooterAliens) {
                this.shooterAliens.push(new ShooterAlien(x, yPos, this.speedMultiplier));
            } 
            // As game progresses, chance for fast aliens increases
            else if (random() < this.speedMultiplier / 10) {
                this.fastAliens.push(new FastAlien(x, yPos * 1.5, this.speedMultiplier));
            } 
            // Otherwise regular alien
            else {
                this.aliens.push(new Alien(x, yPos, this.speedMultiplier));
            }
        }
    }
    
    increaseSpeed() {
        // Increase speed more gradually
        if (this.speedMultiplier < 64) {
            this.speedMultiplier *= 1.2; // Slower increase (1.2x instead of 1.5x)
            
            // Cap at exactly 64x if we exceed it
            if (this.speedMultiplier > 64) {
                this.speedMultiplier = 64;
            }
            
            // Also increase shooter probability as game gets harder
            this.shooterProbability = Math.min(0.7, this.shooterProbability + 0.05);
            
            // Also gradually increase max aliens allowed
            if (this.maxAliensOnScreen < 20) {
                this.maxAliensOnScreen += 1;
            }
        }
    }
    
    addBullet() {
        this.bulletCount++;
    }
    
    fireBullet() {
        const currentTime = millis();
        const timeSinceLastShot = currentTime - this.lastShotTime;
        
        // Check cooldown and bullet count
        if (timeSinceLastShot >= this.playerCooldown && this.bulletCount > 0) {
            // Get a bullet from the pool or create a new one
            let bullet;
            if (this.bulletPool.length > 0) {
                bullet = this.bulletPool.pop();
                bullet.reset(this.player.x + this.player.size / 2, this.player.y);
            } else {
                bullet = new Bullet(this.player.x + this.player.size / 2, this.player.y);
            }
            
            this.bullets.push(bullet);
            this.bulletCount--;
            this.lastShotTime = currentTime;
            
            // Cap bullet array size
            if (this.bullets.length > this.maxBullets) {
                this.bullets.splice(0, this.bullets.length - this.maxBullets);
            }
        }
    }

    spawnBulletBox() {
        // Only spawn if we don't already have a box
        if (!this.bulletBox) {
            // Random position along the bottom of the screen
            const x = random(width - (40 * scaleFactor)); // Scale box width
            const y = height - (80 * scaleFactor); // Scale position
            console.log("Spawning bullet box at:", x, y); // Debug output
            this.bulletBox = new BulletBox(x, y);
        }
    }
    
    checkBulletBoxCollision() {
        if (this.bulletBox && this.bulletBox.hits(this.player)) {
            // Give player 7 bullets
            this.bulletCount += 7;
            console.log("Bullet box collected! Bullets: " + this.bulletCount); // Debug output
            this.bulletBox = null; // Remove the box
        }
    }
    
    updatePlayerDirection(xdir, ydir) {
        this.player.setDir(xdir, ydir);
    }
    
    checkCollisions() {
        // Create a map of active bullets for quick lookup
        const activeBullets = new Set();
        
        // First pass: Check only bullets that might hit something
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            let hitDetected = false;
            
            // Check regular aliens
            for (let j = this.aliens.length - 1; j >= 0; j--) {
                if (bullet.hits(this.aliens[j])) {
                    this.score += 10;
                    this.aliens.splice(j, 1);
                    hitDetected = true;
                    break;
                }
            }
            
            if (hitDetected) {
                this.recycleBullet(i);
                continue;
            }
            
            // Check fast aliens
            for (let k = this.fastAliens.length - 1; k >= 0; k--) {
                if (bullet.hits(this.fastAliens[k])) {
                    this.score += 20;
                    this.fastAliens.splice(k, 1);
                    hitDetected = true;
                    break;
                }
            }
            
            if (hitDetected) {
                this.recycleBullet(i);
                continue;
            }
            
            // Check shooter aliens
            for (let l = this.shooterAliens.length - 1; l >= 0; l--) {
                if (bullet.hits(this.shooterAliens[l])) {
                    this.score += 30;
                    this.shooterAliens.splice(l, 1);
                    hitDetected = true;
                    break;
                }
            }
            
            if (hitDetected) {
                this.recycleBullet(i);
            } else {
                activeBullets.add(bullet);
            }
        }
    }
    
    checkPlayerHit() {
        for (let i = this.aliens.length - 1; i >= 0; i--) {
            if (this.aliens[i].hits(this.player)) {
                this.lives -= 1;
                this.aliens.splice(i, 1);
                console.log("Player hit! Lives:", this.lives);
                if (this.lives <= 0) {
                    console.log("Player died! Game over!");
                    this.gameOver();
                }
            }
        }
        
        for (let i = this.fastAliens.length - 1; i >= 0; i--) {
            if (this.fastAliens[i].hits(this.player)) {
                this.lives -= 1;
                this.fastAliens.splice(i, 1);
                console.log("Player hit by fast alien! Lives:", this.lives);
                if (this.lives <= 0) {
                    console.log("Player died! Game over!");
                    this.gameOver();
                }
            }
        }
    }
    
    checkEnemyBulletCollisions() {
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            if (this.enemyBullets[i].hits(this.player)) {
                this.lives -= 1;
                this.enemyBullets.splice(i, 1);
                console.log("Player hit by enemy bullet! Lives:", this.lives);
                if (this.lives <= 0) {
                    console.log("Player died! Game over!");
                    this.gameOver();
                }
            }
        }
    }
    
    gameOver() {

        let userInfoEl = document.getElementById('user-info');
        let playerName = "";

        if (userInfoEl) {
            playerName = userInfoEl.innerText.trim();
        }
        if (playerName.startsWith("Welcome, ")) {
            playerName = playerName.replace("Welcome, ", "");
        }
        if (!playerName) {
            playerName = localStorage.getItem('msal_userName') || "Player";
        }

        if (playerName) {
            fetch(`${API_BASE}/api/score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentName: playerName,
                    score: this.score,
                    scoreSource: "InvadersV2"
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error) || "Unknown error" });
                }
                return response.json();
            })
            .catch(error => {
                console.error("Error submitting score:", error);
                alert("Score submission failed: " + error.message);
            });
        } else {
            alert("No user info found; score not submitted.");
        }

        debugScreenVisibility("Game Over Called");
        
        this.isGameOver = true;
        this.isPaused = true; // Consider game paused when it's over
        playPauseButton.classList.remove('pause-button');
        playPauseButton.classList.add('play-button');
        playPauseButton.textContent = "Play"; // Update button text
        noLoop();
        
        // Update final score
        finalScoreElement.textContent = `Your final score: ${this.score}`;
        
        // Force show game over screen with multiple techniques
        gameOverScreen.classList.remove('hidden');
        gameOverScreen.style.display = "flex";
        gameOverScreen.style.visibility = "visible";
        gameOverScreen.style.opacity = "1";
        gameOverScreen.style.pointerEvents = "auto";
        
        // Clear any queued timeouts to prevent conflicts
        if (this._gameOverTimeout) clearTimeout(this._gameOverTimeout);
        
        // Double check visibility after a short delay with increasing timeouts
        this._gameOverTimeout = setTimeout(() => {
            debugScreenVisibility("Game Over - First Timeout Check");
            gameOverScreen.classList.remove('hidden');
            gameOverScreen.style.display = "flex";
            
            // Try again after a longer delay as a fallback
            setTimeout(() => {
                debugScreenVisibility("Game Over - Second Timeout Check");
                gameOverScreen.classList.remove('hidden');
                gameOverScreen.style.display = "flex";
                gameOverScreen.style.visibility = "visible";
            }, 300);
        }, 100);
    }
    
    // Add methods for bullet recycling and pooling
    recycleBullet(index) {
        const bullet = this.bullets[index];
        this.bulletPool.push(bullet);
        this.bullets.splice(index, 1);
    }
    
    recycleEnemyBullet(index) {
        const bullet = this.enemyBullets[index];
        this.enemyBulletPool.push(bullet);
        this.enemyBullets.splice(index, 1);
    }
    
    // Modified shooterAlien bullet generation
    spawnShooterAlienBullet(shooterAlien) {
        // Get a bullet from the pool or create a new one
        let bullet;
        if (this.enemyBulletPool.length > 0) {
            bullet = this.enemyBulletPool.pop();
            bullet.reset(shooterAlien.x + shooterAlien.size / 2, 
                         shooterAlien.y + shooterAlien.size);
        } else {
            bullet = new EnemyBullet(shooterAlien.x + shooterAlien.size / 2, 
                                     shooterAlien.y + shooterAlien.size);
        }
        
        this.enemyBullets.push(bullet);
        
        // Cap enemy bullet array size
        if (this.enemyBullets.length > this.maxEnemyBullets) {
            this.enemyBullets.splice(0, this.enemyBullets.length - this.maxEnemyBullets);
        }
    }
}

class Leaderboard {
    constructor() {
        // Load existing scores from localStorage
        const savedScores = localStorage.getItem('spaceInvadersScores');
        this.scores = savedScores ? JSON.parse(savedScores) : [];
    }
    
    addScore(name, score) {
        this.scores.push({name, score, date: new Date().toLocaleDateString()});
        this.scores.sort((a, b) => b.score - a.score);
        // Keep only top 10 scores
        this.scores = this.scores.slice(0, 10);
        // Save to localStorage
        localStorage.setItem('spaceInvadersScores', JSON.stringify(this.scores));
    }
    
    getTopScores(count = 10) {
        return this.scores.slice(0, count);
    }
    
    displayLeaderboard() {
        // Clear current list
        leaderboardList.innerHTML = '';
        
        // Get top scores
        const topScores = this.getTopScores();
        
        if (topScores.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.textContent = 'No scores yet. Be the first!';
            leaderboardList.appendChild(emptyItem);
            return;
        }
        
        // Add scores to leaderboard
        topScores.forEach((scoreData, index) => {
            const scoreItem = document.createElement('li');
            scoreItem.innerHTML = `<span class="rank">#${index + 1}</span> <span class="name">${scoreData.name}</span> <span class="score">${scoreData.score}</span> <span class="date">${scoreData.date}</span>`;
            leaderboardList.appendChild(scoreItem);
        });
    }
}

function preload() {
    alienImage = loadImage('./alien.png');
    playerImage = loadImage('./player.png');
}

function setup() {
    debugScreenVisibility("Setup Function");
    
    // Immediately hide both screens
    gameOverScreen.classList.add('hidden');
    leaderboardScreen.classList.add('hidden');
    gameOverScreen.style.display = "none";
    leaderboardScreen.style.display = "none";
    
    // Create responsive canvas based on container size
    const gameContainer = document.getElementById('gameCanvas');
    const containerWidth = gameContainer.offsetWidth;
    
    // Calculate mobile-friendly scale factor (larger for small screens)
    calculateScaleFactor(containerWidth);
    
    // Calculate canvas height - use more screen space on mobile
    let canvasHeight;
    if (window.innerWidth <= 768) {
        // For mobile: use more screen height (85%)
        canvasHeight = Math.min(containerWidth * 0.75, window.innerHeight * 0.85);
    } else {
        // For desktop: maintain standard ratio
        const aspectRatio = baseHeight / baseWidth;
        canvasHeight = Math.min(containerWidth * aspectRatio, window.innerHeight * 0.75);
    }
    
    console.log("Canvas size:", containerWidth, "x", canvasHeight, "Scale factor:", scaleFactor);
    
    // Create canvas with responsive dimensions
    let canvas = createCanvas(containerWidth, canvasHeight);
    canvas.parent('gameCanvas');
    
    // Create and setup the game
    game = new Game();
    game.setup();
    
    // Make sure the game starts paused
    noLoop();
    
    // Setup window resize handler
    window.addEventListener('resize', windowResized);
    
    // Add a backup global keypress handler for Escape key
    window.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && game && !game.isGameOver) {
            console.log("Backup escape handler triggered");
            game.togglePause();
            event.preventDefault();
        }
    });
}

// New function to calculate scale factor with enhanced mobile scaling
function calculateScaleFactor(containerWidth) {
    if (window.innerWidth <= 480) {
        // Extra scaling for very small screens
        scaleFactor = Math.max(containerWidth / baseWidth, 0.6);
        // Ensure minimum scaling even on tiny screens
        scaleFactor = Math.max(scaleFactor, 0.5);
    } else if (window.innerWidth <= 768) {
        // More scaling for tablets/medium screens
        scaleFactor = Math.max(containerWidth / baseWidth, 0.7);
    } else {
        // Standard scaling for desktops
        scaleFactor = containerWidth / baseWidth;
    }
}

function windowResized() {
    // Resize canvas when window size changes
    const gameContainer = document.getElementById('gameCanvas');
    const containerWidth = gameContainer.offsetWidth;
    
    // Recalculate scale factor for new window size
    calculateScaleFactor(containerWidth);
    
    // Calculate mobile-friendly canvas height
    let canvasHeight;
    if (window.innerWidth <= 768) {
        // For mobile: use more screen height
        canvasHeight = Math.min(containerWidth * 0.75, window.innerHeight * 0.85);
    } else {
        // For desktop: maintain standard ratio
        const aspectRatio = baseHeight / baseWidth;
        canvasHeight = Math.min(containerWidth * aspectRatio, window.innerHeight * 0.75);
    }
    
    console.log("New canvas size:", containerWidth, "x", canvasHeight, "Scale factor:", scaleFactor);
    
    // Resize the canvas
    resizeCanvas(containerWidth, canvasHeight);
    
    // If we have a player, make sure it stays in bounds
    if (game && game.player) {
        game.player.x = constrain(game.player.x, 0, width - (60 * scaleFactor));
        game.player.y = constrain(game.player.y, 0, height - (60 * scaleFactor));
    }
    
    // Reset joystick position when window is resized
    if (game && game.touchControls) {
        // Use setTimeout to ensure the DOM has updated
        setTimeout(() => {
            game.touchControls.resetJoystick();
        }, 100);
    }
    
    // Update instructions
    updateInstructions();
    
    // Recheck for notches on resize (handles orientation changes)
    detectNotchedDevices();
}

function draw() {
    background(173, 216, 230);
    
    // Update pause status display
    if (game.isPaused) {
        // Display paused state
        if (game.player) game.player.show();
        
        // Show all game objects in their current positions
        game.aliens.forEach(alien => alien.show());
        game.fastAliens.forEach(fastAlien => fastAlien.show());
        game.shooterAliens.forEach(shooterAlien => shooterAlien.show());
        game.bullets.forEach(bullet => bullet.show());
        game.enemyBullets.forEach(enemyBullet => enemyBullet.show());
        if (game.bulletBox) game.bulletBox.show();
        
        // Show "PAUSED" text - with scaled font size
        textAlign(CENTER, CENTER);
        textSize(36 * scaleFactor);
        fill(255, 255, 255, 180);
        stroke(0);
        strokeWeight(3 * scaleFactor);
        text("PAUSED", width / 2, height / 2);
        
        // Update UI to ensure it shows correct state
        game.updateGameUI();
    } else {
        // Game is running - update everything
        game.update();
    }
}

class Player {
    constructor() {
        this.x = width / 2;
        this.y = height - (60 * scaleFactor);
        this.xdir = 0;
        this.ydir = 0;
        this.speed = 5 * scaleFactor; // Scale speed
        this.size = 60 * scaleFactor; // Scale size
    }

    show() {
        image(playerImage, this.x, this.y, this.size, this.size);
    }

    setDir(xdir, ydir) {
        this.xdir = xdir;
        this.ydir = ydir;
    }

    move() {
        // Check if moving diagonally
        if (this.xdir !== 0 && this.ydir !== 0) {
            // Normalize diagonal movement
            const diagSpeed = this.speed / Math.sqrt(2);
            this.x += this.xdir * diagSpeed;
            this.y += this.ydir * diagSpeed;
        } else {
            // Regular cardinal movement
            this.x += this.xdir * this.speed;
            this.y += this.ydir * this.speed;
        }
        
        // Constrain to canvas
        this.x = constrain(this.x, 0, width - this.size);
        this.y = constrain(this.y, 0, height - this.size);
    }
}

// Modified Bullet class with reset method for pooling
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.r = 8 * scaleFactor; // Scale radius
        this.speed = 5 * scaleFactor; // Scale speed
        this.active = true;
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.active = true;
    }

    show() {
        fill(50, 205, 50);
        ellipse(this.x, this.y, this.r * 2);
    }

    move() {
        this.y = this.y - this.speed;
    }

    hits(alien) {
        // Skip hit detection for inactive bullets
        if (!this.active) return false;
        
        // Use square distance for better performance (avoid sqrt)
        const dx = this.x - (alien.x + alien.size / 2);
        const dy = this.y - (alien.y + alien.size / 2);
        const distSquared = dx*dx + dy*dy;
        const radiusSum = this.r + alien.r;
        
        return distSquared < radiusSum * radiusSum;
    }
}

class BulletBox {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40 * scaleFactor; // Scale width
        this.height = 40 * scaleFactor; // Scale height
    }
    
    show() {
        fill(255, 165, 0); // Orange color
        stroke(0);
        strokeWeight(2 * scaleFactor); // Scale stroke weight
        rect(this.x, this.y, this.width, this.height);
        
        // Draw bullet icon
        fill(50, 205, 50); // Green color for bullet
        noStroke();
        ellipse(this.x + this.width/2, this.y + this.height/2, 20 * scaleFactor);
        
        // Draw +7 text
        fill(255);
        textSize(12 * scaleFactor); // Scale text size
        textAlign(CENTER, CENTER);
        text("+7", this.x + this.width/2, this.y + this.height/2);
    }
    
    hits(player) {
        // Check if the player overlaps with this bullet box
        return (
            this.x < player.x + player.size &&
            this.x + this.width > player.x &&
            this.y < player.y + player.size &&
            this.y + this.height > player.y
        );
    }
}

class Alien {
    constructor(x, y, speedMultiplier) {
        this.x = x;
        this.y = y;
        this.r = 30 * scaleFactor; // Scale radius
        this.size = 60 * scaleFactor; // Scale size
        this.xdir = 1 * -speedMultiplier * scaleFactor; // Scale speed
    }

    show() {
        image(alienImage, this.x, this.y, this.size, this.size);
    }

    move() {
        this.x += this.xdir;
        if (this.x > width || this.x < 0) {
            this.xdir *= -1;
            this.y += this.r;
        }
    }

    hits(player) {
        let d = dist(this.x + this.size / 2, this.y + this.size / 2, 
                     player.x + player.size / 2, player.y + player.size / 2);
        return d < this.r + player.size / 2;
    }
}

class FastAlien extends Alien {
    constructor(x, y, speedMultiplier) {
        super(x, y, speedMultiplier);
        this.xdir = 5 * speedMultiplier * scaleFactor; // Scale speed
        this.ydir = 1 * speedMultiplier * scaleFactor; // Scale speed
    }
}

// Add ShooterAlien class
class ShooterAlien extends Alien {
    constructor(x, y, speedMultiplier) {
        super(x, y, speedMultiplier);
        this.xdir = 2 * speedMultiplier * scaleFactor; // Scale speed
    }
    
    show() {
        // Draw the regular alien
        image(alienImage, this.x, this.y, this.size, this.size);
        
        // Add simple gun indicator (just a rectangle)
        fill(255, 0, 0);
        rect(this.x + this.size * 0.42, this.y + this.size, 
             10 * scaleFactor, 15 * scaleFactor);
    }
}

// Modified EnemyBullet class with reset method for pooling
class EnemyBullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.r = 8 * scaleFactor; // Scale radius
        this.speed = 7 * scaleFactor; // Scale speed
        this.active = true;
    }
    
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.active = true;
    }

    show() {
        fill(255, 0, 0); // Red bullets for enemies
        ellipse(this.x, this.y, this.r * 2);
    }

    move() {
        this.y = this.y + this.speed;
    }

    hits(player) {
        // Skip hit detection for inactive bullets
        if (!this.active) return false;
        
        // Use square distance for better performance
        const dx = this.x - (player.x + player.size / 2);
        const dy = this.y - (player.y + player.size / 2);
        const distSquared = dx*dx + dy*dy;
        const radiusSum = this.r + player.size / 2;
        
        return distSquared < radiusSum * radiusSum;
    }
}

// Add this function to help with debugging screen visibility
function debugScreenVisibility(message) {
    console.log(message);
    console.log("Game Over Screen hidden?", gameOverScreen.classList.contains('hidden'));
    console.log("Leaderboard Screen hidden?", leaderboardScreen.classList.contains('hidden'));
}