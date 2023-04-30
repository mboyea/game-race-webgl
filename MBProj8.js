'use strict';
const TEXTURE_ATLAS_FILE_PATH = 'assets/racing-texture-atlas.png';
const CAR_FILE_PATH = 'assets/car.obj';
const WHEEL_FILE_PATH = 'assets/wheel.obj';
const MAP_1_FILE_PATH = 'assets/map1.json';

const main = async () => {
	let fpsTarget = 24;

	/** @type {HTMLCanvasElement} */ let canvas;
	/** @type {WebGL2RenderingContext} */ let gl;
	/** @type {WebGLProgram} */ let shaderProgram;
	/** @type {WebGLBuffer} */ let positionBuffer;
	/** @type {WebGLBuffer} */ let normalBuffer;
	/** @type {WebGLBuffer} */ let textureCoordinateBuffer;
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

	let modelViewMatrix, normalMatrix;
	let camera = {
		position: vec3(0, 0, 10),
		lookTarget: vec3(0, 0, 0),
		upDirection: vec3(0, 1, 0),
	};
	let light = {
		position: vec4(6, 0, 10, 0),
		ambient: vec4(0.2, 0.2, 0.2, 1),
		diffuse: vec4(1, 1, 1, 1),
		specular: vec4(1, 1, 1, 1),
	};
	let material = {
		ambient: vec4(1, 1, 1, 1),
		diffuse: vec4(1, 1, 1, 1),
		specular: vec4(1, 1, 1, 1),
		shininess: 20,
	};
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
			baseColor: vec4(1, 0, 0, 1),
			position: vec3(0, 0, 0),
			rotation: 0,
			wheelRotation: 0,
		},
		{
			baseColor: vec4(0, 0, 1, 1),
			position: vec3(10, 0, 0),
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
							// expects only triangular faces with normals and texture coordinates included
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
		// create gpu buffers, fill them with vertex data
		const simpleFlatten = (arr) => {
			let result = new Float32Array(arr.length);
			for (let i = 0; i < arr.length; i++) result[i] = arr[i];
			return result;
		};
		positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, simpleFlatten(vertices.positions), gl.STATIC_DRAW);
		gl.vertexAttribPointer(aPosition, 4, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(aPosition);
		normalBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, simpleFlatten(vertices.normals), gl.STATIC_DRAW);
		gl.vertexAttribPointer(aNormal, 4, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(aNormal);
		textureCoordinateBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordinateBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, simpleFlatten(vertices.textureCoordinates), gl.STATIC_DRAW);
    gl.vertexAttribPointer(aTextureCoordinates, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aTextureCoordinates);
	}

	/* INITIALIZE CAMERA & MATERIAL & LIGHT PROPERTIES */ {
		// create projection matrix
		const projectionMatrix = ortho(-10, 10, -10, 10, -10, 10);
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));
		// calculate ambient, diffuse, specular products between light & material
		const ambientProduct = mult(light.ambient, material.ambient);
		const diffuseProduct = mult(light.diffuse, material.diffuse);
		const specularProduct = mult(light.specular, material.specular);
    gl.uniform4fv(uAmbientProduct, ambientProduct);
    gl.uniform4fv(uDiffuseProduct, diffuseProduct);
    gl.uniform4fv(uSpecularProduct, specularProduct);
		// define material shininess
    gl.uniform1f(uShininess, material.shininess);
		// define light position
		gl.uniform4fv(uLightPosition, light.position);
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
			fpsTarget = e.target.value;
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
			fps: fpsTarget,
		};
		const update = () => {
			// TODO: update game
			// !
		};
		const render = () => {
			// TODO: render game
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			cars.forEach((car) => {
			});
			// trigger loop
			setTimeout(loop, msUntilFrameEnd(fpsTarget, Date.now() - frame.beginTimeMS));
		};
		const loop = () => {
			frame.endTimeMS = Date.now();
			frame.deltaTimeMS = frame.endTimeMS - frame.beginTimeMS;
			frame.deltaTimeS = frame.deltaTimeMS / 1000;
			frame.fps = 1000 / frame.deltaTimeMS;
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
