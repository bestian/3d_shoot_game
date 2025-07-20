let moveJoystickTouch = null;
let moveJoystickPosition = { x: 0, y: 0 };

// 調整觸摸移動速度，使其與鍵盤移動速度相近
const touchMoveSpeed = 0.08; // 將其設置為0.08
const keyboardMoveSpeed = 0.05; // 將其設置為原來的1/6
const keyboardRotateSpeed = 0.03;

const keys = {};

// 跳躍相關變數
let isJumping = false;
let jumpVelocity = 0;
let originalCameraHeight = 1.7; // 預設相機高度
const jumpHeight = 10; // 跳躍高度
const jumpSpeed = 0.25; // 跳躍速度
const gravity = 0.008; // 重力

// 開始跳躍
function startJump(camera) {
    if (!isJumping) {
        isJumping = true;
        jumpVelocity = jumpSpeed;
        originalCameraHeight = camera.position.y;
    }
}

// 更新跳躍狀態
function updateJump(camera) {
    if (isJumping) {
        camera.position.y += jumpVelocity;
        jumpVelocity -= gravity;
        
        // 檢查是否落地
        if (camera.position.y <= originalCameraHeight) {
            camera.position.y = originalCameraHeight;
            isJumping = false;
            jumpVelocity = 0;
        }
    }
}

export function initControls(
    scene,
    camera,
    createBullet,
    getGameOver,
    checkWallCollision,
    playerRadius,
    gameMap,
    onBulletCreated
) {
    // 添加多種事件監聽器來支援不同設備
    const keyEvents = ['keydown', 'keyup', 'keypress'];
    
    keyEvents.forEach(eventType => {
        document.addEventListener(eventType, (event) => {
            
            if (eventType === 'keydown') {
                keys[event.code] = true;
                keys[event.key] = true; // 添加 key 屬性支援
                keys[event.keyCode] = true; // 添加 keyCode 支援
                
                // 射擊控制 (空白鍵)
                if (event.code === 'Space' || event.key === ' ' || event.keyCode === 32) {
                    event.preventDefault(); // 防止頁面滾動
                    if (!getGameOver()) {
                        const bullet = createBullet(camera);
                        scene.add(bullet);
                        onBulletCreated(bullet);
                    }
                }
                
                // 跳躍控制 (Ctrl鍵)
                if (event.code === 'ControlLeft' || event.code === 'ControlRight' || 
                    event.key === 'Control' || event.keyCode === 17) {
                    event.preventDefault();
                    if (!isJumping && !getGameOver()) {
                        startJump(camera);
                    }
                }
            } else if (eventType === 'keyup') {
                keys[event.code] = false;
                keys[event.key] = false; // 添加 key 屬性支援
                keys[event.keyCode] = false; // 添加 keyCode 支援
            }
        }, { passive: false }); // 允許 preventDefault
    });

    // 添加 iPad 特定的觸摸鍵盤事件
    document.addEventListener('touchstart', (event) => {
        // 防止觸摸事件干擾鍵盤
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
    }, { passive: true });

    // 添加 focus 事件來確保鍵盤事件能被捕獲
    document.addEventListener('focus', () => {
        // 文檔獲得焦點，鍵盤事件應該正常工作
    });

    // 添加 click 事件來確保文檔有焦點
    document.addEventListener('click', (event) => {
        // 如果點擊的是輸入框或相關元素，不要強制設定焦點
        if (event.target.tagName === 'INPUT' || 
            event.target.tagName === 'TEXTAREA' ||
            event.target.contentEditable === 'true' ||
            event.target.closest('input, textarea, [contenteditable]')) {
            return;
        }
        // 使用 body 元素來設定焦點
        document.body.focus();
    });

    // iPad 特定修復：防止虛擬鍵盤干擾
    document.addEventListener('blur', (event) => {
        // 如果焦點轉移到輸入框，不要清除按鍵狀態
        if (event.relatedTarget && (
            event.relatedTarget.tagName === 'INPUT' || 
            event.relatedTarget.tagName === 'TEXTAREA' ||
            event.relatedTarget.contentEditable === 'true')) {
            return;
        }
        
        // 當失去焦點時，清除所有按鍵狀態
        Object.keys(keys).forEach(key => {
            keys[key] = false;
        });
    });

    // 確保遊戲區域可以獲得焦點
    const gameContainer = document.body;
    gameContainer.setAttribute('tabindex', '0');
    gameContainer.style.outline = 'none'; // 移除焦點邊框
    
    // 檢測是否在 PWA 環境中
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  window.matchMedia('(display-mode: fullscreen)').matches ||
                  window.navigator.standalone === true;
    
    // 添加 iPad 外接鍵盤的特定處理
    if (navigator.userAgent.includes('iPad') || navigator.userAgent.includes('Macintosh')) {
        // 在 iPad 上，確保文檔始終有焦點
        setTimeout(() => {
            document.body.focus();
        }, 100);
        
        // 添加更多事件監聽器來捕獲 iPad 鍵盤事件
        window.addEventListener('keydown', (event) => {
            keys[event.code] = true;
            keys[event.key] = true;
        });
        
        window.addEventListener('keyup', (event) => {
            keys[event.code] = false;
            keys[event.key] = false;
        });
        
        // PWA 特定處理
        if (isPWA) {
            // 在 PWA 中，添加更多的事件監聽器
            ['keydown', 'keyup'].forEach(eventType => {
                // 在多個目標上監聽事件
                [document, document.body, window].forEach(target => {
                    target.addEventListener(eventType, (event) => {
                        if (eventType === 'keydown') {
                            keys[event.code] = true;
                            keys[event.key] = true;
                            keys[event.keyCode] = true; // 添加 keyCode 支援
                            
                            // PWA 中的特殊處理
                            if (event.code === 'Space' || event.key === ' ' || event.keyCode === 32) {
                                event.preventDefault();
                                if (!getGameOver()) {
                                    const bullet = createBullet(camera);
                                    scene.add(bullet);
                                    onBulletCreated(bullet);
                                }
                            }
                        } else if (eventType === 'keyup') {
                            keys[event.code] = false;
                            keys[event.key] = false;
                            keys[event.keyCode] = false;
                        }
                    }, { capture: true, passive: false });
                });
            });
            
            // PWA 中確保焦點管理
            setInterval(() => {
                // 只在沒有輸入框獲得焦點時才強制設定焦點
                const activeElement = document.activeElement;
                const isInputElement = activeElement && (
                    activeElement.tagName === 'INPUT' || 
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.contentEditable === 'true'
                );
                
                if (!isInputElement && activeElement !== document.body) {
                    document.body.focus();
                }
            }, 1000);
        }
    }

    initTouchControls(scene, camera, createBullet, getGameOver);

    // 添加射擊按鈕事件監聽器
    const shootButton = document.getElementById('shoot-button');
    shootButton.addEventListener('click', () => {
        if (!getGameOver()) {
            const bullet = createBullet(camera);
            scene.add(bullet);
            onBulletCreated(bullet);
        }
    });

    // 添加跳躍按鈕事件監聽器
    const jumpButton = document.getElementById('jump-button');
    jumpButton.addEventListener('click', () => {
        if (!getGameOver()) {
            startJump(camera);
        }
    });

    return {
        handleInput: () => handleInput(camera, getGameOver, checkWallCollision, playerRadius, gameMap),
        // 移除 startAutoShooting 和 stopAutoShooting
    };
}

