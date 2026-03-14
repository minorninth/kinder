const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

EventTarget.prototype.on = function(type, handler, options) {
    this.addEventListener(type, (e) => {
        e.preventDefault();
        e.stopPropagation();
        handler.call(this, e);
    }, options);
    return this;
};

let rooms = [];
let pos = 0;

// Game mode
const LOADING = 0;
const MAINMENU = 1;
const INTRO = 2;
const LIGHTSOUT = 3;
const PLAYING = 4;
const FINISHED = 5;

// Playing mode
const WAITING = 0;
const MOVING = 1;
const TURNING = 2;

let gameMode = LOADING;
room = null;

// Initialize the list of rooms. The z position determines the
// length down the hallway, the x position determines if the sound
// comes from the left or right.
function initializeRooms() {
    rooms = [];
    rooms.push({
        x: 0,
        z: 0,
        sound: school,
        volume: 0.05,
    });
    rooms.push({
        x: 2,
        z: 30,
        sound: fishtank,
        narrate: narrateFishtank
    });
    rooms.push({
        x: -3,
        z: 50,
        sound: gym,
        narrate: narrateGym
    });
    rooms.push({
        x: 3,
        z: 70,
        sound: cafeteria,
        narrate: narrateCafeteria
    });
    rooms.push({
        x: -3,
        z: 90,
        sound: kitchen,
        narrate: narrateKitchen,
    });
    rooms.push({
        x: 3,
        z: 110,
        sound: bathroom,
        narrate: narrateBathroom,
    });
    rooms.push({
        x: -3,
        z: 130,
        sound: band,
        narrate: narrateBand,
    });
    rooms.push({
        x: 3,
        z: 150,
        sound: choir,
        narrate: narrateChoir,
    });
    rooms.push({
        x: -3,
        z: 170,
        sound: robotics,
        narrate: narrateRobotics,
    });

    kinderPos = 190;
}

// Determine if a new room comes into view and pick a random anomaly for the room.
function loadRoomAndAnomaly() {
    // Determine if the previous room should be unloaded.
    if (roomIndex > 0
        && Math.abs(rooms[roomIndex - 1].z - pos) < Math.abs(rooms[roomIndex].z - pos)) {
        stopRoom();
        roomIndex--;
        room = undefined;
        angle = 0;
    }

    // Load the next room.
    if (!room) {
        room = rooms[roomIndex];
        let roomMessage = "";

        // Chance that we get an anomaly at all.
        if (roomIndex > 0 && Math.random() > 0.5) {
            // Pick which anomaly sound it will be, if we end up using it.
            room.anomalyIndex = Math.floor(Math.random() * anomalies.length);
            const anomaly = anomalies[room.anomalyIndex];

            const r = Math.random();
            if (r > 0.9) {
                // Trickiest one - wrong side
                roomMessage = 'Room ' + roomIndex + ' WRONG SIDE';
                room.x = -room.x;
            } else if (r > 0.6) {
                // Anomaly sound replaces the room sound - this is the easiest
                roomMessage = 'Room ' + roomIndex + ' ANOMALY SOUND ONLY ' + room.anomalyIndex;
                room.anomaly = anomaly;
                room.sound = undefined;
            } else {
                // Most common - sound added on top of existing room sound
                roomMessage = 'Room ' + roomIndex + ' ADD ANOMALY SOUND ' + room.anomalyIndex;
                room.anomaly = anomaly;
            }
        } else {
            // No anomaly
            room.anomalyIndex = undefined;
            roomMessage = 'Room ' + roomIndex + ' NO ANOMALY';
        }

        console.log(roomMessage);
        if (debugRoom) {
            debugRoom.innerText = roomMessage;
        }
        if (room.sound) {
            let volume = 1;
            if (room.volume) {
                volume = room.volume;
            }
            room.sound.setVolume(volume);
        }
        if (room.anomaly) {
            room.anomaly.setVolume(1);
        }
    }
}

function setGameMode(newGameMode) {
    if (newGameMode == MAINMENU && gameMode == LOADING) {
        live.innerText = 'Finished loading';
    } else if (newGameMode == INTRO) {
        live.innerText = 'Intro';
    } else if (newGameMode == PLAYING) {
        live.innerText = 'Controls active';
    }

    gameMode = newGameMode;
    titleSection.hidden = (gameMode != MAINMENU && gameMode != LOADING);
    highscoreSection.hidden = (gameMode != MAINMENU && gameMode != LOADING);
    gameControlsSection.hidden = (gameMode != PLAYING);
    loading.hidden = (gameMode != LOADING);
    infoSection.hidden = (gameMode != MAINMENU && gameMode != LOADING);
    menuSection.hidden = (gameMode != MAINMENU);
    introSection.hidden = (gameMode != INTRO && gameMode != LIGHTSOUT);
    finishedSection.hidden = (gameMode != FINISHED);
}

