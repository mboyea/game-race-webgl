'use strict';
const TEXTURE_ATLAS_FILE_PATH = 'assets/racing-texture-atlas.png';
const CAR_FILE_PATH = 'assets/car.obj';
const WHEEL_FILE_PATH = 'assets/wheel.obj';

const main = () => {
	/** @type {HTMLCanvasElement} */ let canvas;
	/** @type {WebGL2RenderingContext} */ let gl;
	/** @type {WebGLProgram} */ let shaderProgram;

	/** @type {WebGLTexture} */ let textureAtlas;

	let maxFPS = 20;

	/* INITIALIZE WEBGL */ {
		canvas = document.getElementById('display');
		gl = canvas.getContext('webgl2');
		if (!gl) {
			console.error('Unable to initialize WebGL2.');
			return;
		}
		// configure webgl
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(1.0, 1.0, 1.0, 1.0);
		gl.enable(gl.DEPTH_TEST);
		// load shaders
		shaderProgram = initShaders(gl, 'vertex-shader', 'fragment-shader');
		gl.useProgram(shaderProgram);
		// TODO4: get shader variables
	}

	/* LOAD TEXTURE ATLAS */ {
		/**
		 * load a WebGL texture & return it
		 * @param {string} filePath 
		 */
		const loadTexture = (filePath) => {
			// TODO1: load texture from file
		}
		/**
		 * set the textureAtlas to this texture
		 * @param {WebGLTexture} texture 
		 */
		const setActiveTexture = (texture) => {
			// TODO2: set active texture
		}
	}

	/* LOAD MAP */ {
		// TODO: generate map mesh from json file
	}

	/* LOAD CARS */ {
		// TODO3: generate car mesh from obj file
	}

	/* INITIALIZE INPUT */ {
		document.addEventListener('keydown', (e) => {
			switch(e.code) {
				case('ArrowUp'):
					break;
				case('ArrowDown'):
					break;
				case('ArrowLeft'):
					break;
				case('ArrowRight'):
					break;
			}
		});
		document.getElementById('fps-slider').addEventListener('input', (e) => {
			maxFPS = e.target.value;
		});
	}

	/* START APPLICATION LOOP */ {
		/**
		 * get the number of ms to wait for this frame to achieve targetFPS
		 * @param {number} targetFPS 
		 * @param {number} deltaTimeMS 
		 * @returns 
		 */
		const msUntilFrameEnd = (targetFPS, deltaTimeMS) => {
			const TIME_FRAME_SHOULD_LAST = 1000 / targetFPS;
			return Math.max(0, TIME_FRAME_SHOULD_LAST - deltaTimeMS);
		};
		let frame = {
			beginTimeMS: Date.now(),
			updateEndTimeMS: Date.now(),
			endTimeMS: Date.now(),
			deltaTimeMS: 0,
			deltaTimeS: 0,
		};
		const update = () => {
			// TODO: update game
			// console.log(frame.deltaTimeS);
		};
		const render = () => {
			// TODO: render game
			// trigger loop
			setTimeout(loop, msUntilFrameEnd(maxFPS, Date.now() - frame.beginTimeMS));
		};
		const loop = () => {
			frame.endTimeMS = Date.now();
			frame.deltaTimeMS = frame.endTimeMS - frame.beginTimeMS;
			frame.deltaTimeS = frame.deltaTimeMS / 1000;
			frame.beginTimeMS = Date.now();
			update();
			requestAnimationFrame(render);
		};
		// start loop
		render();
	}
};

// if the document has loaded, call main(); otherwise, call main when the document loads
if (['complete', 'interactive', 'loaded'].includes(document.readyState)) {
	main();
} else document.addEventListener('DOMContentLoaded', main);

// ***************** REFERENCE ***************** //

const loadTri = (vertices, a, b, c) => {
};

const loadQuad = (vertices, a, b, c, d) => {
};

const loadObj = (filePath) => {
};

