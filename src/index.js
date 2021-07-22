import * as utils from "./utils.js";
import * as cubedef from "./cubeDefinition.js";
import * as controls from "./controls.js";

async function main() {
    // Get a WebGL context
    const canvas = document.getElementById("c");
    const gl = canvas.getContext("webgl2");

    if (!gl) {
        document.write("GL context not opened");
        return;
    }

    utils.resizeCanvasToDisplaySize(canvas);
    
    const shaders = await utils.loadShaders(); // [vs, fs]

    // create GLSL shaders, upload the GLSL source, compile the shaders and link them
    const vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, shaders[0]);
    const fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, shaders[1]);
    const program = utils.createProgram(gl, vertexShader, fragmentShader);
    
    setupAttributes(program, gl);
    setupUniforms(program, gl);

    const rubiksCube = await new cubedef.RubiksCube(gl, program);
    controls.initMouseControl(canvas, rubiksCube);
    controls.bindButtons(rubiksCube);

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

    const slider3 = document.getElementById("slider3");
    const slider4 = document.getElementById("slider4");

    const pointLightColor = [1.0, 1.0, 1.0];

    const dirLightColor = [1.5, 1.5, 1.5];
    const cubeMaterialColor = [0.5, 0.5, 0.5];

    const backgroundColor = [0.9, 0.9, 0.9];

    function drawScene() {
        if (!imgtx.isLoaded) {
            window.requestAnimationFrame(drawScene);
            return;
        }

        //define directional light
        let dirLightAlpha = -utils.degToRad(slider1.value);
        let dirLightBeta = -utils.degToRad(slider2.value);
        let dirLightGamma = utils.degToRad(slider5.value);

        let dirLightDirection = [
            Math.cos(dirLightAlpha) * Math.cos(dirLightBeta),
            Math.sin(dirLightAlpha),
            Math.cos(dirLightAlpha) * Math.sin(dirLightBeta)
        ];

        let pointLightPos = [0.0, slider3.value, slider4.value];
        let eyePosition = [0.0, 0.0, controls.zoom];

        // animate scene
        animate();

        // clear the canvas
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(backgroundColor[0], backgroundColor[1], backgroundColor[2], 1);
        gl.enable(gl.DEPTH_TEST)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        //use this aspect ratio to keep proportions
        const aspect_ratio = gl.canvas.width * 1.0 / gl.canvas.height;

        // set the perspective matrix
        const perspectiveMatrix = utils.MakePerspective(100, aspect_ratio, 0.1, 100.0);
        // set the view matrix
        const viewMatrix = utils.MakeView(0, 0, controls.zoom, 0, 0);

        gl.uniform3fv(program.EYE_POSITION, eyePosition);

        // set directional light uniforms
        gl.uniform3fv(program.DIR_LIGHT_DIRECTION, dirLightDirection);
        gl.uniform3fv(program.DIR_LIGHT_COLOR, dirLightColor);
        gl.uniform3fv(program.DIR_LIGHT_GAMMA, dirLightGamma);

        // set point light uniforms
        gl.uniform3fv(program.POINT_LIGHT_POS, pointLightPos);
        gl.uniform3fv(program.POINT_LIGHT_COLOR, pointLightColor);

        gl.uniform3fv(program.MATERIAL_DIFF_COLOR, cubeMaterialColor);

        // apply texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, imgtx.webglTexture);
        gl.uniform1i(program.TEXTURE, 0);

        // draw each cubie
        rubiksCube.cubies.forEach(cubie => {
            const cubieWorldMatrix = [
                rubiksCube.cubeWorldMatrix,
                rubiksCube.angle.toMatrix4(),
                cubie.matrix,
            ].reduce(utils.multiplyMatrices);

            const projectionMatrix = [
                perspectiveMatrix,
                viewMatrix,
                cubieWorldMatrix,
            ].reduce(utils.multiplyMatrices);

            const normalTransformationMatrix = utils.invertMatrix(utils.transposeMatrix(cubieWorldMatrix));
    
            gl.uniformMatrix4fv(program.MATRIX_ATTRIBUTE, gl.FALSE, utils.transposeMatrix(projectionMatrix));
            gl.uniformMatrix4fv(program.NORMALMATRIX_ATTRIBUTE, gl.FALSE, utils.transposeMatrix(normalTransformationMatrix));
            gl.uniformMatrix4fv(program.WORLDMATRIX_ATTRIBUTE, gl.FALSE, utils.transposeMatrix(cubieWorldMatrix));

            gl.bindVertexArray(cubie.vao);

            gl.drawElements(gl.TRIANGLES, cubie.mesh.indices.length, gl.UNSIGNED_SHORT, 0);
        });

        window.requestAnimationFrame(drawScene);
    }

    window.requestAnimationFrame(drawScene);
}

function setupAttributes(program, context) {
    program.POSITION_ATTRIBUTE = context.getAttribLocation(program, "a_position");
    program.NORMAL_ATTRIBUTE = context.getAttribLocation(program, "a_normal");
    program.UV_ATTRIBUTE = context.getAttribLocation(program, "a_uv");
}

function setupUniforms(program, context) {
    program.MATRIX_ATTRIBUTE = context.getUniformLocation(program, "matrix");
    program.WORLDMATRIX_ATTRIBUTE = context.getUniformLocation(program, "pMatrix");
    program.NORMALMATRIX_ATTRIBUTE = context.getUniformLocation(program, "nMatrix");
    program.TEXTURE = context.getUniformLocation(program, "u_texture"); 

    program.EYE_POSITION = context.getUniformLocation(program, "eyePosition");

    program.DIR_LIGHT_DIRECTION = context.getUniformLocation(program, "dirLightDirection");
    program.DIR_LIGHT_COLOR = context.getUniformLocation(program, "dirLightColor");
    program.DIR_LIGHT_GAMMA = context.getUniformLocation(program, "dirLightGamma");

    program.POINT_LIGHT_POS = context.getUniformLocation(program, "pointLightPos");
    program.POINT_LIGHT_COLOR = context.getUniformLocation(program, "pointLightColor");

    program.MATERIAL_DIFF_COLOR = context.getUniformLocation(program, 'mDiffColor');
}

window.onload = main;
