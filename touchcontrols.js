/**
 * TouchControls class - Handles touch screen joystick and fire button
 */
class TouchControls {
    constructor(game) {
        this.game = game;
        this.joystickActive = false;
        this.joystickBase = { x: 0, y: 0 }; // Base position when touch starts
        this.joystickPos = { x: 0, y: 0 };  // Current joystick position
        this.joystickSize = 80;             // Size of joystick area
        this.maxDistance = 40;              // Maximum distance joystick can move
        this.deadZone = 8;                  // Reduced deadzone for better mobile response
        
        // Adaptive sizing based on screen size
        this.updateSizeParameters();
        
        // Touch/Mouse IDs to track multiple inputs
        this.joystickTouchID = null;
        this.fireTouchID = null;
        this.mouseActive = false;
        
        // Last fire time for cooldown
        this.lastFireTime = 0;
        this.fireCooldown = 300; // ms between shots
        
        // Setup the event handlers
        this.setupEventHandlers();
        
        // For auto-center animation
        this.autoReturnSpeed = 5;
        this.returnToCenter = false;
        
        // Add resize handler
        window.addEventListener('resize', () => this.updateSizeParameters());
        
        console.log("Touch/mouse controls initialized");
    }
    
    updateSizeParameters() {
        // Adjust parameters based on screen width
        if (window.innerWidth <= 480) {
            this.maxDistance = 35; // Increased from 30 for better mobile control
            this.deadZone = 4;    // Decreased deadzone for more responsiveness on small screens
        } else if (window.innerWidth <= 768) {
            this.maxDistance = 35;
            this.deadZone = 7;
        } else {
            this.maxDistance = 40;
            this.deadZone = 8;
        }
    }
    
    setupEventHandlers() {
        // Get elements
        this.joystickElement = document.getElementById('joystick');
        this.joystickKnob = document.getElementById('joystickKnob');
        this.fireButton = document.getElementById('fireButton');
        
        if (!this.joystickElement || !this.joystickKnob || !this.fireButton) {
            console.error("Touch control elements not found!");
            return;
        }
        
        // Set initial positions
        this.resetJoystick();
        
        // Touch event handlers for joystick
        this.joystickElement.addEventListener('touchstart', this.handleJoystickStart.bind(this));
        document.addEventListener('touchmove', this.handleJoystickMove.bind(this));
        document.addEventListener('touchend', this.handleJoystickEnd.bind(this));
        document.addEventListener('touchcancel', this.handleJoystickEnd.bind(this));
        
        // Mouse event handlers for joystick
        this.joystickElement.addEventListener('mousedown', this.handleJoystickMouseStart.bind(this));
        document.addEventListener('mousemove', this.handleJoystickMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleJoystickMouseEnd.bind(this));
        
        // Touch event handlers for fire button
        this.fireButton.addEventListener('touchstart', this.handleFireStart.bind(this));
        this.fireButton.addEventListener('touchend', this.handleFireEnd.bind(this));
        this.fireButton.addEventListener('touchcancel', this.handleFireEnd.bind(this));
        
        // Mouse event handlers for fire button
        this.fireButton.addEventListener('mousedown', this.handleFireMouseStart.bind(this));
        document.addEventListener('mouseup', this.handleFireMouseEnd.bind(this));
        
        // Prevent default touch/mouse actions
        const touchElements = [this.joystickElement, this.fireButton];
        touchElements.forEach(el => {
            el.addEventListener('touchstart', e => e.preventDefault());
            el.addEventListener('touchmove', e => e.preventDefault());
            el.addEventListener('touchend', e => e.preventDefault());
            el.addEventListener('mousedown', e => e.preventDefault());
        });
        
        // Prevent context menu on right-click for controls
        this.joystickElement.addEventListener('contextmenu', e => e.preventDefault());
        this.fireButton.addEventListener('contextmenu', e => e.preventDefault());
    }
    
