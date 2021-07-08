import * as utils from "./utils.js";



let currentAngle = [0, 0]

var lastUpdateTime;
var g_time = 0;


class Cubie {
	constructor(gl, program, x, y, z) {
		const spacing = 0.03;

		this.x = x;
		this.y = y;
		this.z = z;

		this.colors = this.#initColors();

		this.positionAttributeLocation = gl.getAttribLocation(program, "a_position");
		this.colorAttributeLocation = gl.getAttribLocation(program, "a_color");
		this.matrixLocation = gl.getUniformLocation(program, "matrix");

		this.matrix = utils.MakeTranslateMatrix(
			x * (1 + spacing),
			y * (1 + spacing),
			z * (1 + spacing),
		);

		this.vao = this.#initVAO(gl);
	}

	#initVAO(gl) {
		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		// Create a buffer and put three 2d clip space points in it
		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(IN_VERTICES), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(this.positionAttributeLocation);
		gl.vertexAttribPointer(this.positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

		const colorBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(this.colorAttributeLocation);
		gl.vertexAttribPointer(this.colorAttributeLocation, 3, gl.FLOAT, false, 0, 0);

		const indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(INDICES), gl.STATIC_DRAW);

		return vao;
	}

	#initColors() {
		this.colors = [white, yellow, orange, red, green, blue];

		const dirs = [
			[0, 1, 0], [0, -1, 0], // up, down
			[-1, 0, 0], [1, 0, 0], // left, right
			[0, 0, 1], [0, 0, -1], // front, back
		];

		dirs.forEach((dir, i) => {
			const xx = this.x + dir[0];
			const yy = this.y + dir[1];
			const zz = this.z + dir[2];

			if (Math.min(xx, yy, zz) != -2 && Math.max(xx, yy, zz) != 2) {
				this.colors[i] = black;
			}
		});

		return getColorArray.apply(this, this.colors);
	}
}

let counter = 0;

export class RubiksCube {
	constructor(gl, program) {
		this.gl = gl;
		this.program = program;
		this.cubies = this.#initCubies(gl, program);
		this.currentAngle = [0, 0];
		this.angle = new Quaternion();

		this.rotating = false;

	}

	#initCubies(gl, program) {
		let cubies = [];

		// Creating the coordinates of the cubies
		for (let x = -1; x <= 1; x++) {
			for (let y = -1; y <= 1; y++) {
				for (let z = -1; z <= 1; z++) {

					if (x == 0 && y == 0 && z == 0) continue;

					cubies.push(new Cubie(gl, program, x, y, z));
				}
			}
		}

		return cubies;
	}

	applyMove(move, amount) {
		const faces = {
			"U": [0, -1, 0, 0],
			"D": [0, 1, 0, 0],
			"R": [-1, 0, 0, 0],
			"L": [1, 0, 0, 0],
			"B": [0, 0, 1, 0],
			"F": [0, 0, -1, 0],
		}

		let selFace = faces[move[0]];

		if (selFace == undefined) return;

		let faceKeys = Object.keys(faces);
		let vectors = Object.values(faces);

		let rotatedV = vectors.map((v) => utils.multiplyMatrixVector(this.angle.toMatrix4(), v));

		let best = utils.argMax(rotatedV.map((v) => utils.dot(v, selFace)));

		let toRotate = faceKeys[best];

		switch (toRotate) {
			case "U":
				this.turn(0, 1, 0, 1, 90 * amount);
				break;
			case "D":
				this.turn(0, 1, 0, -1, 90 * amount);
				break;
			case "R":
				this.turn(1, 0, 0, 1, 90 * amount);
				break;
			case "L":
				this.turn(1, 0, 0, -1, 90 * amount);
				break;
			case "F":
				this.turn(0, 0, 1, 1, 90 * amount);
				break;
			case "B":
				this.turn(0, 0, 1, -1, 90 * amount);
				break;
		}
	}

	async turn(rX, rY, rZ, index, amount) {
		if (this.rotating) return;

		const backwards = amount < 0;

		amount = Math.abs(amount % 360);

		const speed = 5;

		const updateRotating = (value) => this.rotating = value;

		updateRotating(true);

		for (let i = 0; i < amount / speed; i++) {
			await sleep(10);

			this.cubies.forEach((cubie) => {
				if ((rX && Math.round(cubie.x) == index) ||
					(rY && Math.round(cubie.y) == index) ||
					(rZ && Math.round(cubie.z) == index)) {

					cubie.matrix = [
						utils.MakeRotateXYZMatrix(rX, rY, rZ, index * (backwards ? -speed : speed)),
						cubie.matrix,
					].reduce(utils.multiplyMatrices)
				}

				cubie.x = cubie.matrix[3];
				cubie.y = cubie.matrix[7];
				cubie.z = cubie.matrix[11];
			});
		}

		g_time = 0
		lastUpdateTime = 0

		updateRotating(false);
	}

	draw() {
		counter++;

		const gl = this.gl;

		const aspect_ratio = gl.canvas.width * 1.0 / gl.canvas.height;
		const perspectiveMatrix = utils.MakePerspective(100, aspect_ratio, 0.1, 100.0);
		const viewMatrix = utils.MakeView(0, 0, 5, 0, 0);

		//TODO: make rotation mouse controllable
		const worldMatrix = utils.MakeWorld(
			0, 0, 0, // x, y, z
			0, 30, 0,
			// Math.sin(counter / 360) * 360, // example rotation
			// Math.sin(counter / 360 + 2 / 3 * Math.PI) * 360,
			// Math.sin(counter / 360 + 4 / 3 * Math.PI) * 360,
			1 // scale
		);




		this.cubies.forEach(cubie => {
			const projectionMatrix = [
				perspectiveMatrix,
				viewMatrix,
				worldMatrix,
				this.angle.toMatrix4(),
				cubie.matrix,
			].reduce(utils.multiplyMatrices);

			gl.uniformMatrix4fv(cubie.matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));
			gl.bindVertexArray(cubie.vao);

			gl.drawElements(gl.TRIANGLES, INDICES.length, gl.UNSIGNED_SHORT, 0);
		});
	}

	//Add mouse interaction on canvas
	initMouseControl(canvas, rubiksCube) {
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
					var dx1 = factor1 * (x - lastX);
					var dy1 = factor1 * (y - lastY);

					//Limit the x-axis rotation range
					rubiksCube.currentAngle[0] = rubiksCube.currentAngle[0] + dy1;
					rubiksCube.currentAngle[1] = rubiksCube.currentAngle[1] + dx1;

					rubiksCube.angle = Quaternion.fromEuler(0, utils.degToRad(dy1), utils.degToRad(dx1)).mul(rubiksCube.angle);
				}

				//Update the previous position as the starting position
				lastX = x;
				lastY = y;
			}
		}
	}
}

