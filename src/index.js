import * as utils from "./utils.js";

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

    // look up where the vertex data needs to go.
    var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    var colorAttributeLocation = gl.getAttribLocation(program, "a_color");
    var matrixLocation = gl.getUniformLocation(program, "matrix");

    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Create a buffer and put three 2d clip space points in it
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    var colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(colorAttributeLocation);
    gl.vertexAttribPointer(colorAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    var tx = 1;
    var ty = 1;
    var tz = 0;

    var currRotationF = 0;
    var rotationF = -180;

    var speed = 1;
    
    function drawScene() {
        //use this aspect ratio to keep proportions
        var aspect_ratio = gl.canvas.width * 1.0 / gl.canvas.height;
        var perspectiveMatrix = utils.MakePerspective(90, aspect_ratio, 0.1, 100.0);
        var viewMatrix = utils.MakeView(0, 0, 5, 0, 0);

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 0);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        var values = [1, 0, -1];
        var dirs = [];

        // Creating the coordinates of the cubes
        for (var i = 0; i < values.length; i++) {
            for (var j = 0; j < values.length; j++) {
                for (var k = 0; k < values.length; k++) {
                    dirs.push([i,j,k]);
                }
            }
        }

/*
        var dirs = [
            [-1, -1],
            [-1, 0],
            [-1, 1],
            [0, -1],
            [0, 0],
            [0, 1],
            [1, -1],
            [1, 0],
            [1, 1]
        ];
*/      
        if (currRotationF != rotationF) {
            currRotationF += Math.sign(rotationF - currRotationF) * speed;
        }

        for (var i = 0; i < 27; i++) {
            var dir = dirs[i];
            
            var projectionMatrix = [
                perspectiveMatrix,
                
                // Translate, then rotate and then translate back
                utils.MakeTranslateMatrix(tx, ty, tz),
                utils.MakeRotateZMatrix(currRotationF),
                utils.MakeTranslateMatrix(-tx, -ty, -tz),

                // x, y, z, rX, rY, rZ, scale
                utils.MakeWorld(dir[0] * 1.03 + tx, dir[1] * 1.03 + ty, dir[2] * 1.03 + tz, 0, 0, 0, 1),

                viewMatrix,
            ].reduce(utils.multiplyMatrices);

            // Set a the color as uniform. Pay attention! this line must be after "useProgram" otherwise
            //webgl is not able to find the colorLocation, and then to set its value 
            gl.uniformMatrix4fv(matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));

            gl.bindVertexArray(vao);
            gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        }

        window.requestAnimationFrame(drawScene);
    }

    window.requestAnimationFrame(drawScene);
}

window.onload = main;
