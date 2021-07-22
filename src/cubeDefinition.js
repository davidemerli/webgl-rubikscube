import * as utils from "./utils.js";

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

			this.mesh = await this.initMesh();
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

	async initMesh() {
		let objStr;

		try {
			objStr = await utils.get_objstr("assets/cubies/cube" + this.x + this.y + this.z + ".obj");
		} catch (error) {
			objStr = await utils.get_objstr("assets/cube.obj");
		}

		return new OBJ.Mesh(objStr);
	}
}

export class RubiksCube {
	constructor(gl, program) {
		return (async () => {
			this.gl = gl;
			this.program = program;
			this.size = 1.85;
			this.cubies = await this.initCubies(gl, program);

			this.accX = 0.5, this.accY = 0.5;
			this.velX = 0.0, this.velY = 0.0;

			this.cubeWorldMatrix = utils.MakeWorld(
				0, 0, 0,
				0, 30, 0,
				1
			);

			this.angle = Quaternion.fromEuler(0, 0, 0);

			this.rotatingFunc = null;

			this.moveQueue = []

			this.cube = new Cube();

			return this;
		})();
	}

	applyAlgorithm(algorithm) {
		let moves = algorithm.split(' ');

		for (let i = 0; i < moves.length; i++) {
			let amount, move;
			[move, amount] = convertToMoveAmount(moves[i]);

			this.moveQueue.push([move[0], amount]);
		}
	}

	scramble() {
		if (this.moveQueue.length > 0) return;

		fetch('https://mc.forgia.dev:5000/scramble')
			.then(response => response.text())
			.then(async result => this.applyAlgorithm(result));
	}

	solveCube() {
		if (this.cube.isSolved() || this.moveQueue.length > 0) return;

		fetch('https://mc.forgia.dev:5000/solve/' + this.cube.asString())
			.then(response => response.text())
			.then(async result => this.applyAlgorithm(result));
	}

	async initCubies(gl, program) {
		let cubies = [];

		// Creating the coordinates of the cubies
		for (let x = -1; x <= 1; x++) {
			for (let y = -1; y <= 1; y++) {
				for (let z = -1; z <= 1; z++) {
					cubies.push(await new Cubie(gl, program, x, y, z, this.size));

					console.log('loaded', x, y, z)
				}
			}
		}

		return cubies;
	}

	/**
	 * gets the best face to rotate checking which of the face normals is closer to the base
	 * move, applied without any cube rotation
	 * 
	 * the output is a string representing the move to be applied, so it can be passed to applymove
	 */
	applyMoveFromCamera(move, amount) {
		const faces = {
			"U": [0, -1, 0, 0],
			"D": [0, 1, 0, 0],
			"R": [-1, 0, 0, 0],
			"L": [1, 0, 0, 0],
			"B": [0, 0, 1, 0],
			"F": [0, 0, -1, 0],
		}

		const selFace = faces[move[0]];

		if (selFace == undefined) return;

		const faceKeys = Object.keys(faces);
		const vectors = Object.values(faces);

		const rotatedV = vectors.map((v) => utils.multiplyMatrixVector(this.angle.toMatrix4(), v));

		const best = utils.argMax(rotatedV.map((v) => utils.dot(v, selFace)));

		const toRotate = faceKeys[best];

		this.moveQueue.push([toRotate, amount]);
	}

	/**
	* converts a string move into an actual movement for the cube
	*/
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

		this.cube.move(convertMoveToSymbolic(toRotate, amount));

		console.log(this.cube.asString())
	}

	/** 
	* rX, rY, rZ are mutually exclusive, so we can use a single function
	* they indicate which axis represents the face we are rotating
	*
	* index disambiguates which face we are rotating w.r.t. the chosen axis
	*/
	turn(rX, rY, rZ, index, amount) {
		const backwards = amount < 0;

		// avoid useless rotations
		amount = Math.abs(amount % 360);

		if (amount == 0) return;

		// default starting point for the function//
		let prevX = 0.0;
		let prevY = 0.0;

		// obtain the function we're going to use to rotate the face
		const paramBlendFunc = utils.paramBlend;
		const blendParam = utils.randBetween(2.0, 2.4);

		const speed = 500; // speed of the rotation

		// This function, given a value from 0 to amount, gives out the actual angle for the current time frame
		// using this we can have a more fluid motion using common math function used in animations
		const func = (x) => (backwards ? -1 : 1) * paramBlendFunc(blendParam, x / amount) * amount;

		// set the rotating function that will be called in the update function every tick
		this.rotatingFunc = (deltaC) => {
			deltaC *= speed;
			deltaC = Math.min(deltaC, amount - prevX);

			const y = func(prevX);

			this.cubies.filter((cubie) => isCubieToRotate(cubie, rX, rY, rZ, index))
				.forEach((cubie) => {
					cubie.matrix = [
						utils.MakeRotateXYZMatrix(rX, rY, rZ, index * (y - prevY)),
						cubie.matrix,
					].reduce(utils.multiplyMatrices)
				});

			// update the previous values
			prevX += deltaC;
			prevY = y;

			if (amount == Math.abs(y)) {
				// restore cubies coordinates from cubie rotated matrix, being careful that 'size' parameter
				// offsets the -1, 0, 1 coordinates
				this.cubies.forEach((cubie) => {
					cubie.x = Math.round(cubie.matrix[3] / this.size);
					cubie.y = Math.round(cubie.matrix[7] / this.size);
					cubie.z = Math.round(cubie.matrix[11] / this.size);
				});

				// set the rotating function to null to avoid calling it again
				this.rotatingFunc = null;
			}
		}
	}

	update(deltaC) {
		// call the rotating function if it's not null
		if (this.rotatingFunc != null) {
			this.rotatingFunc(deltaC);
		} else if (this.moveQueue.length > 0) {
			// if there are moves in the queue, apply the first one
			let toRotate, amount;
			[toRotate, amount] = this.moveQueue.shift();

			this.applyMove(toRotate, amount);
		}

		// decrement velX and velY w.r.t. the acceleration and the sign of each vector component
		this.velX -= Math.sign(this.velX) * Math.min(this.accX, Math.abs(this.velX)) * deltaC * 30;
		this.velY -= Math.sign(this.velY) * Math.min(this.accY, Math.abs(this.velY)) * deltaC * 30;

		// obtain the new rotation angle
		this.angle = Quaternion.fromEuler(
			0,
			utils.degToRad(this.velY),
			utils.degToRad(this.velX)
		).mul(this.angle);
	}
}

// example: F2 = F, 180; R' = R, -90
function convertToMoveAmount(moveString) {
	const c = moveString[moveString.length - 1];

	let amount = c == "'" ? -1 : c == "2" ? 2 : 1;

	return [moveString[0], amount];
}

// example: F, 180 = F2; R, -90 = R'
function convertMoveToSymbolic(toRotate, amount) {
	return toRotate + (amount == -1 ? "'" : Math.abs(amount) == 2 ? "2" : "")
}

function isCubieToRotate(cubie, rX, rY, rZ, index) {
	return (rX && cubie.x == index) ||
		(rY && cubie.y == index) ||
		(rZ && cubie.z == index);
}