    resetJoystick() {
        // Get position of joystick base
        const rect = this.joystickElement.getBoundingClientRect();
        this.joystickBase.x = rect.left + rect.width / 2;
        this.joystickBase.y = rect.top + rect.height / 2;
        
        // Reset knob to center
        this.joystickPos.x = this.joystickBase.x;
        this.joystickPos.y = this.joystickBase.y;
        
        // Reset the knob position to exact center with CSS
        if (this.joystickKnob) {
            this.joystickKnob.style.top = "50%";
            this.joystickKnob.style.left = "50%";
            this.joystickKnob.style.transform = "translate(-50%, -50%)";
        }
        
        // Reset game direction
        if (this.game && this.game.updatePlayerDirection) {
            this.game.updatePlayerDirection(0, 0);
        }
    }
    
    // Touch handlers
    handleJoystickStart(e) {
        e.preventDefault();
        
        // Only start if we're not already tracking a joystick touch
        if (this.joystickTouchID === null) {
            this.joystickTouchID = e.touches[0].identifier;
            this.joystickActive = true;
            this.returnToCenter = false;
            
            // Update joystick position based on touch
            const touch = e.touches[0];
            this.updateJoystickPosition(touch.clientX, touch.clientY);
        }
    }
    
    handleJoystickMove(e) {
        e.preventDefault();
        
        // Find our joystick touch by ID
        if (this.joystickActive) {
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.joystickTouchID) {
                    this.updateJoystickPosition(e.touches[i].clientX, e.touches[i].clientY);
                    return;
                }
            }
        }
    }
    
    handleJoystickEnd(e) {
        // Check if our joystick touch ended
        if (this.joystickActive) {
            let touchFound = false;
            
            // Check if joystick touch is still active
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.joystickTouchID) {
                    touchFound = true;
                    break;
                }
            }
            
            // If not found, joystick touch has ended
            if (!touchFound) {
                this.joystickTouchID = null;
                this.joystickActive = false;
                this.returnToCenter = true;
                
                // Update game direction to stop moving
                if (this.game && this.game.updatePlayerDirection) {
                    this.game.updatePlayerDirection(0, 0);
                }
            }
        }
    }
    
    // Mouse handlers
    handleJoystickMouseStart(e) {
        e.preventDefault();
        
        // Only start if we're not already tracking
        if (!this.mouseActive) {
            this.mouseActive = true;
            this.joystickActive = true;
            this.returnToCenter = false;
            
            // Update joystick position based on mouse
            this.updateJoystickPosition(e.clientX, e.clientY);
        }
    }
    
    handleJoystickMouseMove(e) {
        // Only handle if mouse is active on joystick
        if (this.mouseActive && this.joystickActive) {
            this.updateJoystickPosition(e.clientX, e.clientY);
        }
    }
    
    handleJoystickMouseEnd(e) {
        // Reset on mouse up
        if (this.mouseActive) {
            this.mouseActive = false;
            this.joystickActive = false;
            this.returnToCenter = true;
            
            // Update game direction to stop moving
            if (this.game && this.game.updatePlayerDirection) {
                this.game.updatePlayerDirection(0, 0);
            }
        }
    }
    
    updateJoystickPosition(touchX, touchY) {
        // Calculate distance from base
        const deltaX = touchX - this.joystickBase.x;
        const deltaY = touchY - this.joystickBase.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Limit distance to max allowed
        if (distance > this.maxDistance) {
            const ratio = this.maxDistance / distance;
            this.joystickPos.x = this.joystickBase.x + deltaX * ratio;
            this.joystickPos.y = this.joystickBase.y + deltaY * ratio;
        } else {
            this.joystickPos.x = touchX;
            this.joystickPos.y = touchY;
        }
        
        // Update joystick visuals
        this.updateJoystickVisuals();
        
        // Calculate direction for player movement
        this.updateGameDirection(deltaX, deltaY, distance);
    }
    
    updateJoystickVisuals() {
        if (!this.joystickKnob) return;
        
        // Calculate position relative to joystick area
        const rect = this.joystickElement.getBoundingClientRect();
        const relX = this.joystickPos.x - rect.left;
        const relY = this.joystickPos.y - rect.top;
        
        // Apply position to knob - using proper transform for centering
        const knobWidth = this.joystickKnob.offsetWidth;
        const knobHeight = this.joystickKnob.offsetHeight;
        
        // Reset any existing transform
        this.joystickKnob.style.top = "50%";
        this.joystickKnob.style.left = "50%";
        
        // Calculate how far from center the knob should be
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const deltaX = relX - centerX;
        const deltaY = relY - centerY;
        
        // Apply the transform to move from center position
        this.joystickKnob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    }
    
    updateGameDirection(deltaX, deltaY, distance) {
        // Only update if game reference exists
        if (!this.game || !this.game.updatePlayerDirection) return;
        
        // Don't move if in deadzone
        if (distance < this.deadZone) {
            this.game.updatePlayerDirection(0, 0);
            return;
        }
        
        // Calculate normalized direction values between -1 and 1
        let xdir = deltaX / this.maxDistance;
        let ydir = deltaY / this.maxDistance;
        
        // Clamp values to -1,1 range
        xdir = Math.max(-1, Math.min(1, xdir));
        ydir = Math.max(-1, Math.min(1, ydir));
        
        // Apply to game
        this.game.updatePlayerDirection(xdir, ydir);
    }
    
    // Fire button touch handlers
    handleFireStart(e) {
        e.preventDefault();
        
        // Only start if we're not already tracking a fire touch
        if (this.fireTouchID === null) {
            this.fireTouchID = e.touches[0].identifier;
            this.fireButton.classList.add('active');
            this.fire();
            
            // Start continuous firing
            this.fireInterval = setInterval(() => this.fire(), this.fireCooldown);
        }
    }
    
    handleFireEnd(e) {
        // Check if our fire touch ended
        let touchFound = false;
        
        // Check if fire touch is still active
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === this.fireTouchID) {
                touchFound = true;
                break;
            }
        }
        
        // If not found, fire touch has ended
        if (!touchFound) {
            this.fireTouchID = null;
            this.fireButton.classList.remove('active');
            
            // Stop continuous firing
            if (this.fireInterval) {
                clearInterval(this.fireInterval);
                this.fireInterval = null;
            }
        }
    }
    
    // Fire button mouse handlers
    handleFireMouseStart(e) {
        e.preventDefault();
        
        this.fireButton.classList.add('active');
        this.fire();
        
        // Start continuous firing
        this.fireInterval = setInterval(() => this.fire(), this.fireCooldown);
    }
    
    handleFireMouseEnd(e) {
        this.fireButton.classList.remove('active');
        
        // Stop continuous firing
        if (this.fireInterval) {
            clearInterval(this.fireInterval);
            this.fireInterval = null;
        }
    }
    
    fire() {
        // Check cooldown
        const now = Date.now();
        if (now - this.lastFireTime < this.fireCooldown) return;
        
        // Fire the bullet
        if (this.game && this.game.fireBullet) {
            this.game.fireBullet();
            this.lastFireTime = now;
        }
    }
    
    update() {
        if (this.returnToCenter) {
            // Animate joystick returning to center
            const dx = this.joystickBase.x - this.joystickPos.x;
            const dy = this.joystickBase.y - this.joystickPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 3) {
                // Close enough to center
                this.joystickPos.x = this.joystickBase.x;
                this.joystickPos.y = this.joystickBase.y;
                this.returnToCenter = false;
                
                // Make sure joystick visuals are updated
                this.updateJoystickVisuals();
            } else {
                // Move toward center
                this.joystickPos.x += dx * 0.3;
                this.joystickPos.y += dy * 0.3;
                
                // Update visuals during animation
                this.updateJoystickVisuals();
            }
        }
    }
    
    // Function to check if device supports touch events
    static isTouchDevice() {
        return (('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0) ||
                (navigator.msMaxTouchPoints > 0));
    }
    
    // Function to enable/disable touch controls
    static toggleTouchControls(show) {
        const controls = document.getElementById('touchControls');
        if (!controls) return;
        
        if (show) {
            controls.classList.remove('hidden');
            // Ensure the joystick is properly centered when shown
            if (game && game.touchControls) {
                setTimeout(() => game.touchControls.resetJoystick(), 50);
            }
        } else {
            controls.classList.add('hidden');
        }
    }
}