function stopAllSounds() {
    allSounds.forEach((sound) => {
        sound.stop(fadeTime = 1.0);
    });
}

function skipToGame() {
    if (gameMode == LIGHTSOUT) {
        return;
    }
    console.log('skip to game');
    stopAllSounds();
    playGame();
}

function backToMainMenu() {
    console.log('skip to main menu');
    stopAllSounds();
    setGameMode(MAINMENU);
}

function move() {
    if (gameMode != PLAYING) {
        return;
    }
    
    if (mode != TURNING) {
        console.log('move');
        mode = MOVING;
    }
}

function stopMoving() {
    if (gameMode != PLAYING) {
        return;
    }

    console.log('stop moving');
    mode = WAITING;
}

function turnAround() {
    if (gameMode != PLAYING) {
        return;
    }
    if (room.turned) {
        return;
    }
    console.log('turn around');
    room.turned = true;
    narrateTurnaroundSound = narrateTurnaround[narrateTurnaroundIndex];
    narrateTurnaroundIndex = (narrateTurnaroundIndex + 1) % 3;
    mode = TURNING;
}

function stopRoom() {
    if (room) {
        if (room.sound) {
            room.sound.stop();
        }
        if (room.anomaly) {
            room.anomaly.stop();
        }
    }
}

// Watch out, trigonometry ahead! The angle in radians is used to
// smoothly rotate by 180 degrees when the user chooses to turn around.
function setPosition(sound, x, y, z, radians) {
    const x2 = x * Math.cos(radians) - z * Math.sin(radians);
    const z2 = x * Math.sin(radians) + z * Math.cos(radians);
    if (debugRoomIcon) {
        debugRoomIcon.style.left = (250 + 20 * x2) + 'px';
        debugRoomIcon.style.top = (250 - 20 * z2) + 'px';
    }

    sound.setPosition(x2, y, z2);
}

function gameLoop() {
    loadRoomAndAnomaly();

    let radians = Math.PI * angle;
    let z = room.z;
    let deltaZ = (pos - room.z);
    if (room.flipPosition) {
        z = room.flipPosition + (room.flipPosition - room.z);
        deltaZ = (z - pos);
    }
    if (room.sound) {
        setPosition(room.sound, -room.x, 0, deltaZ, radians);
        room.sound.loop();
    }
    if (room.anomaly) {
        setPosition(room.anomaly, -room.x, 0, deltaZ, radians);
        room.anomaly.loop();
    }

    if (debugPosition) {
        debugPosition.innerText = pos;
    }
}

function updateHighScore() {
    let highScoreString = localStorage['highScore'];
    if (highScoreString) {
        let highScore = parseFloat(highScoreString);
        if (highScore > 5 && highScore < 999) {
            highscoreSection.innerText = `Your best score: ${highScore.toFixed(1)} seconds`;
            highscoreSection.hidden = false;
        }
    }
}

function win() {
    let clockStop = new Date();
    let delta = (clockStop - clockStart) / 1000;
    if (delta > 5 && delta < 999) {
        $('#finishedScore').innerText =
            `You beat the game in ${delta.toFixed(1)} seconds`;
        let previousHighScore = localStorage['highScore'];
        if (!previousHighScore) {
            previousHighScore = 999;
        }
        if (delta < previousHighScore) {
            localStorage['highScore'] = delta;
        }
        updateHighScore();
    }
    setGameMode(FINISHED);
    narrateWinSound = narrateWin[narrateWinIndex];
    narrateWinIndex = (narrateWinIndex + 1) % 3;
    narrateWinSound.play();
    music.setReverbAmount(0);
    music.setVolume(0.25);
    music.fadeInAtOffset(true, 20, 8);
}

function handleFail() {
    clearInterval(intervalToken);
    steps.stop();
    panting.stop();
    stopRoom();
    fail.play().then(() => {
        narrateFailSound = narrateFail[narrateFailIndex];
        narrateFailIndex = (narrateFailIndex + 1) % 3;
        narrateFailSound.play().then(() => {
            startGame();
        });
    });
}

