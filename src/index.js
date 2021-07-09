import * as utils from "./utils.js";
import * as cubedef from "./cubeDefinition.js";



async function main() {
    var shaders = await utils.loadShaders(); // [vs, fs]

    // Get a WebGL context
    var canvas = document.getElementById("c");
    var gl = canvas.getContext("webgl2");

    if (!gl) {
        document.write("GL context not opened");
        return;
    }

    utils.resizeCanvasToDisplaySize(gl.canvas);

    // create GLSL shaders, upload the GLSL source, compile the shaders and link them
    var vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, shaders[0]);
    var fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, shaders[1]);
    var program = utils.createProgram(gl, vertexShader, fragmentShader);

    let rubiksCube = new cubedef.RubiksCube(gl, program);
    rubiksCube.initMouseControl(canvas, rubiksCube);
    //testRotations(rubiksCube);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    function drawScene() {

        //use this aspect ratio to keep proportions
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // let c = cubedef.makeColorGradient(utils.degToRad(new Date().getMilliseconds() % 360) * 0.5);
        let c = [0.9, 0.9, 0.9];

        gl.clearColor(c[0], c[1], c[2], 1);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        rubiksCube.draw();

        window.requestAnimationFrame(drawScene);
    }

    window.requestAnimationFrame(drawScene);
    bindButtons(rubiksCube);
}

//TODO: remove test functions
async function testRotations(rubiksCube) {
    for (let i = 0; i < 100; i++) {
        rubiksCube.applyMove(choose(["R", "L", "U", "D", "B", "F"]), choose([1, -1]));
        await cubedef.sleep(500);
    }
}

function choose(choices) {
    var index = Math.floor(Math.random() * choices.length);
    return choices[index];
}

function bindButtons(rubiksCube) {
    const rotations = ["F", "L", "B", "R", "U", "D"];
    let keysPressed = {};

    rotations.forEach(id => {
        
        //Logic of digital buttons
        document.getElementById(id).addEventListener("click", function () {
            rubiksCube.applyMove(id, 1);
        });
        document.getElementById(id.concat("'")).addEventListener("click", function () {
            rubiksCube.applyMove(id, -1);
        });

        //Logic of physical buttons
        document.addEventListener('keydown', (e) => {
            keysPressed[e.key.toUpperCase()] = true;
            console.log(keysPressed);
            if (keysPressed[id]) {
                if (keysPressed['SHIFT']) {
                    rubiksCube.applyMove(id, -1);
                }
                else {
                    rubiksCube.applyMove(id, 1);
                };
            };
        });

        document.addEventListener('keyup', (e) => {
            delete keysPressed[e.key.toUpperCase()];
            //console.log(keysPressed);
        });
    });
}

window.onload = main;
