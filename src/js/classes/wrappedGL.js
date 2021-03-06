
class WrappedGL {
	static create(canvas, options) {
		var gl = null;

		try {
			gl = canvas.getContext("webgl", options) || canvas.getContext("experimental-webgl", options);
		} catch (e) {
			// no webgl support
			return null;
		}

		if (gl === null) return null;

		return new WrappedGL(gl);
	}

	constructor(gl) {
		this.gl = gl;
		this.gl.clearColor(1, 1, 1, 0);
		// this.gl.clear(gl.COLOR_BUFFER_BIT);

		for (var i = 0; i < CONSTANT_NAMES.length; i += 1) {
			this[CONSTANT_NAMES[i]] = gl[CONSTANT_NAMES[i]];
		};
		// parameters that aren"t default
		this.changedParameters = {};

		// each parameter is an object like
		/*
		{
			defaults: [values],
			setter: function(called with this set to gl)

			// undefined flag means not used
			usedInDraw: whether this state matters for drawing
			usedInClear: whether this state matters for clearing
			usedInRead: wheter this state matters for reading
		}

		// the number of parameters in each defaults array corresponds to the arity of the corresponding setter
		*/

		this.parameters = {
			framebuffer: {
				defaults: [null],
				setter: framebuffer => gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer),
				usedInDraw: true,
				usedInClear: true,
				usedInRead: true
			},
			program: {
				defaults: [ {program: null} ],
				setter: wrappedProgram => gl.useProgram(wrappedProgram.program),
				usedInDraw: true
			},
			viewport: {
				defaults: [0, 0, 0, 0],
				setter: gl.viewport,
				usedInDraw: true,
				usedInClear: true
			},
			indexBuffer: {
				defaults: [null],
				setter: buffer => gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer),
				usedInDraw: true
			},
			depthTest: {
				defaults: [false],
				enabled: enabled => enabled ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST),
				usedInDraw: true
			},
			depthFunc: {
				defaults: [gl.LESS],
				setter: gl.depthFunc,
				usedInDraw: true
			},
			cullFace: {
				defaults: [false],
				setter: enabled => enabled ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE),
				usedInDraw: true
			},
			frontFace: {
				defaults: [gl.CCW],
				setter: gl.frontFace
			},
			blend: {
				defaults: [false],
				setter: enabled => enabled ? gl.enable(gl.BLEND) : gl.disable(gl.BLEND),
				usedInDraw: true
			},
			blendEquation: {
				defaults: [gl.FUNC_ADD, gl.FUNC_ADD],
				setter: gl.blendEquationSeparate,
				usedInDraw: true
			},
			blendFunc: {
				defaults: [gl.ONE, gl.ZERO, gl.ONE, gl.ZERO],
				setter: gl.blendFuncSeparate,
				usedInDraw: true
			},
			polygonOffsetFill: {
				defaults: [false],
				setter: enabled => enabled ? gl.enable(gl.POLYGON_OFFSET_FILL) : gl.disable(gl.POLYGON_OFFSET_FILL),
				usedInDraw: true
			},
			polygonOffset: {
				defaults: [0, 0],
				setter: gl.polygonOffset,
				usedInDraw: true
			},
			scissorTest: {
				defaults: [false],
				setter: enabled => enabled ? gl.enable(gl.SCISSOR_TEST) : gl.disable(gl.SCISSOR_TEST),
				usedInDraw: true,
				usedInClear: true
			},
			scissor: {
				defaults: [0, 0, 0, 0],
				setter: gl.scissor,
				usedInDraw: true,
				usedInClear: true
			},
			colorMask: {
				defaults: [true, true, true, true],
				setter: gl.colorMask,
				usedInDraw: true,
				usedInClear: true
			},
			depthMask: {
				defaults: [true],
				setter: gl.depthMask,
				usedInDraw: true,
				usedInClear: true
			},
			clearColor: {
				defaults: [1, 1, 1, 0],
				setter: gl.clearColor,
				usedInClear: true
			},
			clearDepth: {
				defaults: [1],
				setter: gl.clearDepth,
				usedInClear: true
			}
		};

		var maxVertexAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
		for (var i = 0; i < maxVertexAttributes; ++i) {
			//we need to capture the index in a closure
			this.parameters["attributeArray" + i.toString()] = {
				defaults: [null, 0, null, false, 0, 0],
				setter: (function() {
					var index = i;

					return (buffer, size, type, normalized, stride, offset) => {
						if (buffer !== null) {
							gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
							gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
							gl.enableVertexAttribArray(index); //TODO: cache this
						}
					}
				}()),
				usedInDraw: true
			};
		}

		var maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
		for (var i = 0; i < maxTextures; ++i) {
			this.parameters["texture" + i.toString()] = {
				defaults: [gl.TEXTURE_2D, null],
				setter: (function() {
					//we need to capture the unit in a closure
					var unit = i;
					return (target, texture) => {
						gl.activeTexture(gl.TEXTURE0 + unit);
						gl.bindTexture(target, texture);
					}
				}()),
				usedInDraw: true
			};
		}

		this.uniformSetters = {
			"1i": gl.uniform1i,
			"2i": gl.uniform2i,
			"3i": gl.uniform3i,
			"4i": gl.uniform4i,
			"1f": gl.uniform1f,
			"2f": gl.uniform2f,
			"3f": gl.uniform3f,
			"4f": gl.uniform4f,
			"1fv": gl.uniform1fv,
			"2fv": gl.uniform2fv,
			"3fv": gl.uniform3fv,
			"4fv": gl.uniform4fv,
			"matrix2fv": gl.uniformMatrix2fv,
			"matrix3fv": gl.uniformMatrix3fv,
			"matrix4fv": gl.uniformMatrix4fv
		};
		// the texure unit we use for modifying textures
		this.defaultTextureUnit = 0;
	}

	getSupportedExtensions() {
		return this.gl.getSupportedExtensions();
	}

	getExtension(name) {
		var gl = this.gl;

		// for certain extensions, we need to expose additional, wrapped rendering compatible,
		// methods directly on WrappedGL and DrawState
		if (name === "ANGLE_instanced_arrays") {
			var instancedExt = gl.getExtension("ANGLE_instanced_arrays");

			if (instancedExt !== null) {
				this.instancedExt = instancedExt;

				var maxVertexAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
				for (var i = 0; i < maxVertexAttributes; ++i) {
					this.parameters["attributeDivisor" + i.toString()] = {
						defaults: [0],
						setter: (function() {
							var index = i;
							return divisor => instancedExt.vertexAttribDivisorANGLE(index, divisor);
						}()),
						usedInDraw: true
					};
				}

				//override vertexAttribPointer
				DrawState.vertexAttribPointer = function(buffer, index, size, type, normalized, stride, offset) {
					this.setParameter("attributeArray" + index.toString(), [buffer, size, type, normalized, stride, offset]);
					if (this.changedParameters.hasOwnProperty("attributeDivisor" + index.toString())) {
						//we need to have divisor information for any attribute location that has a bound buffer
						this.setParameter("attributeDivisor" + index.toString(), [0]);
					}
					return this;
				};

				DrawState.vertexAttribDivisorANGLE = function(index, divisor) {
					this.setParameter("attributeDivisor" + index.toString(), [divisor]);
					return this;
				};

				this.drawArraysInstancedANGLE = function(drawState, mode, first, count, primcount) {
					this.resolveDrawState(drawState);
					this.instancedExt.drawArraysInstancedANGLE(mode, first, count, primcount);
				};

				this.drawElementsInstancedANGLE = function(drawState, mode, count, type, indices, primcount) {
					this.resolveDrawState(drawState);
					this.instancedExt.drawElementsInstancedANGLE(mode, count, type, indices, primcount);
				};

				return {};
			} else {
				return null;
			}

		} else { //all others, we can just return as is (we can treat them as simple enums)
			return gl.getExtension(name);
		}
	}

	getParameter(parameter) {
		return this.gl.getParameter(parameter);
	}

	canRenderToTexture(type) {
		var gl = this.gl;
		var framebuffer = this.createFramebuffer(); 
		var texture = this.buildTexture(gl.RGBA, type, 1, 1, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.NEAREST);
		this.framebufferTexture2D(framebuffer, gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

		var result = this.checkFramebufferStatus(framebuffer) === gl.FRAMEBUFFER_COMPLETE;

		this.deleteFramebuffer(framebuffer);
		this.deleteTexture(texture);

		return result;
	}

	checkFramebufferStatus(framebuffer) {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
		this.changedParameters["framebuffer"] = framebuffer;

		return this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
	}

	getShaderPrecisionFormat(shaderType, precisionType) {
		return this.gl.getShaderPrecisionFormat(shaderType, precisionType);
	}

	hasHalfFloatTextureSupport() {
		var ext = this.getExtension("OES_texture_half_float");
		if (ext === null) return false;
		if (this.getExtension("OES_texture_half_float_linear") === null) return false;
		if (!this.canRenderToTexture(ext.HALF_FLOAT_OES)) return false;

		return true;
	}

	hasFloatTextureSupport() {
		if (this.getExtension("OES_texture_float") === null || this.getExtension("OES_texture_float_linear") === null) return false;
		if (!this.canRenderToTexture(this.FLOAT)) return false;

		return true;
	}

	resolveState(state, flag) {
		var gl = this.gl;
		//first let"s revert all states to default that were set but now aren"t set
		for (var parameterName in this.changedParameters) {
			if (this.changedParameters.hasOwnProperty(parameterName)) {
				if (!state.changedParameters.hasOwnProperty(parameterName)) { //if this is not set in the incoming draw state then we need to go back to default
					if (this.parameters[parameterName][flag]) {
						this.parameters[parameterName].setter.apply(this.gl, this.parameters[parameterName].defaults);

						delete this.changedParameters[parameterName];
					}
				}
			}
		}
		//now we set all of the new incoming states
		for (var parameterName in state.changedParameters) {
			if (state.changedParameters.hasOwnProperty(parameterName)) {
				if (!this.changedParameters.hasOwnProperty(parameterName) || //if this state is not currently set
					!arraysEqual(this.changedParameters[parameterName], state.changedParameters[parameterName]) //or if it"s changed
					) {
					this.changedParameters[parameterName] = state.changedParameters[parameterName];
					this.parameters[parameterName].setter.apply(this.gl, this.changedParameters[parameterName]);
				}
			}
		}
	}

	resolveDrawState(drawState) {
		var gl = this.gl;
		this.resolveState(drawState, "usedInDraw");
		//resolve uniform values
		//we don"t diff uniform values, it"s just not worth it
		var program = drawState.changedParameters.program[0]; //we assume a draw state has a program
		for (var uniformName in drawState.uniforms) {
			if (drawState.uniforms.hasOwnProperty(uniformName)) {
				//this array creation is annoying....
				var args = [program.uniformLocations[uniformName]].concat(drawState.uniforms[uniformName].value);
				this.uniformSetters[drawState.uniforms[uniformName].type].apply(gl, args);
			}
		}
	}

	drawArrays(drawState, mode, first, count) {
		this.resolveDrawState(drawState);
		this.gl.drawArrays(mode, first, count);
	}

	drawElements(drawState, mode, count, type, offset) {
		this.resolveDrawState(drawState);
		this.gl.drawElements(mode, count, type, offset);
	}

	resolveClearState(clearState) {
		this.resolveState(clearState, "usedInClear");
	}

	clear(clearState, bit) {
		this.resolveClearState(clearState);
		this.gl.clear(bit);
	}

	resolveReadState(readState) {
		this.resolveState(readState, "usedInRead");
	}

	readPixels(readState, x, y, width, height, format, type, pixels) {
		this.resolveReadState(readState);
		this.gl.readPixels(x, y, width, height, format, type, pixels);
	}

	finish() {
		this.gl.finish();
		return this;
	}

	flush() {
		this.gl.flush();
		return this;
	}

	getError() {
		return this.gl.getError();
	}

	createFramebuffer() {
		return this.gl.createFramebuffer();
	}

	framebufferTexture2D(framebuffer, target, attachment, textarget, texture, level) {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
		this.changedParameters["framebuffer"] = framebuffer;
		this.gl.framebufferTexture2D(target, attachment, textarget, texture, level);
		return this;
	}

	framebufferRenderbuffer(framebuffer, target, attachment, renderbuffertarget, renderbuffer) {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
		this.changedParameters["framebuffer"] = framebuffer;
		this.gl.framebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer);
	}

	drawBuffers(framebuffer, buffers) {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
		this.changedParameters["framebuffer"] = framebuffer;
		this.drawExt.drawBuffersWEBGL(buffers);
	}

	createTexture() {
		return this.gl.createTexture();
	}

	bindTextureForEditing(target, texture) {
		this.gl.activeTexture(this.gl.TEXTURE0 + this.defaultTextureUnit);
		this.gl.bindTexture(target, texture);
		this.changedParameters["texture" + this.defaultTextureUnit.toString()] = [target, texture];
	}

	//this function is overloaded, it can be either
	//(target, texture, level, internalformat, width, height, border, format, type, pixels)
	//(target, texture, level, internalformat, format, type, object)
	texImage2D(target, texture) {
		var args = Array.prototype.slice.call(arguments, 2);
		args.unshift(target); //add target to for texImage2D arguments list

		this.bindTextureForEditing(target, texture);
		this.gl.texImage2D.apply(this.gl, args);

		return this;
	}

	//this function is overloaded, it can be either
	//(target, texture, level, xoffset, yoffset, width, height, format, type, pixels)
	//(target, texture, level, xoffset, yoffset, format, type, object)
	texSubImage2D(target, texture) {
		var args = Array.prototype.slice.call(arguments, 2);
		args.unshift(target); //add target to for texImage2D arguments list
		this.bindTextureForEditing(target, texture);
		this.gl.texSubImage2D.apply(this.gl, args);
		return this;
	}

	texParameteri(target, texture, pname, param) {
		this.bindTextureForEditing(target, texture);
		this.gl.texParameteri(target, pname, param);
		return this;
	}

	texParameterf(target, texture, pname, param) {
		this.bindTextureForEditing(target, texture);
		this.gl.texParameterf(target, pname, param);
		return this;
	}

	pixelStorei(target, texture, pname, param) {
		this.bindTextureForEditing(target, texture);
		this.gl.pixelStorei(pname, param);
		return this;
	}

	setTextureFiltering(target, texture, wrapS, wrapT, minFilter, magFilter) {
		var gl = this.gl;
		this.bindTextureForEditing(target, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
		return this;
	}

	generateMipmap(target, texture) {
		this.bindTextureForEditing(target, texture);
		this.gl.generateMipmap(target);
		return this;
	}

	buildTexture(format, type, width, height, data, wrapS, wrapT, minFilter, magFilter) {
		var texture = this.createTexture();
		this.rebuildTexture(texture, format, type, width, height, data, wrapS, wrapT, minFilter, magFilter);
		return texture;
	}

	rebuildTexture(texture, format, type, width, height, data, wrapS, wrapT, minFilter, magFilter) {
		this.texImage2D(this.TEXTURE_2D, texture, 0, format, width, height, 0, format, type, data)
			.setTextureFiltering(this.TEXTURE_2D, texture, wrapS, wrapT, minFilter, magFilter);
		return this;
	}

	createRenderbuffer() {
		return this.gl.createRenderbuffer();
	}

	renderbufferStorage(renderbuffer, target, internalformat, width, height) {
		this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, renderbuffer);
		this.gl.renderbufferStorage(target, internalformat, width, height);
		return this;
	}

	createBuffer() {
		return this.gl.createBuffer();
	}

	bufferData(buffer, target, data, usage) {
		var gl = this.gl;

		if (target === gl.ARRAY_BUFFER) {
			//we don"t really care about the vertex buffer binding state...
		} else if (target === gl.ELEMENT_ARRAY_BUFFER) {
			this.changedParameters.indexBuffer = [buffer];
		}

		gl.bindBuffer(target, buffer);
		gl.bufferData(target, data, usage);
	}

	buildBuffer(target, data, usage) {
		var buffer = this.createBuffer();
		this.bufferData(buffer, target, data, usage);
		return buffer;
	}

	bufferSubData(buffer, target, offset, data) {
		var gl = this.gl;

		if (target === gl.ARRAY_BUFFER) {
			//we don"t really care about the vertex buffer binding state...
		} else if (target === gl.ELEMENT_ARRAY_BUFFER) {
			this.changedParameters.indexBuffer = [buffer];
		}

		gl.bindBuffer(target, buffer);
		gl.bufferSubData(target, offset, data);
	}

	createProgram(vertexShaderSource, fragmentShaderSource, attributeLocations) {
		return new WrappedProgram(this, vertexShaderSource, fragmentShaderSource, attributeLocations); 
	}

	createDrawState() {
		return new DrawState(this);
	}

	createClearState() {
		return new ClearState(this);
	}

	createReadState() {
		return new ReadState(this);
	}

	deleteBuffer(buffer) {
		this.gl.deleteBuffer(buffer);
	}

	deleteFramebuffer(buffer) {
		this.gl.deleteFramebuffer(buffer);
	}

	deleteTexture(texture) {
		this.gl.deleteTexture(texture);
	}
}