function debugNextRoom() {
    if (Math.abs(room.z - pos) > 9) {
        pos = room.z + 0.25;
    }
    else if (roomIndex > 0) {
        pos = rooms[roomIndex - 1].z + 0.25;
    }
}

function playGame() {
    setGameMode(LIGHTSOUT);
    music.stop(fadeTime = 4.0);

    powercut.play().then(() => {
        if (gameMode != LIGHTSOUT) {
            return;
        }
        narrate4.setVolume(2);
        narrate4.play().then(() => {
            startGame();
        });
    });
}

// Actual game play starts here.
function startGame() {
    clockStart = new Date();
    setGameMode(PLAYING);
    mode = WAITING;
    initializeRooms();
    roomIndex = rooms.length - 1;
    room = undefined;
    angle = 0;

    pos = kinderPos;
    intervalToken = setInterval(() => {
        if (gameMode != PLAYING) {
            clearInterval(intervalToken);
            return;
        }

        if (angle > 0 && angle < 1) {
            angle += 0.05;
        } else if (angle >= 1 && !room.flipPosition) {
            room.flipPosition = pos;
        }
        if (mode == WAITING) {
            steps.stop();
            if (!panting.isPlaying && Math.random() > 0.98) {
                panting.play();
            }
        }
        else if (mode == MOVING) {
            pos -= 0.25;
            panting.stop();
            if (!steps.isPlaying) {
                steps.loop();
            }
        }
        else if (mode == TURNING) {
            steps.stop();
            panting.stop();
            if (!narrateTurnaroundSound.isPlaying) {

                angle += 0.05;
                narrateTurnaroundSound.play().then(() => {
                    if (room.anomalyIndex === undefined) {
                        handleFail();
                    }
                    mode = WAITING;
                });
            }
        }

        if (pos <= 0) {
            clearInterval(intervalToken);
            steps.stop();
            panting.stop();
            win();
        }

        if (Math.abs(rooms[roomIndex].z - pos) < 0.5 && room.passed === undefined) {
            room.passed = true;
            if (room.anomalyIndex !== undefined && angle == 0) {
                handleFail();
            }
        }

        gameLoop();
    }, 100);
}

// Reaching the kindergarten classroom, just before the gameplay starts.
function kinder() {
    if (gameMode != INTRO) {
        return;
    }
    music.stop(fadeTime = 4.0);

    pos = kinderPos;
    opendoor.play().then(() => {
        if (gameMode != INTRO) {
            return;
        }
        narrate3.setVolume(2);
        narrate3.play().then(() => {
            setTimeout(() => {
                if (gameMode != INTRO) {
                    return;
                }
                playGame();
            }, 1000);
        });
    }, 1000);
}

// Updating the rooms during the intro.
function introUpdateRoomsWhileRunning() {
    for (let i = 0; i < rooms.length; i++) {
        let room = rooms[i];
        if (Math.abs(pos - room.z) < 20) {
            room.sound.loop();
            room.sound.setPosition(room.x, 0, room.z - pos);
        } else {
            room.sound.stop();
        }

        if (!room.didNarrate
            && room.narrate
            && !room.narrate.isPlaying
            && Math.abs(pos - room.z) < 3) {
            room.narrate.play();
            room.didNarrate = true;
        }
    }
}

// Start running down the hall during the intro.
function introStartRunning() {
    if (gameMode != INTRO) {
        return;
    }
    music.stop(fadeTime = 8.0);

    steps.setPosition(0, -2, 0);
    steps.loop();

    pos = 0;
    introIntervalToken = setInterval(() => {
        if (gameMode != INTRO) {
            clearInterval(introIntervalToken);
            return;
        }

        pos += 0.25;
        if (pos >= kinderPos) {
            clearInterval(introIntervalToken);
            steps.stop();
            kinder();
        }

        console.log('Pos ' + pos);
        introUpdateRoomsWhileRunning();
    }, 100);
}

// Start the intro.
function playIntro() {
    setGameMode(INTRO);

    introUpdateRoomsWhileRunning();

    music.setVolume(0.25);
    music.loop();

    setTimeout(() => {
        if (gameMode != INTRO) {
            return;
        }
        narrate1.setVolume(2);
        narrate1.play().then(() => {
            setTimeout(() => {
                if (gameMode != INTRO) {
                    return;
                }
                narrate2.setVolume(2);
                narrate2.play().then(() => {
                    setTimeout(() => {
                        introStartRunning();
                    }, 1000);
                });
            }, 1000);
        });
    }, 4000);
}

