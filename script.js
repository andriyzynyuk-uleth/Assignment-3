let startTime;
let robotsClicked = 0;
let totalClicks = 0;
let robotSize;
let gameMode;
let intervalId;
let gameActive = false;
let tripleTarget = 10;
let robotAttackTarget = 10;
let flickTarget = 10;
let spawnRate = 800;

let hoverAudio = new Audio('assets/hover.mp3');
hoverAudio.preload = 'auto';
let shotAudio = new Audio('assets/shot.mp3');
shotAudio.preload = 'auto';

function createRobot() {
    const $robot = $('<div class="robot"></div>');
    $robot.css({
        width: robotSize + 'px',
        height: robotSize + 'px',
        backgroundSize: 'contain'
    });

    // Use full window space for spawning
    const maxTop = Math.max(0, window.innerHeight - robotSize);
    const maxLeft = Math.max(0, window.innerWidth - robotSize);
    $robot.css({
        top: Math.random() * maxTop,
        left: Math.random() * maxLeft
    });
    $('body').append($robot);

    // If this is robot-attack, check whether too many robots are present (failure condition)
    if (gameMode === 'robot-attack') {
        const count = $('.robot').length;
        if (count >= 5) {
            clearInterval(intervalId);
            showLoss('Too many robots appeared.');
            return;
        }
    }

    $robot.on('click', function (e) {
        e.stopPropagation();
        try { shotAudio.currentTime = 0; shotAudio.play(); } catch (e) {}
        totalClicks++;
        $(this).remove();
        robotsClicked++;

        updateHUD();

        if (gameMode === 'robot-flick') {
            if (robotsClicked === 1) startTime = Date.now();

            if (robotsClicked < flickTarget) {
                createRobot();
            } else {
                const timeElapsed = (Date.now() - startTime) / 1000;
                showResult(robotsClicked, timeElapsed);
            }
        }
        else if (gameMode === 'robot-attack') {
            if (robotsClicked >= robotAttackTarget) {
                const timeElapsed = (Date.now() - startTime) / 1000;
                clearInterval(intervalId);
                showResult(robotsClicked, timeElapsed);
            }
        }
        else if (gameMode === 'triple-attack') {
            if (robotsClicked >= tripleTarget) {
                const timeElapsed = (Date.now() - startTime) / 1000;
                showResult(robotsClicked, timeElapsed);
            } else {
                createRobot();
            }
        }
    });
}

function startGame() {
    $('#modal').hide();
    $('#time').text('');
    robotsClicked = 0;
    totalClicks = 0;
    gameActive = true;
    $('.robot').remove();

    $("body").addClass("game-cursor");

    $('#hud').show();
    updateHUD();
    $('body').addClass('in-game');

    if (gameMode === 'robot-attack') {
        startTime = Date.now();
        robotSize = 200;
        intervalId = setInterval(createRobot, spawnRate);
    }
    else if (gameMode === 'triple-attack') {
        startTime = Date.now();

        for (let i = 0; i < 3; i++) createRobot();
    }
    else {
        createRobot();
    }
}

$('.game-mode').on('click', function () {
    $('.game-mode').removeClass('active');
    $(this).addClass('active');
    gameMode = this.id;
});

$('.difficulty').on('click', function () {
    $('.difficulty').removeClass('active');
    $(this).addClass('active');

    if (this.id === 'easy') {
        robotSize = 400;
        spawnRate = 1200;
    }
    if (this.id === 'medium') {
        robotSize = 200;
        spawnRate = 800;
    }
    if (this.id === 'hard') {
        robotSize = 100;
        spawnRate = 400;
    }

});

gameMode = 'robot-flick';
robotSize = 400;
$('.game-mode').removeClass('active');
$('#robot-flick').addClass('active');
$('.difficulty').removeClass('active');
$('#easy').addClass('active');

$('#start-btn').on('click', function () {
    startGame();
});

