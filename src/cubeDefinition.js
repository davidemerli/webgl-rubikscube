import * as utils from "./utils.js";


let accX = 0.2, accY = 0.2;
let velX = 0.0, velY = 0.0;

class Cubie {
	constructor(gl, program, x, y, z, size) {
		return (async () => {

			this.x = x;
			this.y = y;
			this.z = z;

			this.matrix = utils.MakeTranslateMatrix(
				this.x * (size),
				this.y * (size),
				this.z * (size),
			);

			this.mesh = await this.initMesh(gl);

			this.vao = this.initVAO(gl, program, this.mesh);

			return this;
		})();
	}

	initVAO(gl, program, mesh) {
		let vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		var positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(program.POSITION_ATTRIBUTE);
		gl.vertexAttribPointer(program.POSITION_ATTRIBUTE, 3, gl.FLOAT, false, 0, 0);

		var normalBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertexNormals), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(program.NORMAL_ATTRIBUTE);
		gl.vertexAttribPointer(program.NORMAL_ATTRIBUTE, 3, gl.FLOAT, false, 0, 0);

		var uvBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.textures), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(program.UV_ATTRIBUTE);
		gl.vertexAttribPointer(program.UV_ATTRIBUTE, 2, gl.FLOAT, false, 0, 0);

		var indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);

		return vao;
	}

	async initMesh(gl) {
		let objStr;

		try {
			objStr = await utils.get_objstr("assets/cubies/cube" + this.x + this.y + this.z + ".obj");
		} catch (error) {
			objStr = await utils.get_objstr("assets/cube.obj");
		}

		return new OBJ.Mesh(objStr);;
	}
}

export class RubiksCube {
	constructor(gl, program) {
		return (async () => {
			this.gl = gl;
			this.program = program;
			this.size = 1.85;
			this.cubies = await this.initCubies(gl, program);
			this.angle = Quaternion.fromEuler(0, utils.degToRad(30), 0);

			this.rotatingFunc = null;

			this.moveQueue = []

			this.cube = new Cube();

			return this;
		})();
	}

	scramble() {
		if (this.moveQueue.length > 0) return;

		fetch('https://mc.forgia.dev:5000/scramble')
			.then(response => response.text())
			.then(async result => {
				let moves = result.split(' ');

				for (let i = 0; i < moves.length; i++) {
					const move = moves[i];
					const c = move[move.length - 1];

					let amount = c == "'" ? -1 : c == "2" ? 2 : 1;

					this.moveQueue.push([move[0], amount]);
				}
			});
	}

	async solveCube() {
		if (this.cube.isSolved() || this.moveQueue.length > 0) return;

		fetch('https://mc.forgia.dev:5000/solve/' + this.cube.asString())
			.then(response => response.text())
			.then(async result => {
				let moves = result.split(' ');

				for (let i = 0; i < moves.length; i++) {
					const move = moves[i];
					const c = move[move.length - 1];

					let amount = c == "'" ? -1 : c == "2" ? 2 : 1;

					this.moveQueue.push([move[0], amount]);
				}
			});
	}

	async initCubies(gl, program) {
		let cubies = [];

		// Creating the coordinates of the cubies
		for (let x = -1; x <= 1; x++) {
			for (let y = -1; y <= 1; y++) {
				for (let z = -1; z <= 1; z++) {


					// if (x == 1 && y == 1 && Math.abs(z) == 1 || (x == 0 && y == 0 && z == 0)) {
					cubies.push(await new Cubie(gl, program, x, y, z, this.size));
					console.log(x, y, z)
					// }
				}
			}
		}

		return cubies;
	}

	applyMoveFromCamera(move, amount) {
		// if (this.rotatingFunc != null) return;

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

		this.moveQueue.push([toRotate, amount]);
	}

	applyMove(toRotate, amount) {
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

		this.cube.move(toRotate + (amount == -1 ? "'" : Math.abs(amount) == 2 ? "2" : ""));

		console.log(this.cube.asString())
	}

	async turn(rX, rY, rZ, index, amount) {
		const backwards = amount < 0;
		const speed = 30;

		amount = Math.abs(amount % 360);

		this.rotatingFunc = (deltaC) => {
			deltaC *= speed;
			deltaC = Math.min(deltaC, amount);

			this.cubies.filter((cubie) =>
				(rX && Math.round(cubie.x) == index) ||
				(rY && Math.round(cubie.y) == index) ||
				(rZ && Math.round(cubie.z) == index))
				.forEach((cubie) => {
					cubie.matrix = [
						utils.MakeRotateXYZMatrix(rX, rY, rZ, index * (backwards ? -deltaC : deltaC)),
						cubie.matrix,
					].reduce(utils.multiplyMatrices)
				});

			amount -= deltaC;

			if (amount == 0) {
				this.cubies.forEach((cubie) => {
					cubie.x = cubie.matrix[3] / this.size;
					cubie.y = cubie.matrix[7] / this.size;
					cubie.z = cubie.matrix[11] / this.size;
				});

				this.rotatingFunc = null;
			}
		}
	}

	update(deltaC) {
		if (this.rotatingFunc != null) {
			this.rotatingFunc(deltaC);
		} else if (this.moveQueue.length > 0) {
			let toRotate, amount;
			[toRotate, amount] = this.moveQueue.shift();

			this.applyMove(toRotate, amount);
		}

		// console.log(deltaC)

		velX -= Math.sign(velX) * Math.min(accX, Math.abs(velX)) * deltaC;
		velY -= Math.sign(velY) * Math.min(accY, Math.abs(velY)) * deltaC;

		//Limit the x-axis rotation range
		this.angle = Quaternion.fromEuler(0, utils.degToRad(velY), utils.degToRad(velX)).mul(this.angle);
	}
}

export function makeColorGradient(f, center, width) {
	if (center == undefined) center = 128;
	if (width == undefined) width = 127;

	var r = Math.sin(f) * width + center;
	var g = Math.sin(f + 2 / 3 * Math.PI) * width + center;
	var b = Math.sin(f + 4 / 3 * Math.PI) * width + center;

	return [r / 255, g / 255, b / 255]
}

//Add mouse interaction on canvas
export function initMouseControl(canvas) {
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
			velX = Math.sign((x - lastX)) * Math.min(10, Math.abs(factor1 * (x - lastX)));
			velY = Math.sign((y - lastY)) * Math.min(10, Math.abs(factor1 * (y - lastY)));
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

	canvas.addEventListener("touchend", handleEnd, false);

	function handleEnd(event) {
		dragging = false;
	}

	canvas.addEventListener("touchmove", handleMove, false);

	function handleMove(event) {
		var touch = event.changedTouches[0]
		var x = touch.clientX, y = touch.clientY;

		//Rotate
		if (dragging) {
			var factor1 = 200 / canvas.height;//spinning speed
			velX = Math.sign((x - lastX)) * Math.min(10, Math.abs(factor1 * (x - lastX)));
			velY = Math.sign((y - lastY)) * Math.min(10, Math.abs(factor1 * (y - lastY)));
		}

		//Update the previous position as the starting position
		lastX = x;
		lastY = y;
	}
}