// All of the loading, initialization, and setting up event handlers.
window.onload = () => {
    instructionsDetails = $('#instructionsDetails');
    controlsDetails = $('#controlsDetails');
    tipsDetails = $('#tipsDetails');
    let playCount = localStorage['playCount'];
    if (!playCount) {
        playCount = 1;
    } else {
        instructionsDetails.open = false;
        controlsDetails.open = false;
        tipsDetails.open = false;
    }
    playCount++;
    localStorage['playCount'] = playCount;

    debugPosition = $('#position');
    debugRoom = $('#room');
    debugSpatial = $('#spatial');
    debugPlayerIcon = $('#playerIcon');
    debugRoomIcon = $('#roomIcon');
    debugNext = $('#next');
    play = $('#play');
    intro = $('#intro');
    walk = $('#walk');
    turn = $('#turn');
    titleSection = $('#title');
    highscoreSection = $('#highscore');
    gameControlsSection = $('#gamecontrols');
    infoSection = $('#info');
    menuSection = $('#menu');
    loadingSection = $('#loading');
    introSection = $('#introsection');
    finishedSection = $('#finished');
    live = $('#live');
    skip = $('#skip');
    exitIntro = $('#exitIntro');
    backToMain = $('#backToMain');
    quitGame = $('#quitGame');

    updateHighScore();
    setGameMode(LOADING);

    engine = new AudioEngine({
        impulseUrl: '/sounds/reverb.mp3'
    });
    readyFunctions = [engine.ready];
    allSounds = [];
    music = new Sound(engine, '/sounds/music.mp3');
    steps = new Sound(engine, '/sounds/steps.mp3');
    panting = new Sound(engine, '/sounds/panting.mp3');
    school = new Sound(engine, '/sounds/school.mp3');
    narrate1 = new Sound(engine, '/sounds/narrate-1-ohno.mp3');
    narrate2 = new Sound(engine, '/sounds/narrate-2-getteddy.mp3');

    fishtank = new Sound(engine, '/sounds/fishtank.mp3');
    narrateFishtank = new Sound(engine, '/sounds/narrate-fishtank.mp3');

    gym = new Sound(engine, '/sounds/gym2.mp3');
    narrateGym = new Sound(engine, '/sounds/narrate-gym.mp3');

    cafeteria = new Sound(engine, '/sounds/cafeteria.mp3');
    narrateCafeteria = new Sound(engine, '/sounds/narrate-cafeteria.mp3');

    band = new Sound(engine, '/sounds/band.mp3');
    narrateBand = new Sound(engine, '/sounds/narrate-band.mp3');

    choir = new Sound(engine, '/sounds/choir.mp3');
    narrateChoir = new Sound(engine, '/sounds/narrate-choir.mp3');

    kitchen = new Sound(engine, '/sounds/kitchen.mp3');
    narrateKitchen = new Sound(engine, '/sounds/narrate-kitchen.mp3');

    bathroom = new Sound(engine, '/sounds/bathroom.mp3');
    narrateBathroom = new Sound(engine, '/sounds/narrate-bathroom.mp3');

    robotics = new Sound(engine, '/sounds/robotics.mp3');
    narrateRobotics = new Sound(engine, '/sounds/narrate-robotics.mp3');

    opendoor = new Sound(engine, '/sounds/opendoor.mp3');
    narrate3 = new Sound(engine, '/sounds/narrate-3-teddy-foundyou.mp3');
    powercut = new Sound(engine, '/sounds/powercut.mp3');
    narrate4 = new Sound(engine, '/sounds/narrate-4-who-turned.mp3');

    anomalies = [];
    anomalies.push(new Sound(engine, '/sounds/anomaly1.mp3'));
    anomalies.push(new Sound(engine, '/sounds/anomaly2.mp3'));
    anomalies.push(new Sound(engine, '/sounds/anomaly3.mp3'));
    anomalies.push(new Sound(engine, '/sounds/anomaly4.mp3'));
    anomalies.push(new Sound(engine, '/sounds/anomaly5.mp3'));
    anomalies.push(new Sound(engine, '/sounds/anomaly6.mp3'));
    anomalies.push(new Sound(engine, '/sounds/anomaly7.mp3'));
    anomalies.push(new Sound(engine, '/sounds/anomaly8.mp3'));
    anomalies.push(new Sound(engine, '/sounds/anomaly9.mp3'));
    anomalies.push(new Sound(engine, '/sounds/anomaly10.mp3'));
    anomalies.push(new Sound(engine, '/sounds/anomaly11.mp3'));
    anomalies.push(new Sound(engine, '/sounds/anomaly12.mp3'));

    fail = new Sound(engine, '/sounds/fail.mp3');

    narrateFail = [];
    narrateFail.push(new Sound(engine, '/sounds/narrate-lost.mp3'));
    narrateFail.push(new Sound(engine, '/sounds/narrate-lost-2.mp3'));
    narrateFail.push(new Sound(engine, '/sounds/narrate-lost-3.mp3'));
    narrateFailIndex = Math.floor(Math.random() * 3);

    narrateCorrect = [];
    narrateCorrect.push(new Sound(engine, '/sounds/narrate-correct.mp3'));
    narrateCorrect.push(new Sound(engine, '/sounds/narrate-correct-2.mp3'));
    narrateCorrect.push(new Sound(engine, '/sounds/narrate-correct-3.mp3'));
    narrateCorrect.push(new Sound(engine, '/sounds/narrate-correct-4.mp3'));
    narrateCorrectIndex = Math.floor(Math.random() * 4);

    narrateTurnaround = [];
    narrateTurnaround.push(new Sound(engine, '/sounds/narrate-turnaround.mp3'));
    narrateTurnaround.push(new Sound(engine, '/sounds/narrate-turnaround-2.mp3'));
    narrateTurnaround.push(new Sound(engine, '/sounds/narrate-turnaround-3.mp3'));
    narrateTurnaround.push(new Sound(engine, '/sounds/narrate-turnaround-4.mp3'));
    narrateTurnaround.push(new Sound(engine, '/sounds/narrate-turnaround-5.mp3'));
    narrateTurnaround.push(new Sound(engine, '/sounds/narrate-turnaround-6.mp3'));
    narrateTurnaroundIndex = Math.floor(Math.random() * 6);

    narrateWin = [];
    narrateWin.push(new Sound(engine, '/sounds/narrate-win.mp3'));
    narrateWin.push(new Sound(engine, '/sounds/narrate-win-2.mp3'));
    narrateWin.push(new Sound(engine, '/sounds/narrate-win-3.mp3'));
    narrateWin.push(new Sound(engine, '/sounds/narrate-win-4.mp3'));
    narrateWin.push(new Sound(engine, '/sounds/narrate-win-5.mp3'));
    narrateWin.push(new Sound(engine, '/sounds/narrate-win-6.mp3'));
    narrateWinIndex = Math.floor(Math.random() * 6);

    // Wait until all sounds load before finishing initialization.
    Promise.all(readyFunctions).then(() => {
        finishInitialization();
    });
}