$(document).on('click', function (e) {
    if (!gameActive) return;
    if ($(e.target).closest('#modal, #result-modal, #start-btn, #result-ok').length) return;
    totalClicks++;
    updateHUD();
    try { shotAudio.currentTime = 0; shotAudio.play(); } catch (err) {}
});

const HS_KEY = 'aimTrainer_highscores_v1';

function loadHighScores() {
    try {
        const raw = localStorage.getItem(HS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function saveHighScores(obj) {
    try {
        localStorage.setItem(HS_KEY, JSON.stringify(obj));
    } catch (e) {
    }
}

function compareScore(a, b) {
    return a.time - b.time;
}

function showResult(hits, timeElapsed) {
    gameActive = false;
    $('body').removeClass('game-cursor');
    $('body').removeClass('in-game');
    clearInterval(intervalId);
    $('.robot').remove();

    const resultHtml = `
        <p><strong>Time:</strong> ${timeElapsed ? timeElapsed.toFixed(2) + 's' : '—'}</p>
    `;

    const allScores = loadHighScores();
    const mode = gameMode || 'unknown';
    const prevList = Array.isArray(allScores[mode]) ? allScores[mode] : [];
    const wasFirstTime = prevList.length === 0;

    let success = true;
    if (mode === 'robot-attack') success = hits >= robotAttackTarget;
    if (mode === 'triple-attack') success = hits >= tripleTarget;
    if (mode === 'robot-flick') success = hits >= flickTarget;

    let newList = prevList;
    let isHigh = false;
    if (success) {
        const entry = {
            time: Number((timeElapsed || 0).toFixed(3)),
            date: new Date().toISOString()
        };

        newList = prevList.concat([entry]).sort(compareScore).slice(0, 3);
        allScores[mode] = newList;
        saveHighScores(allScores);

        if (!wasFirstTime) {
            isHigh = newList.some((e) => e.date === entry.date);
        }
    }

    let hsHtml = '<div style="margin-top:10px"><strong>Top 3 — ' + mode.replace(/-/g, ' ') + '</strong><ol style="text-align:left;margin:8px auto;max-width:240px">';
    newList.forEach((s) => {
        hsHtml += `<li>${s.time.toFixed(2)}s</li>`;
    });
    if (newList.length === 0) hsHtml += '<li>No scores yet</li>';
    hsHtml += '</ol></div>';

    const highBadge = isHigh ? '<div style="color:#ffd54f;font-weight:700;margin-bottom:6px">High Score!</div>' : '';

    $('#hud').hide();

    $('#result-text').html(highBadge + resultHtml + hsHtml);
    $('#result-modal').show();
}

$('#result-ok').on('click', function () {
    $('#result-modal').hide();
    $('#modal').show();
});

function showLoss(message) {
    gameActive = false;
    clearInterval(intervalId);
    $('.robot').remove();
    $('body').removeClass('game-cursor');
    $('body').removeClass('in-game');

    if (message) $('#loss-text').text(message);
    $('#hud').hide();
    $('#loss-modal').show();
}

$('#loss-ok').on('click', function () {
    $('#loss-modal').hide();
    $('#modal').show();
});

$('#info-btn').on('click', function () {
    $('#info-modal').show();
});

$('#info-close').on('click', function () {
    $('#info-modal').hide();
});

$('body').on('mouseenter', 'button, .info-btn', function () {
    try { hoverAudio.currentTime = 0; hoverAudio.play(); } catch (e) {}
});

function updateHUD() {
    const hits = robotsClicked || 0;
    const clicks = totalClicks || 0;
    const accuracy = clicks > 0 ? (hits / clicks) * 100 : 0;

    let target = flickTarget;
    if (gameMode === 'triple-attack') target = tripleTarget;
    if (gameMode === 'robot-attack') target = robotAttackTarget;

    const left = Math.max(0, target - hits);

    $('#hud-left').text('Left: ' + left);
    $('#hud-acc').text('Accuracy: ' + accuracy.toFixed(1) + '%');
}