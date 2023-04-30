'use strict';
const TEXTURE_ATLAS_FILE_PATH = 'assets/racing-texture-atlas.png';
const CAR_FILE_PATH = 'assets/car.obj';
const WHEEL_FILE_PATH = 'assets/wheel.obj';
const MAP_1_FILE_PATH = 'assets/map1.json';

const toRadians = (degrees) => {
	return degrees * (Math.PI / 180);
}

const main = async () => {
	/** @type {HTMLCanvasElement} */ let canvas;
	/** @type {WebGL2RenderingContext} */ let gl;
	/** @type {WebGLProgram} */ let shaderProgram;
	/** @type {WebGLBuffer} */ let positionBuffer;
	/** @type {WebGLBuffer} */ let normalBuffer;
	/** @type {WebGLBuffer} */ let textureCoordinateBuffer;
	/** @type {WebGLUniformLocation} */ let uProjectionMatrix;
	/** @type {WebGLUniformLocation} */ let uModelViewMatrix;
	/** @type {WebGLUniformLocation} */ let uNormalMatrix;
	/** @type {WebGLUniformLocation} */ let uLightPosition;
	/** @type {WebGLUniformLocation} */ let uAmbientProduct;
	/** @type {WebGLUniformLocation} */ let uDiffuseProduct;
	/** @type {WebGLUniformLocation} */ let uSpecularProduct;
	/** @type {WebGLUniformLocation} */ let uShininess;
	/** @type {WebGLUniformLocation} */ let uTextureAtlas;
	/** @type {GLuint} */ let aPosition;
	/** @type {GLuint} */ let aNormal;
	/** @type {GLuint} */ let aTextureCoordinates;

	let viewMatrix, viewNormalMatrix, modelViewMatrix;
	let fpsTarget = 24;
	let camera = {
		width: 20,
		height: 20,
		rotationX: Math.PI * -0.5,
		rotationY: Math.PI * 0.3,
		clipDistance: 20,
		targetDistance: 10,
		targetPosition: vec3(0, 0, 0),
		lookTarget: vec3(0, 0, 0),
		upDirection: vec3(0, 0, 1),
		doRotateWithMouse: false,
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
		shininess: 40,
	};
	let carPrefab = {
		vertexCount: 0,
		wheels: [
			{ x: 0.6, y: 1.48, z: 0.3, doRotate: true },
			{ x: -1.1, y: 1.48, z: 0.3, doRotate: true },
			{ x: 0.6, y: -1.5, z: 0.3, doRotate: false },
			{ x: -1.1, y: -1.5, z: 0.3, doRotate: false },
		],
	};
	let wheelPrefab = {
		vertexCount: 0,
		baseColor: vec4(0.1, 0.1, 0.1, 1),
	};
	let cars = [
		{
			baseColor: vec4(1, 0, 0.15, 1),
			position: vec3(0, 0, 0),
			rotation: -10,
			wheelAngle: 0,
			wheelRotation: 10,
		},
		{
			baseColor: vec4(0, 0.3, 1, 1),
			position: vec3(4, 0, 0),
			rotation: -30,
			wheelAngle: -12,
			wheelRotation: 0,
		},
	];
	let input = {
		horizontal: 0,
		vertical: 0,
	}

	/* INITIALIZE WEBGL */ {
		canvas = document.getElementById('display');
		gl = canvas.getContext('webgl2');
		if (!gl) {
			console.error('Unable to initialize WebGL2.');
			return;
		}
		// configure webgl
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(1, 1, 1, 1);
		gl.enable(gl.DEPTH_TEST);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
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
							1,
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
							1,
						]);
						break;
					case 's':
						break;
					case 'f':
						for (let j = 1; j < textTokens.length; j++) {
							// ! expects only tri faces that include valid positions, texture coordinates, and normals
							const indices = textTokens[j].split('/').map(n => Number(n));
							vertexPositions[indices[0]-1].forEach(n => vertices.positions.push(n));
							vertexTextureCoordinates[indices[1]-1].forEach(n => vertices.textureCoordinates.push(n));
							vertexNormals[indices[2]-1].forEach(n => vertices.normals.push(n));
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
		// calculate camera projection matrix
		const projectionMatrix = ortho(
			-(camera.width / 2),
			camera.width / 2,
			-(camera.height / 2),
			camera.height / 2,
			0,
			camera.clipDistance
		);
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));
		// define material shininess
    gl.uniform1f(uShininess, material.shininess);
		// define light position
		gl.uniform4fv(uLightPosition, light.position);
		// calculate ambient, diffuse, specular products between light & material
		const ambientProduct = mult(light.ambient, material.ambient);
		const diffuseProduct = mult(light.diffuse, material.diffuse);
		const specularProduct = mult(light.specular, material.specular);
    gl.uniform4fv(uAmbientProduct, ambientProduct);
    gl.uniform4fv(uDiffuseProduct, diffuseProduct);
    gl.uniform4fv(uSpecularProduct, specularProduct);
	}

	/* INITIALIZE INPUT */ {
		const fpsSlider = document.getElementById('fps-slider');
		fpsSlider.value = fpsTarget;
		fpsSlider.addEventListener('input', (e) => {
			fpsTarget = e.target.value;
		});
		canvas.addEventListener('wheel', (e) => {
			e.preventDefault();
			const ZOOM_SPEED = 0.05;
			camera.clipDistance = Math.max(8, camera.clipDistance + e.deltaY * ZOOM_SPEED);
			camera.width = camera.clipDistance;
			camera.height = camera.clipDistance;
			camera.targetDistance = camera.clipDistance / 2;
			const projectionMatrix = ortho(
				-(camera.width / 2),
				camera.width / 2,
				-(camera.height / 2),
				camera.height / 2,
				0,
				camera.clipDistance
			);
			gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));
		});
		canvas.addEventListener('mousedown', (e) => {
			e.preventDefault();
			camera.doRotateWithMouse = true;
		});
		document.addEventListener('mouseup', (e) => {
			camera.doRotateWithMouse = false;
		});
		document.addEventListener('mousemove', (e) => {
			const CAMERA_ROTATION_SPEED = 0.01;
			if (camera.doRotateWithMouse) {
				camera.rotationX = (camera.rotationX - e.movementX * CAMERA_ROTATION_SPEED) % (2 * Math.PI);
				camera.rotationY = Math.max(
					0.01,
					Math.min(
						Math.PI,
						(camera.rotationY - e.movementY * CAMERA_ROTATION_SPEED) % (2 * Math.PI)
					),
				);
			}
		});
		document.addEventListener('keydown', (e) => {
			switch(e.key) {
				case('ArrowLeft'):
					e.preventDefault();
					input.horizontal = Math.max(-1, input.horizontal - 1);
					break;
				case('ArrowRight'):
					e.preventDefault();
					input.horizontal = Math.min(1, input.horizontal + 1);
					break;
				case('ArrowUp'):
					e.preventDefault();
					input.vertical = Math.min(1, input.vertical + 1);
					break;
				case('ArrowDown'):
					e.preventDefault();
					input.vertical = Math.max(-1, input.vertical - 1);
					break;
			}
		});
		document.addEventListener('keyup', (e) => {
			switch(e.key) {
				case('ArrowLeft'):
					input.horizontal = Math.min(1, input.horizontal + 1);
					break;
				case('ArrowRight'):
					input.horizontal = Math.max(-1, input.horizontal - 1);
					break;
				case('ArrowUp'):
					input.vertical = Math.max(-1, input.vertical - 1);
					break;
				case('ArrowDown'):
					input.vertical = Math.min(1, input.vertical + 1);
					break;
			}
		});
	}

	/* START APPLICATION LOOP */ {
		/**
		 * get the number of ms to wait for this frame to achieve targetFPS
		 * @param {number} targetFPS 
		 * @param {number} timePassedThisFrameMS 
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
			const PLAYER_MOVE_SPEED = 12;
			const PLAYER_ROTATION_SPEED = 50;
			cars[0].wheelAngle = input.horizontal * 10;
			if (input.vertical != 0) {
				cars[0].position = vec3(
					cars[0].position[0] + input.vertical * Math.sin(toRadians(cars[0].rotation)) * PLAYER_MOVE_SPEED * frame.deltaTimeS,
					cars[0].position[1] + input.vertical * Math.cos(toRadians(cars[0].rotation)) * PLAYER_MOVE_SPEED * frame.deltaTimeS,
					cars[0].position[2],
				);
				cars[0].rotation += input.horizontal * input.vertical * PLAYER_ROTATION_SPEED * frame.deltaTimeS;
				cars[0].wheelRotation += input.vertical * PLAYER_MOVE_SPEED * 50 * frame.deltaTimeS;
			}
			camera.targetPosition = cars[0].position;
			camera.lookTarget = camera.targetPosition;
		};
		const render = () => {
			// clear screen
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			// calculate camera view matrix
			let cameraPosition = vec3(
				camera.targetPosition[0] + camera.targetDistance * Math.sin(camera.rotationY) * Math.cos(camera.rotationX),
				camera.targetPosition[1] + camera.targetDistance * Math.sin(camera.rotationY) * Math.sin(camera.rotationX),
				camera.targetPosition[2] + camera.targetDistance * Math.cos(camera.rotationY),
			);
			viewMatrix = lookAt(
				cameraPosition,
				camera.lookTarget,
				camera.upDirection,
			);
			// render each car
			cars.forEach((car) => {
				// calculate car material
				let diffuseProduct = mult(light.diffuse, mult(material.diffuse, car.baseColor));
				gl.uniform4fv(uDiffuseProduct, diffuseProduct);
				// calculate car model matrix
				let modelMatrix = translate(car.position[0], car.position[1], car.position[2]);
				modelMatrix = mult(modelMatrix, rotate(car.rotation, vec3(0, 0, 1)));
				// calculate car model view matrix
				modelViewMatrix = mult(viewMatrix, modelMatrix);
				gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));
				viewNormalMatrix = normalMatrix(modelViewMatrix, true);
				gl.uniformMatrix3fv(uNormalMatrix, false, flatten(viewNormalMatrix));
				// render car
				gl.drawArrays(gl.TRIANGLES, 0, carPrefab.vertexCount);
				// calculate wheel material
				diffuseProduct = mult(light.diffuse, mult(material.diffuse, wheelPrefab.baseColor));
				gl.uniform4fv(uDiffuseProduct, diffuseProduct);
				carPrefab.wheels.forEach((wheel) => {
					// calculate wheel model view matrix
					let wheelModelMatrix = mult(modelMatrix, translate(wheel.x, wheel.y, wheel.z));
					if (wheel.doRotate) wheelModelMatrix = mult(wheelModelMatrix, rotate(car.wheelAngle, vec3(0, 0, 1)));
					wheelModelMatrix = mult(wheelModelMatrix, rotate(car.wheelRotation, vec3(1, 0, 0)));
					modelViewMatrix = mult(viewMatrix, wheelModelMatrix);
					gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));
					viewNormalMatrix = normalMatrix(modelViewMatrix, true);
					gl.uniformMatrix3fv(uNormalMatrix, false, flatten(viewNormalMatrix));
					// render wheel
					gl.drawArrays(gl.TRIANGLES, carPrefab.vertexCount, wheelPrefab.vertexCount);
				});
			});
			// TODO7: render map
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