function finishInitialization() {
    setGameMode(MAINMENU);
    initializeRooms();

    panting.setVolume(0.1);
    school.setVolume(0.05);
    steps.setVolume(0.2);
    robotics.setVolume(2.0);

    intro.on('click', playIntro);
    play.on('click', playGame);
    skip.on('click', skipToGame);
    exitIntro.on('click', backToMainMenu);
    backToMain.on('click', backToMainMenu);
    quitGame.on('click', backToMainMenu);
    walk.on('pointerdown', move);
    walk.on('pointerup', stopMoving);
    turn.on('pointerdown', turnAround);
    if (debugNext) {
        debugNext.on('click', debugNextRoom);
    }

    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        if (e.key == 'ArrowUp') {
            move();
            e.preventDefault();
            e.stopPropagation();
        } else if (e.key == 'ArrowDown'
                   || e.key == 'ArrowLeft'
                   || e.key == 'ArrowRight'
                   || e.key == ' ') {
            turnAround();
            e.preventDefault();
            e.stopPropagation();
        }
    });
    document.addEventListener('keyup', (e) => {
        if (e.key == 'ArrowUp') {
            stopMoving();
            e.preventDefault();
            e.stopPropagation();
        } else if (e.key == 'ArrowDown'
                   || e.key == 'ArrowLeft'
                   || e.key == 'ArrowRight'
                   || e.key == ' ') {
            e.preventDefault();
            e.stopPropagation();
        }
    });
};
