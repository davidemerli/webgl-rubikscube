import * as utils from './utils.js';

export let zoom = 10;

//Add mouse interaction on canvas
export function initMouseControl(canvas, rubiksCube) {
    var lastX = -1, lastY = -1;
    var dragging = false;

    canvas.onmousedown = function (event) {//Press the mouse to trigger the listening event
        var x = event.clientX, y = event.clientY;

        if (event.button == 0) {//Left mouse buttons
            var rect1 = event.target.getBoundingClientRect();

            if (rect1.left <= x && x < rect1.right && rect1.top <= y && y < rect1.bottom) {
                lastX = x;
                lastY = y;
                dragging = true;
            }
        }
    }
    //Release the mouse
    canvas.onmouseup = function (event) {
        if (event.button == 0) {
            dragging = false;
        }
    };

    //Move the mouse
    canvas.onmousemove = function (event) {//Mouse movement monitoring
        var x = event.clientX, y = event.clientY;

        //Rotate
        if (dragging) {
            var factor1 = 200 / canvas.height;//spinning speed
            rubiksCube.velX = Math.sign((x - lastX)) * Math.min(10, Math.abs(factor1 * (x - lastX)));
            rubiksCube.velY = Math.sign((y - lastY)) * Math.min(10, Math.abs(factor1 * (y - lastY)));
        }

        //Update the previous position as the starting position
        lastX = x;
        lastY = y;
    }

    canvas.addEventListener("touchstart", handleStart, false);

    function handleStart(event) {
        var touch = event.changedTouches[0]
        var x = touch.clientX, y = touch.clientY;

        var rect1 = event.target.getBoundingClientRect();

        if (rect1.left <= x && x < rect1.right && rect1.top <= y && y < rect1.bottom) {
            lastX = x;
            lastY = y;
            dragging = true;
        }
    }

    canvas.addEventListener("touchend", () => dragging = false, false);
    canvas.addEventListener("touchmove", handleMove, false);

    function handleMove(event) {
        var touch = event.changedTouches[0]
        var x = touch.clientX, y = touch.clientY;

        //Rotate
        if (dragging) {
            var factor1 = 200 / canvas.height;//spinning speed
            rubiksCube.velX = Math.sign((x - lastX)) * Math.min(10, Math.abs(factor1 * (x - lastX)));
            rubiksCube.velY = Math.sign((y - lastY)) * Math.min(10, Math.abs(factor1 * (y - lastY)));
        }

        //Update the previous position as the starting position
        lastX = x;
        lastY = y;
    }
}

export function bindButtons(rubiksCube) {
    const rotations = ["F", "L", "B", "R", "U", "D"];
    let keysPressed = {};

    // scroll with mouse wheel
    document.onwheel = function (e) {
        zoom += e.deltaY > 0 ? 0.2 : -0.2;
    };

    rotations.forEach(id => {

        //Logic of digital buttons
        document.getElementById(id).addEventListener("click", function () {
            rubiksCube.applyMoveFromCamera(id, 1);
        });

        document.getElementById(id.concat("'")).addEventListener("click", function () {
            rubiksCube.applyMoveFromCamera(id, -1);
        });

        //Logic of physical buttons
        document.addEventListener('keydown', (e) => {
            keysPressed[e.key.toUpperCase()] = true;

            if (keysPressed[id]) {
                if (keysPressed['SHIFT']) {
                    rubiksCube.applyMoveFromCamera(id, -1);
                } else {
                    rubiksCube.applyMoveFromCamera(id, 1);
                };
            };
        });

        document.addEventListener('keyup', (e) => {
            delete keysPressed[e.key.toUpperCase()];
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key.toUpperCase() == 'S') {
            rubiksCube.solveCube();
        }
        if (e.key.toUpperCase() == 'Z') {
            rubiksCube.scramble();
        }
    })

    //bind button to solve cube
    document.getElementById("solve").addEventListener("click", () => {
        rubiksCube.solveCube();
    });

    //bind button to scramble cube
    document.getElementById("scramble").addEventListener("click", () => {
        rubiksCube.scramble();
    });

    const slider = document.getElementById("expandRange");

    slider.oninput = function () {
        if (rubiksCube.moveQueue.length != 0 || rubiksCube.rotatingFunc != null) return;

        const diff = this.value - rubiksCube.size;

        rubiksCube.cubies.forEach((cubie) =>
            cubie.matrix = utils.multiplyMatrices(
                utils.MakeTranslateMatrix(
                    cubie.x * (diff),
                    cubie.y * (diff),
                    cubie.z * (diff),
                ),
                cubie.matrix,
            )
        );

        rubiksCube.size = this.value;
    }
}