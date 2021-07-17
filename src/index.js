import * as utils from "./utils.js";
import * as cubedef from "./cubeDefinition.js";

let zoom = 10;

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

    program.POSITION_ATTRIBUTE = gl.getAttribLocation(program, "a_position");
    program.NORMAL_ATTRIBUTE = gl.getAttribLocation(program, "a_normal");
    program.UV_ATTRIBUTE = gl.getAttribLocation(program, "a_uv");
    program.TEXTURE_ATTRIBUTE = gl.getUniformLocation(program, "u_texture");

    let rubiksCube = await new cubedef.RubiksCube(gl, program);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    let lastUpdateTime = 0;

    function animate() {
        var currentTime = (new Date).getTime();
        var deltaC = (30 * (currentTime - lastUpdateTime)) / 1000.0;

        rubiksCube.update(deltaC);

        lastUpdateTime = currentTime;
    }


    program.MATRIX_ATTRIBUTE = gl.getUniformLocation(program, "matrix");
    program.NORMALMATRIX_ATTRIBUTE = gl.getUniformLocation(program, "nMatrix");

    let lightDirectionLocation = gl.getUniformLocation(program, "lightDirection");
    let lightColorLocation = gl.getUniformLocation(program, "lightColor");
    let materialDiffColorLocation = gl.getUniformLocation(program, 'mDiffColor');

    let imgtx = utils.getTexture(gl, 'assets/stickers1.png')

    console.log(rubiksCube.cubies[0].mesh)

    var slider1 = document.getElementById("slider1");
    var slider2 = document.getElementById("slider2");

    function drawScene() {
        //define directional light
        let dirLightAlpha = -utils.degToRad(slider1.value);
        let dirLightBeta = -utils.degToRad(slider2.value);

        let lightDirection = [
            Math.cos(dirLightAlpha) * Math.cos(dirLightBeta),
            Math.sin(dirLightAlpha),
            Math.cos(dirLightAlpha) * Math.sin(dirLightBeta)
        ];
        let lightColor = [1.5, 1.5, 1.5];
        var cubeMaterialColor = [0.5, 0.5, 0.5];

        if (!imgtx.isLoaded) {
            window.requestAnimationFrame(drawScene);

            return;
        }

        animate();

        //use this aspect ratio to keep proportions
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        let c = [0.9, 0.9, 0.9];

        gl.clearColor(c[0], c[1], c[2], 1);
        gl.enable(gl.DEPTH_TEST)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const aspect_ratio = gl.canvas.width * 1.0 / gl.canvas.height;
        const perspectiveMatrix = utils.MakePerspective(100, aspect_ratio, 0.1, 100.0);
        const viewMatrix = utils.MakeView(0, 0, zoom, 0, 0);

        const worldMatrix = utils.MakeWorld(
            0, 0, 0, // x, y, z
            0, 30, 0,
            1 // scale
        );

        rubiksCube.cubies.forEach(cubie => {

            const cubeMatrix = [
                rubiksCube.angle.toMatrix4(),
                cubie.matrix,
            ].reduce(utils.multiplyMatrices);

            const viewWorldMatrix = [
                viewMatrix,
                worldMatrix,
                cubeMatrix,
            ].reduce(utils.multiplyMatrices);

            const projectionMatrix = [
                perspectiveMatrix,
                viewWorldMatrix,

            ].reduce(utils.multiplyMatrices);

            const normalTransformationMatrix = utils.invertMatrix(utils.transposeMatrix(viewWorldMatrix));

            gl.uniform3fv(lightDirectionLocation, lightDirection);
            gl.uniform3fv(lightColorLocation, lightColor);
            gl.uniform3fv(materialDiffColorLocation, cubeMaterialColor);


            gl.uniformMatrix4fv(program.MATRIX_ATTRIBUTE, gl.FALSE, utils.transposeMatrix(projectionMatrix));
            gl.uniformMatrix4fv(program.NORMALMATRIX_ATTRIBUTE, gl.FALSE, utils.transposeMatrix(normalTransformationMatrix));


            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, imgtx.webglTexture);
            gl.uniform1i(program.TEXTURE_ATTRIBUTE, 0);

            gl.bindVertexArray(cubie.vao);

            gl.drawElements(gl.TRIANGLES, cubie.mesh.indices.length, gl.UNSIGNED_SHORT, 0);
            // gl.drawElements(gl.TRIANGLES, cubie.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        });

        window.requestAnimationFrame(drawScene);
    }

    window.requestAnimationFrame(drawScene);
    bindButtons(rubiksCube);
}

function bindButtons(rubiksCube) {
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

        if (e.key.toUpperCase() == 'E') {
            rubiksCube.size = rubiksCube.size == 5 ? 1.9 : 5;

            rubiksCube.cubies.forEach((cubie) =>
                cubie.matrix = utils.MakeTranslateMatrix(
                    cubie.x * (rubiksCube.size),
                    cubie.y * (rubiksCube.size),
                    cubie.z * (rubiksCube.size),
                ));
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


    var slider = document.getElementById("expandRange");

    slider.oninput = function () {
        if (rubiksCube.moveQueue.length != 0 || rubiksCube.rotatingFunc != null) return;

        let diff = this.value - rubiksCube.size;

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

async function runApp() {
    await Promise.all([
        (async () => await main())(),
        // (async () => await Cube.initSolver())(),
    ])
}

window.onload = main;
