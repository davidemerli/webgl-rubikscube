import * as utils from "./utils.js";
import * as cubedef from "./cubeDefinition.js";

let zoom = 10;

async function main() {
    // Get a WebGL context
    const canvas = document.getElementById("c");
    const gl = canvas.getContext("webgl2");

    if (!gl) {
        document.write("GL context not opened");
        return;
    }

    utils.resizeCanvasToDisplaySize(canvas);
    cubedef.initMouseControl(canvas);

    const shaders = await utils.loadShaders(); // [vs, fs]

    // create GLSL shaders, upload the GLSL source, compile the shaders and link them
    const vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, shaders[0]);
    const fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, shaders[1]);
    const program = utils.createProgram(gl, vertexShader, fragmentShader);
    
    setupAttributes(program, gl);
    setupUniforms(program, gl);

    const rubiksCube = await new cubedef.RubiksCube(gl, program);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    let lastUpdateTime = 0;

    function animate() {
        var currentTime = (new Date).getTime();
        var deltaC = (currentTime - lastUpdateTime) / 1000.0;

        rubiksCube.update(deltaC);
        lastUpdateTime = currentTime;
    }

    const imgtx = utils.getTexture(gl, 'assets/stickers1.png')

    const slider1 = document.getElementById("slider1");
    const slider2 = document.getElementById("slider2");

    const lightColor = [1.5, 1.5, 1.5];
    const cubeMaterialColor = [0.5, 0.5, 0.5];

    const c = [0.9, 0.9, 0.9];

    function drawScene() {
        if (!imgtx.isLoaded) {
            window.requestAnimationFrame(drawScene);
            return;
        }

        //define directional light
        let dirLightAlpha = -utils.degToRad(slider1.value);
        let dirLightBeta = -utils.degToRad(slider2.value);

        let lightDirection = [
            Math.cos(dirLightAlpha) * Math.cos(dirLightBeta),
            Math.sin(dirLightAlpha),
            Math.cos(dirLightAlpha) * Math.sin(dirLightBeta)
        ];

        animate();

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.clearColor(c[0], c[1], c[2], 1);
        gl.enable(gl.DEPTH_TEST)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        //use this aspect ratio to keep proportions
        const aspect_ratio = gl.canvas.width * 1.0 / gl.canvas.height;
        const perspectiveMatrix = utils.MakePerspective(100, aspect_ratio, 0.1, 100.0);
        const viewMatrix = utils.MakeView(0, 0, zoom, 0, 0);

        gl.uniform3fv(program.LIGHT_DIRECTION, lightDirection);
        gl.uniform3fv(program.LIGHT_COLOR, lightColor);
        gl.uniform3fv(program.MATERIAL_DIFF_COLOR, cubeMaterialColor);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, imgtx.webglTexture);
        gl.uniform1i(program.TEXTURE, 0);

        rubiksCube.cubies.forEach(cubie => {
            const cubeWorldMatrix = [
                utils.MakeWorld(0, 0, 0, 0, 30, 0, 1),
                rubiksCube.angle.toMatrix4(),
                cubie.matrix,
            ].reduce(utils.multiplyMatrices);

            const viewWorldMatrix = [
                viewMatrix,
                cubeWorldMatrix,
            ].reduce(utils.multiplyMatrices);

            const projectionMatrix = [
                perspectiveMatrix,
                viewWorldMatrix,
            ].reduce(utils.multiplyMatrices);

            const normalTransformationMatrix = utils.invertMatrix(utils.transposeMatrix(viewWorldMatrix));
    
            gl.uniformMatrix4fv(program.MATRIX_ATTRIBUTE, gl.FALSE, utils.transposeMatrix(projectionMatrix));
            gl.uniformMatrix4fv(program.NORMALMATRIX_ATTRIBUTE, gl.FALSE, utils.transposeMatrix(normalTransformationMatrix));

            gl.bindVertexArray(cubie.vao);

            gl.drawElements(gl.TRIANGLES, cubie.mesh.indices.length, gl.UNSIGNED_SHORT, 0);
        });

        window.requestAnimationFrame(drawScene);
    }

    window.requestAnimationFrame(drawScene);
    bindButtons(rubiksCube);
}

function setupAttributes(program, context) {
    program.POSITION_ATTRIBUTE = context.getAttribLocation(program, "a_position");
    program.NORMAL_ATTRIBUTE = context.getAttribLocation(program, "a_normal");
    program.UV_ATTRIBUTE = context.getAttribLocation(program, "a_uv");
}

function setupUniforms(program, context) {
    program.MATRIX_ATTRIBUTE = context.getUniformLocation(program, "matrix");
    program.NORMALMATRIX_ATTRIBUTE = context.getUniformLocation(program, "nMatrix");
    program.TEXTURE = context.getUniformLocation(program, "u_texture"); 

    program.LIGHT_DIRECTION = context.getUniformLocation(program, "lightDirection");
    program.LIGHT_COLOR = context.getUniformLocation(program, "lightColor");
    program.MATERIAL_DIFF_COLOR = context.getUniformLocation(program, 'mDiffColor');
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

window.onload = main;
