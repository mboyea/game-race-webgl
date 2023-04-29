'use strict';
const TEXTURE_ATLAS_FILE_PATH = 'assets/racing-texture-atlas.png';
const CAR_FILE_PATH = 'assets/car.obj';
const WHEEL_FILE_PATH = 'assets/wheel.obj';
const MAP_1_FILE_PATH = 'assets/map1.json';

const main = async () => {
	let maxFPS = 20;

	/** @type {HTMLCanvasElement} */ let canvas;
	/** @type {WebGL2RenderingContext} */ let gl;
	/** @type {WebGLProgram} */ let shaderProgram;
	/** @type {WebGLUniformLocation} */ let uProjectionMatrix;
	/** @type {WebGLUniformLocation} */ let uModelViewMatrix;
	/** @type {WebGLUniformLocation} */ let uLightPosition;
	/** @type {WebGLUniformLocation} */ let uAmbientProduct;
	/** @type {WebGLUniformLocation} */ let uDiffuseProduct;
	/** @type {WebGLUniformLocation} */ let uSpecularProduct;
	/** @type {WebGLUniformLocation} */ let uShininess;
	/** @type {WebGLUniformLocation} */ let uNormalMatrix;
	/** @type {WebGLUniformLocation} */ let uTextureAtlas;
	/** @type {GLuint} */ let aPosition;
	/** @type {GLuint} */ let aNormal;
	/** @type {GLuint} */ let aTextureCoordinates;

	let carPrefab = {
		vertexCount: 0,
		wheels: [
			{ x: 0.5, y: 1.48, z: 0.3 },
			{ x: -1, y: 1.48, z: 0.3 },
			{ x: 0.5, y: -1.5, z: 0.3 },
			{ x: -1, y: -1.5, z: 0.3 },
		],
	};
	let wheelPrefab = {
		vertexCount: 0,
	};
	let cars = [
		{
			baseColor: vec4(1.0, 0.0, 0.0, 1.0),
			x: 0,
			y: 0,
			rotation: 0,
			wheelRotation: 0,
		},
		{
			baseColor: vec4(0.0, 0.0, 1.0, 1.0),
			x: 10,
			y: 10,
			rotation: 0,
			wheelRotation: 0,
		},
	];

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
		// get shader variables
		uProjectionMatrix = gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');
		uModelViewMatrix = gl.getUniformLocation(shaderProgram, 'uModelViewMatrix');
		uLightPosition = gl.getUniformLocation(shaderProgram, 'uLightPosition');
		uAmbientProduct = gl.getUniformLocation(shaderProgram, 'uAmbientProduct');
		uDiffuseProduct = gl.getUniformLocation(shaderProgram, 'uDiffuseProduct');
		uSpecularProduct = gl.getUniformLocation(shaderProgram, 'uSpecularProduct');
		uShininess = gl.getUniformLocation(shaderProgram, 'uShininess');
		uNormalMatrix = gl.getUniformLocation(shaderProgram, 'uNormalMatrix');
		uTextureAtlas = gl.getUniformLocation(shaderProgram, 'uTextureAtlas');
		aPosition = gl.getAttribLocation(shaderProgram, 'aPosition');
		aNormal = gl.getAttribLocation(shaderProgram, 'aNormal');
		aTextureCoordinates = gl.getAttribLocation(shaderProgram, 'aTextureCoordinates');
	}

	/* LOAD TEXTURE ATLAS */ {
		// create texture atlas
		const textureAtlas = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, textureAtlas);
		// fill with default texture
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA,
			2, 2, 0,
			gl.RGBA, gl.UNSIGNED_BYTE,
			new Uint8Array([
				255, 0, 255, 255,
				0, 0, 0, 255,
				255, 0, 255, 255,
				0, 0, 0, 255,
			])
		);
		// load image
		const image = new Image();
		image.onload = () => {
			// replace default texture
			gl.bindTexture(gl.TEXTURE_2D, textureAtlas);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		};
		image.src = TEXTURE_ATLAS_FILE_PATH;
		// update texture atlas shader variable
		gl.uniform1i(uTextureAtlas, 0);
	}

	/* LOAD VERTICES */ {
		let vertices = {
			positions: [],
			normals: [],
			textureCoordinates: [],
		};
		const loadWavefront = (text, meshObject) => {
			let vertexPositions = [], vertexTextureCoordinates = [], vertexNormals = [];
			const textArray = (text).split('\n')
			for (let i = 0; i < textArray.length; i++) {
				const textTokens = textArray[i].trim().split(' ');
				switch(textTokens[0]) {
					default:
						break;
					case 'o':
						break;
					case 'v':
						vertexPositions.push([
							Number(textTokens[1]),
							Number(textTokens[2]),
							Number(textTokens[3]),
						]);
						break;
					case 'vt':
						vertexTextureCoordinates.push([
							Number(textTokens[1]),
							Number(textTokens[2]),
						]);
						break;
					case 'vn':
						vertexNormals.push([
							Number(textTokens[1]),
							Number(textTokens[2]),
							Number(textTokens[3]),
						]);
						break;
					case 's':
						break;
					case 'f':
						for (let j = 0; j < textTokens.length; j++) {
							const numbers = textTokens[j].split('/').map(n => Number(n));
							vertices.positions.push(vertexPositions[numbers[0]]);
							vertices.textureCoordinates.push(vertexTextureCoordinates[numbers[1]]);
							vertices.normals.push(vertexNormals[numbers[2]]);
							meshObject.vertexCount++;
						}
						break;
				}
			}
		};
		/* LOAD MODELS */ {
			const carFetchResponse = fetch(CAR_FILE_PATH)
			.catch(error => console.error(`Couldn't download car object file: ${error.message}`));
			const wheelFetchResponse = fetch(WHEEL_FILE_PATH)
			.catch(error => console.error(`Couldn't download car object file: ${error.message}`));
			const carTextResponse = (await carFetchResponse).text()
			.catch(error => console.error(`Couldn't get car file text: ${error.message}`));
			const wheelTextResponse = (await wheelFetchResponse).text()
			.catch(error => console.error(`Couldn't get wheel file text: ${error.message}`));
			// generate car mesh
			loadWavefront(await carTextResponse, carPrefab);
			// generate wheel mesh
			loadWavefront(await wheelTextResponse, wheelPrefab);
		}
		/* LOAD MAP */ {
			// TODO6: generate map mesh from json file
		}
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
		// TODO5: add click and drag on canvas to rotate perspective
		document.getElementById('fps-slider').addEventListener('input', (e) => {
			maxFPS = e.target.value;
		});
	}

	/* START APPLICATION LOOP */ {
		/**
		 * get the number of ms to wait for this frame to achieve targetFPS
		 * @param {number} targetFPS 
		 * @param {number} timePassedThisFrameMS 
		 * @returns 
		 */
		const msUntilFrameEnd = (targetFPS, timePassedThisFrameMS) => {
			const TIME_FRAME_SHOULD_LAST = 1000 / targetFPS;
			return Math.max(0, TIME_FRAME_SHOULD_LAST - timePassedThisFrameMS);
		};
		let frame = {
			beginTimeMS: Date.now(),
			endTimeMS: Date.now(),
			deltaTimeMS: 0,
			deltaTimeS: 0,
		};
		const update = () => {
			// TODO: update game
			// !
		};
		const render = () => {
			// TODO: render game
			// !
			// TODO5: instance 2 cars at different places
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