const oldMain = () => {
	const pyramidEdgeLength = 1.5;
	const targetFPS = 60;

	/** @type {HTMLCanvasElement} */ let canvas;
	/** @type {WebGL2RenderingContext} */ let gl;
	/** @type {WebGLProgram} */ let shaderProgram;

	/** @type {WebGLBuffer} */ let positionBuffer;
	/** @type {WebGLBuffer} */ let colorBuffer;
	/** @type {WebGLBuffer} */ let textureCoordinateBuffer;

	/** @type {WebGLUniformLocation} */ let uRotationDegrees;
	/** @type {WebGLUniformLocation} */ let uTextureAtlas;
	/** @type {GLuint} */ let aPosition;
	/** @type {GLuint} */ let aBaseColor;
	/** @type {GLuint} */ let aTextureCoordinates;

	/** @type {WebGLTexture} */ let textureAtlas;

	const Axis = Object.freeze({
		X: 0,
		Y: 1,
		Z: 2,
	});
	let rotationDegrees = vec3(45.0, 45.0, 45.0);
	let rotationAxis = Axis.X;
	let rotationSpeedDegreesPerFrame = 2;
	let doRotate = true;

	let vertices = {
		count: 0,
		positions: [],
		colors: [],
		textureCoordinates: [],
	};

	/* Initialize WebGL */ {
		canvas = document.getElementById('display');
		gl = canvas.getContext('webgl2');
		if (!gl) {
			console.error('Unable to initialize WebGL2.');
			return;
		}
		// configure webgl
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(1.0, 1.0, 1.0, 1.0);
		gl.enable(gl.DEPTH_TEST);
		// load shaders
		shaderProgram = initShaders(gl, 'vertex-shader', 'fragment-shader');
		gl.useProgram(shaderProgram);
		// get shader variables
		uRotationDegrees = gl.getUniformLocation(shaderProgram, 'uRotationDegrees');
		uTextureAtlas = gl.getUniformLocation(shaderProgram, 'uTextureAtlas');
		aPosition = gl.getAttribLocation(shaderProgram, 'aPosition');
		aBaseColor = gl.getAttribLocation(shaderProgram, 'aBaseColor');
		aTextureCoordinates = gl.getAttribLocation(shaderProgram, 'aTextureCoordinates')
	}

	/* Load Texture Atlas */ {
		const image = document.getElementById('texture-atlas');
		textureAtlas = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, textureAtlas);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.uniform1i(uTextureAtlas, 0);
	}

	/* Create Equilateral Pyramid Mesh */ {
		const toRadians = (degrees) => {
			return degrees * (Math.PI / 180);
		}
		// calculate the pyramid vertex positions
		/** tri edge length divided by two */ const l = pyramidEdgeLength / 2;
		const vertexPositions = [
			vec4(
				-l,
				-l * Math.tan(toRadians(30)),
				l * Math.tan(toRadians(30)),
				1.0,
			),
			vec4(
				l,
				-l * Math.tan(toRadians(30)),
				l * Math.tan(toRadians(30)),
				1.0,
			),
			vec4(
				0,
				l / Math.sin(toRadians(60)),
				l * Math.tan(toRadians(30)),
				1.0,
			),
			vec4(
				0,
				0,
				-(l / Math.cos(toRadians(30))),
				1.0,
			),
		];
		// calculate the pyramid face colors
		const faceColors = [
			vec4(1.0, 1.0, 1.0, 1.0), // white
			vec4(1.0, 1.0, 1.0, 1.0), // white
			vec4(1.0, 1.0, 1.0, 1.0), // white
			vec4(1.0, 1.0, 1.0, 1.0), // white
			vec4(0.0, 0.0, 0.0, 1.0), // black
			vec4(1.0, 0.0, 0.0, 1.0), // red
			vec4(0.0, 1.0, 0.0, 1.0), // green
			vec4(0.0, 0.0, 1.0, 1.0), // blue
			vec4(1.0, 1.0, 1.0, 1.0), // white
		];
		// calculate the pyramid texture coordinates for each vertex of each face (each triangle is applied the texture)
		const faceVertexTextureCoordinates = [
			vec2(0, 1),
			vec2(0.5, 0),
			vec2(1, 1),
		];
		/** create a triangle with vertices at vertexPosition a, b, c and face base color a */
		const tri = (a, b, c) => {
			const indices = [a, b, c];
			for (let i = 0; i < indices.length; i++) {
				vertices.positions.push(vertexPositions[indices[i]]);
				vertices.colors.push(faceColors[a]);
				vertices.textureCoordinates.push(faceVertexTextureCoordinates[i % 3]);
				vertices.count++;
			}
		}
		// construct the pyramid
		tri(0, 1, 2);
		tri(1, 2, 3);
		tri(2, 3, 0);
		tri(3, 0, 1);
		// create buffers, bind them, fill them with vertex data
		positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices.positions), gl.STATIC_DRAW);
		gl.vertexAttribPointer(aPosition, 4, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(aPosition);
		colorBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices.colors), gl.STATIC_DRAW);
		gl.vertexAttribPointer(aBaseColor, 4, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(aBaseColor);
		textureCoordinateBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordinateBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices.textureCoordinates), gl.STATIC_DRAW);
		gl.vertexAttribPointer(aTextureCoordinates, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(aTextureCoordinates);
	}

	/* Initialize Input */ {
		const axisXButton = document.getElementById('button-rotate-x');
		const axisYButton = document.getElementById('button-rotate-y');
		const axisZButton = document.getElementById('button-rotate-z');
		const pauseButton = document.getElementById('button-pause');
		axisXButton.addEventListener('click', (e) => {
			rotationAxis = Axis.X;
		});
		axisYButton.addEventListener('click', (e) => {
			rotationAxis = Axis.Y;
		});
		axisZButton.addEventListener('click', (e) => {
			rotationAxis = Axis.Z;
		});
		pauseButton.addEventListener('click', (e) => {
			doRotate = !doRotate;
		});
	}

	/* Start Application Loop */ {
		const msUntilFrameEnd = (targetFPS, timeBeginMS, timeEndMS) => {
			const TIME_FRAME_SHOULD_LAST = 1000 / targetFPS;
			const TIME_ELAPSED = timeEndMS - timeBeginMS;
			return Math.max(0, TIME_FRAME_SHOULD_LAST - TIME_ELAPSED);
		}
		const update = () => {
			if (doRotate) rotationDegrees[rotationAxis] += rotationSpeedDegreesPerFrame;
		}
		const render = () => {
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			gl.uniform3fv(uRotationDegrees, rotationDegrees);
			gl.drawArrays(gl.TRIANGLES, 0, vertices.count);
		}
		const loop = () => {
			const timeBegin = Date.now();
			update();
			requestAnimationFrame(render);
			const timeEnd = Date.now();
			setTimeout(
				loop,
				msUntilFrameEnd(targetFPS, timeBegin, timeEnd)
			);
		}
		// start loop
		loop();
	}
};