function initTouchControls(scene, camera, createBullet, getGameOver) {
    const moveJoystick = document.getElementById('joystick-move');
    const moveJoystickKnob = document.getElementById('joystick-knob-move');

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    function handleTouchStart(event) {
        if (getGameOver()) return;
        event.preventDefault();
        Array.from(event.changedTouches).forEach(touch => {
            const moveJoystickRect = moveJoystick.getBoundingClientRect();

            if (touch.clientX >= moveJoystickRect.left && touch.clientX <= moveJoystickRect.right &&
                touch.clientY >= moveJoystickRect.top && touch.clientY <= moveJoystickRect.bottom) {
                moveJoystickTouch = touch;
                updateJoystickPosition(moveJoystick, moveJoystickKnob, touch, 'move');
            }
        });
    }

    function handleTouchMove(event) {
        if (getGameOver()) return;
        event.preventDefault();
        Array.from(event.changedTouches).forEach(touch => {
            if (touch.identifier === moveJoystickTouch?.identifier) {
                updateJoystickPosition(moveJoystick, moveJoystickKnob, touch, 'move');
            }
        });
    }

    function handleTouchEnd(event) {
        if (getGameOver()) return;
        Array.from(event.changedTouches).forEach(touch => {
            if (touch.identifier === moveJoystickTouch?.identifier) {
                resetJoystick(moveJoystickKnob, 'move');
                moveJoystickTouch = null;
            }
        });
        resetJoystick(moveJoystickKnob, 'move');
    }
}

