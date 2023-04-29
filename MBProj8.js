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
		// TODO6: generate map mesh from json file
	}

	/* LOAD CARS */ {
		// TODO3: figure out how to store multiple objects data (map & cars)
		// TODO3: generate car mesh from obj file
		// TODO5: instance 4 cars at different places
		const loadTri = (vertices, a, b, c) => {};
		const loadQuad = (vertices, a, b, c, d) => {};
		const loadObj = (filePath) => {};
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
