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
    cubedef.initMouseControl(canvas);

    // create GLSL shaders, upload the GLSL source, compile the shaders and link them
    var vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, shaders[0]);
    var fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, shaders[1]);
    var program = utils.createProgram(gl, vertexShader, fragmentShader);

    let rubiksCube = new cubedef.RubiksCube(gl, program);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);


    let lastUpdateTime = 0;

    function animate() {
        var currentTime = (new Date).getTime();
        var deltaC = (30 * (currentTime - lastUpdateTime)) / 1000.0;

        rubiksCube.update(deltaC);

        lastUpdateTime = currentTime;
    }

    function drawScene() {
        animate();

        //use this aspect ratio to keep proportions
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // let c = cubedef.makeColorGradient(utils.degToRad(new Date().getMilliseconds() % 360) * 0.01);
        let c = [0.9, 0.9, 0.9];

        gl.clearColor(c[0], c[1], c[2], 1);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        const aspect_ratio = gl.canvas.width * 1.0 / gl.canvas.height;
        const perspectiveMatrix = utils.MakePerspective(100, aspect_ratio, 0.1, 100.0);
        const viewMatrix = utils.MakeView(0, 0, 5, 0, 0);

        //TODO: make rotation mouse controllable
        const worldMatrix = utils.MakeWorld(
            0, 0, 0, // x, y, z
            0, 30, 0,
            1 // scale
        );
    
        rubiksCube.cubies.forEach(cubie => {
            const projectionMatrix = [
                perspectiveMatrix,
                viewMatrix,
                worldMatrix,
                rubiksCube.angle.toMatrix4(),
                cubie.matrix,
            ].reduce(utils.multiplyMatrices);

            gl.uniformMatrix4fv(cubie.matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));
            gl.bindVertexArray(cubie.vao);

            gl.drawElements(gl.TRIANGLES, cubedef.INDICES.length, gl.UNSIGNED_SHORT, 0);
        });

        // rubiksCube.draw();

        window.requestAnimationFrame(drawScene);
    }

    window.requestAnimationFrame(drawScene);
    bindButtons(rubiksCube);
}

function bindButtons(rubiksCube) {
    const rotations = ["F", "L", "B", "R", "U", "D"];
    let keysPressed = {};

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
}

async function runApp() {
    await Promise.all([
        (async () => await main())(),
        // (async () => await Cube.initSolver())(),
    ])
}

window.onload = main;