function updateJoystickPosition(joystick, knob, touch, type) {
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;

    const distance = Math.min(joystick.offsetWidth / 2, Math.sqrt(deltaX * deltaX + deltaY * deltaY));
    const angle = Math.atan2(deltaY, deltaX);

    const knobX = Math.cos(angle) * distance;
    const knobY = Math.sin(angle) * distance;

    knob.style.transform = `translate(${knobX}px, ${knobY}px)`;

    if (type === 'move') {
        moveJoystickPosition.x = knobX / (joystick.offsetWidth / 2);
        moveJoystickPosition.y = knobY / (joystick.offsetWidth / 2);
    }
}

function resetJoystick(knob, type) {
    if (type === 'move') {
        moveJoystickPosition = { x: 0, y: 0 };
    }
    knob.style.transform = 'translate(-20px, -20px)';
}

function handleInput(camera, getGameOver, checkWallCollision, playerRadius, gameMap) {
    if (getGameOver()) return false;

    // 更新跳躍狀態
    updateJump(camera);

    const rotateSpeed = 0.15;
    const moveSpeed = keyboardMoveSpeed;

    let newPosition = camera.position.clone();
    let moved = false;

    if (moveJoystickTouch) {
        const moveX = moveJoystickPosition.x * touchMoveSpeed;
        const moveZ = moveJoystickPosition.y * touchMoveSpeed;

        // 左右旋轉保持不變
        camera.rotation.y -= moveX * rotateSpeed;

        // 前後移動
        const rotatedMoveZ = moveZ * Math.cos(camera.rotation.y);
        const rotatedMoveX = moveZ * Math.sin(camera.rotation.y);

        let tempPosition = newPosition.clone();
        tempPosition.x += rotatedMoveX;
        if (!checkWallCollision || !checkWallCollision(tempPosition, playerRadius)) {
            newPosition.x = tempPosition.x;
            moved = true;
        }

        tempPosition = newPosition.clone();
        tempPosition.z += rotatedMoveZ;
        if (!checkWallCollision || !checkWallCollision(tempPosition, playerRadius)) {
            newPosition.z = tempPosition.z;
            moved = true;
        }
    }

    // 支援多種按鍵代碼格式
    const moveForward = keys['KeyW'] || keys['ArrowUp'] || keys['w'] || keys['W'] || keys['Up'] || keys[87] || keys[38];
    const moveBackward = keys['KeyS'] || keys['ArrowDown'] || keys['s'] || keys['S'] || keys['Down'] || keys[83] || keys[40];
    const moveLeft = keys['KeyA'] || keys['a'] || keys['A'] || keys['Left'] || keys[65] || keys[37];
    const moveRight = keys['KeyD'] || keys['d'] || keys['D'] || keys['Right'] || keys[68] || keys[39];

    if (moveForward || moveBackward || moveLeft || moveRight) {
        const moveX = ((moveLeft ? -1 : 0) + (moveRight ? 1 : 0)) * moveSpeed;
        const moveZ = ((moveForward ? 1 : 0) + (moveBackward ? -1 : 0)) * moveSpeed;

        const rotatedMoveX = moveX * Math.cos(camera.rotation.y) - moveZ * Math.sin(camera.rotation.y);
        const rotatedMoveZ = moveX * Math.sin(camera.rotation.y) + moveZ * Math.cos(camera.rotation.y);

        let tempPosition = newPosition.clone();
        tempPosition.x += rotatedMoveX;
        if (!checkWallCollision || !checkWallCollision(tempPosition, playerRadius)) {
            newPosition.x = tempPosition.x;
            moved = true;
        }

        tempPosition = newPosition.clone();
        tempPosition.z -= rotatedMoveZ;
        if (!checkWallCollision || !checkWallCollision(tempPosition, playerRadius)) {
            newPosition.z = tempPosition.z;
            moved = true;
        }
    }

    // 支援多種旋轉按鍵代碼
    if (keys['ArrowLeft'] || keys['Left'] || keys[37]) {
        camera.rotation.y += keyboardRotateSpeed;
    }
    if (keys['ArrowRight'] || keys['Right'] || keys[39]) {
        camera.rotation.y -= keyboardRotateSpeed;
    }

    if (moved) {
        // 保持跳躍時的Y軸位置
        const currentY = camera.position.y;
        camera.position.copy(newPosition);
        camera.position.y = currentY;
    }

    if (gameMap && gameMap.checkExitReached && gameMap.mapSize) {
        if (gameMap.checkExitReached(camera.position, playerRadius)) {
            return true;
        }
    }

    return false;
}