const IN_VERTICES = [		// Vertex #:
	0.5, 0.5, -0.5, 	//  0
	0.5, -0.5, -0.5,  	//  1
	-0.5, 0.5, -0.5,  	//  2
	0.5, 0.5, 0.5,  	//  3
	-0.5, 0.5, 0.5,  	//  4
	0.5, -0.5, 0.5,  	//  5
	0.5, 0.5, -0.5,  	//  6
	0.5, 0.5, 0.5,  	//  7
	0.5, -0.5, -0.5,  	//  8
	0.5, -0.5, -0.5,  	//  9
	0.5, -0.5, 0.5,  	// 10
	-0.5, -0.5, -0.5,  	// 11
	-0.5, -0.5, -0.5,  	// 12
	-0.5, -0.5, 0.5,  	// 13
	-0.5, 0.5, -0.5,  	// 14
	0.5, 0.5, 0.5,  	// 15
	0.5, 0.5, -0.5,  	// 16
	-0.5, 0.5, 0.5,  	// 17
	-0.5, -0.5, -0.5,  	// 18
	-0.5, -0.5, 0.5,  	// 19
	0.5, -0.5, 0.5,  	// 20
	-0.5, -0.5, 0.5,  	// 21
	-0.5, 0.5, 0.5,  	// 22
	-0.5, 0.5, -0.5   	// 23
];

const INDICES = [ 	// Face #:
	0, 1, 2,	//  0
	1, 18, 2,    //  1
	3, 4, 5,    //  2
	4, 19, 5,    //  3
	6, 7, 8,    //  4
	7, 20, 8,    //  5
	9, 10, 11,    //  6
	10, 21, 11,    //  7
	12, 13, 14,    //  8
	13, 22, 14,    //  9
	15, 16, 17,    // 10
	16, 23, 17     // 11
];

export function makeColorGradient(f, center, width) {
	if (center == undefined) center = 128;
	if (width == undefined) width = 127;

	var r = Math.sin(f) * width + center;
	var g = Math.sin(f + 2 / 3 * Math.PI) * width + center;
	var b = Math.sin(f + 4 / 3 * Math.PI) * width + center;

	return [r / 255, g / 255, b / 255]
}

// var colors = [					// Color #:
// 	0.0, 1.0, 1.0, 	//  0
// 	0.0, 1.0, 1.0,  //  1
// 	0.0, 1.0, 1.0,  //  2
// 	0.0, 0.0, 1.0,  //  3
// 	0.0, 0.0, 1.0,  //  4
// 	0.0, 0.0, 1.0,  //  5
// 	1.0, 0.0, 0.0,  //  6
// 	1.0, 0.0, 0.0,  //  7
// 	1.0, 0.0, 0.0,  //  8
// 	1.0, 1.0, 0.0,  //  9
// 	1.0, 1.0, 0.0,  // 10
// 	1.0, 1.0, 0.0,  // 11
// 	1.0, 0.0, 1.0,  // 12
// 	1.0, 0.0, 1.0,  // 13
// 	1.0, 0.0, 1.0,  // 14
// 	0.0, 1.0, 0.0,  // 15
// 	0.0, 1.0, 0.0,  // 16
// 	0.0, 1.0, 0.0,  // 17
// 	0.0, 1.0, 1.0,  // 18
// 	0.0, 0.0, 1.0,  // 19
// 	1.0, 0.0, 0.0,  // 20
// 	1.0, 1.0, 0.0,  // 21
// 	1.0, 0.0, 1.0,  // 22
// 	0.0, 1.0, 0.0   // 23
// ];

const red = utils.hexToRgb('#b71234');
const green = utils.hexToRgb('#009b48');
const blue = utils.hexToRgb('#0046ad');
const yellow = utils.hexToRgb('#ffd500');
const orange = utils.hexToRgb('#ff5800');
const white = utils.hexToRgb('#ffffff');
const black = utils.hexToRgb('#000000');

export function getColorArray(up, down, left, right, front, back) {
	let colors = [    // Color #:
		back, 	//  0
		back,  	//  1
		back,  	//  2
		front,  //  3
		front,  //  4
		front,  //  5
		right,  //  6
		right,  //  7
		right,  //  8
		down,  	//  9
		down,  	// 10
		down,  	// 11
		left,  	// 12
		left,  	// 13
		left,  	// 14
		up,  	// 15
		up,  	// 16
		up,  	// 17
		back,  	// 18
		front,  // 19
		right,  // 20
		down,  	// 21
		left,  	// 22
		up   	// 23
	];
	// return colors as a list of real values and not a list of lists
	return [].concat(...colors);
}

export const sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms));