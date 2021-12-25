
const Shaders = {
	Fragment: {
		advect: `@import "../shaders/advect.frag"`,
		splat: `@import "../shaders/splat.frag"`,
		divergence: `@import "../shaders/divergence.frag"`,
		jacobi: `@import "../shaders/jacobi.frag"`,
		subtract: `@import "../shaders/subtract.frag"`,
		resize: `@import "../shaders/resize.frag"`,
		project: `@import "../shaders/project.frag"`,
		brush: `@import "../shaders/brush.frag"`,
		painting: `@import "../shaders/painting.frag"`,
		panel: `@import "../shaders/panel.frag"`,
		output: `@import "../shaders/output.frag"`,
		shadow: `@import "../shaders/shadow.frag"`,
		picker: `@import "../shaders/picker.frag"`,
		setbristles: `@import "../shaders/setbristles.frag"`,
		updatevelocity: `@import "../shaders/updatevelocity.frag"`,
		planeconstraint: `@import "../shaders/planeconstraint.frag"`,
		bendingconstraint: `@import "../shaders/bendingconstraint.frag"`,
		distanceconstraint: `@import "../shaders/distanceconstraint.frag"`,
	},
	Vertex: {
		splat: `@import "../shaders/splat.vert"`,
		brush: `@import "../shaders/brush.vert"`,
		picker: `@import "../shaders/picker.vert"`,
		painting: `@import "../shaders/painting.vert"`,
		fullscreen: `@import "../shaders/fullscreen.vert"`,
	}
};

let QUALITIES = [
		{ name: "Low", resolutionScale: 1.0 },
		{ name: "Medium", resolutionScale: 1.5 },
		{ name: "High", resolutionScale: 2.0 }
	],
	InteractionMode = {
		NONE: 0,
		PAINTING: 1,
	},
	INITIAL_QUALITY = 1,
	INITIAL_WIDTH = 600,
	INITIAL_HEIGHT = 400,
	MIN_PAINTING_WIDTH = 300,
	MAX_PAINTING_WIDTH = 4096, //this is further constrained by the maximum texture size
	RESIZING_RADIUS = 20,
	RESIZING_FEATHER_SIZE = 8, //in pixels 
	//rendering parameters
	NORMAL_SCALE = 7.0,
	ROUGHNESS = 0.075,
	F0 = 0.05,
	SPECULAR_SCALE = 0.65,
	DIFFUSE_SCALE = 0.15,
	LIGHT_DIRECTION = [0, 1, 1],
	HISTORY_SIZE = 4; //number of snapshots we store - this should be number of reversible actions + 1

// Brush parameters
let BRUSH_SCALE = 20,
	COLOR_HSVA = [.75, 1, 1, 0.8],
	N_PREVIOUS_SPEEDS = 15, // how many previous speeds we store
	//for thin brush (fewest bristles)
	THIN_MIN_ALPHA = 0.002,
	THIN_MAX_ALPHA = 0.08,
	//for thick brush (most bristles)
	THICK_MIN_ALPHA = 0.002,
	THICK_MAX_ALPHA = 0.025,
	
	MAX_BRISTLE_COUNT = 100,
	MIN_BRISTLE_COUNT = 10,
	MIN_BRUSH_SCALE = 5,
	MAX_BRUSH_SCALE = 75,
	BRUSH_HEIGHT = 2.0, //how high the brush is over the canvas - this is scaled with the brushScale
	Z_THRESHOLD = 0.13333, //this is scaled with the brushScale
	//splatting parameters
	SPLAT_VELOCITY_SCALE = 0.14,
	SPLAT_RADIUS = 0.05,
	SPLATS_PER_SEGMENT = 8,
	VERTICES_PER_BRISTLE = 10,
	BRISTLE_LENGTH = 4.5, // relative to a scale of 1
	BRISTLE_JITTER = 0.5,
	ITERATIONS = 20,
	GRAVITY = 30.0,
	BRUSH_DAMPING = 0.15,
	STIFFNESS_VARIATION = 0.3;

// Simulator variables
let PRESSURE_JACOBI_ITERATIONS = 2,
	FRAMES_TO_SIMULATE = 60, // how many frames to simulate the area induced by each splat for
	SPLAT_PADDING = 4.5, // approximately sqrt(BRISTLE_LENGTH * BRISTLE_LENGTH - BRUSH_HEIGHT * BRUSH_HEIGHT)
	SPEED_PADDING = 1.1,
	PAINT_FLUIDITY = 0.8;


let CONSTANT_NAMES = [
	"ACTIVE_ATTRIBUTES",
	"ACTIVE_ATTRIBUTE_MAX_LENGTH",
	"ACTIVE_TEXTURE",
	"ACTIVE_UNIFORMS",
	"ACTIVE_UNIFORM_MAX_LENGTH",
	"ALIASED_LINE_WIDTH_RANGE",
	"ALIASED_POINT_SIZE_RANGE",
	"ALPHA",
	"ALPHA_BITS",
	"ALWAYS",
	"ARRAY_BUFFER",
	"ARRAY_BUFFER_BINDING",
	"ATTACHED_SHADERS",
	"BACK",
	"BLEND",
	"BLEND_COLOR",
	"BLEND_DST_ALPHA",
	"BLEND_DST_RGB",
	"BLEND_EQUATION",
	"BLEND_EQUATION_ALPHA",
	"BLEND_EQUATION_RGB",
	"BLEND_SRC_ALPHA",
	"BLEND_SRC_RGB",
	"BLUE_BITS",
	"BOOL",
	"BOOL_VEC2",
	"BOOL_VEC3",
	"BOOL_VEC4",
	"BROWSER_DEFAULT_WEBGL",
	"BUFFER_SIZE",
	"BUFFER_USAGE",
	"BYTE",
	"CCW",
	"CLAMP_TO_EDGE",
	"COLOR_ATTACHMENT0",
	"COLOR_BUFFER_BIT",
	"COLOR_CLEAR_VALUE",
	"COLOR_WRITEMASK",
	"COMPILE_STATUS",
	"COMPRESSED_TEXTURE_FORMATS",
	"CONSTANT_ALPHA",
	"CONSTANT_COLOR",
	"CONTEXT_LOST_WEBGL",
	"CULL_FACE",
	"CULL_FACE_MODE",
	"CURRENT_PROGRAM",
	"CURRENT_VERTEX_ATTRIB",
	"CW",
	"DECR",
	"DECR_WRAP",
	"DELETE_STATUS",
	"DEPTH_ATTACHMENT",
	"DEPTH_BITS",
	"DEPTH_BUFFER_BIT",
	"DEPTH_CLEAR_VALUE",
	"DEPTH_COMPONENT",
	"DEPTH_COMPONENT16",
	"DEPTH_FUNC",
	"DEPTH_RANGE",
	"DEPTH_STENCIL",
	"DEPTH_STENCIL_ATTACHMENT",
	"DEPTH_TEST",
	"DEPTH_WRITEMASK",
	"DITHER",
	"DONT_CARE",
	"DST_ALPHA",
	"DST_COLOR",
	"DYNAMIC_DRAW",
	"ELEMENT_ARRAY_BUFFER",
	"ELEMENT_ARRAY_BUFFER_BINDING",
	"EQUAL",
	"FASTEST",
	"FLOAT",
	"FLOAT_MAT2",
	"FLOAT_MAT3",
	"FLOAT_MAT4",
	"FLOAT_VEC2",
	"FLOAT_VEC3",
	"FLOAT_VEC4",
	"FRAGMENT_SHADER",
	"FRAMEBUFFER",
	"FRAMEBUFFER_ATTACHMENT_OBJECT_NAME",
	"FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE",
	"FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE",
	"FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL",
	"FRAMEBUFFER_BINDING",
	"FRAMEBUFFER_COMPLETE",
	"FRAMEBUFFER_INCOMPLETE_ATTACHMENT",
	"FRAMEBUFFER_INCOMPLETE_DIMENSIONS",
	"FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT",
	"FRAMEBUFFER_UNSUPPORTED",
	"FRONT",
	"FRONT_AND_BACK",
	"FRONT_FACE",
	"FUNC_ADD",
	"FUNC_REVERSE_SUBTRACT",
	"FUNC_SUBTRACT",
	"GENERATE_MIPMAP_HINT",
	"GEQUAL",
	"GREATER",
	"GREEN_BITS",
	"HIGH_FLOAT",
	"HIGH_INT",
	"INCR",
	"INCR_WRAP",
	"INFO_LOG_LENGTH",
	"INT",
	"INT_VEC2",
	"INT_VEC3",
	"INT_VEC4",
	"INVALID_ENUM",
	"INVALID_FRAMEBUFFER_OPERATION",
	"INVALID_OPERATION",
	"INVALID_VALUE",
	"INVERT",
	"KEEP",
	"LEQUAL",
	"LESS",
	"LINEAR",
	"LINEAR_MIPMAP_LINEAR",
	"LINEAR_MIPMAP_NEAREST",
	"LINES",
	"LINE_LOOP",
	"LINE_STRIP",
	"LINE_WIDTH",
	"LINK_STATUS",
	"LOW_FLOAT",
	"LOW_INT",
	"LUMINANCE",
	"LUMINANCE_ALPHA",
	"MAX_COMBINED_TEXTURE_IMAGE_UNITS",
	"MAX_CUBE_MAP_TEXTURE_SIZE",
	"MAX_FRAGMENT_UNIFORM_VECTORS",
	"MAX_RENDERBUFFER_SIZE",
	"MAX_TEXTURE_IMAGE_UNITS",
	"MAX_TEXTURE_SIZE",
	"MAX_VARYING_VECTORS",
	"MAX_VERTEX_ATTRIBS",
	"MAX_VERTEX_TEXTURE_IMAGE_UNITS",
	"MAX_VERTEX_UNIFORM_VECTORS",
	"MAX_VIEWPORT_DIMS",
	"MEDIUM_FLOAT",
	"MEDIUM_INT",
	"MIRRORED_REPEAT",
	"NEAREST",
	"NEAREST_MIPMAP_LINEAR",
	"NEAREST_MIPMAP_NEAREST",
	"NEVER",
	"NICEST",
	"NONE",
	"NOTEQUAL",
	"NO_ERROR",
	"NUM_COMPRESSED_TEXTURE_FORMATS",
	"ONE",
	"ONE_MINUS_CONSTANT_ALPHA",
	"ONE_MINUS_CONSTANT_COLOR",
	"ONE_MINUS_DST_ALPHA",
	"ONE_MINUS_DST_COLOR",
	"ONE_MINUS_SRC_ALPHA",
	"ONE_MINUS_SRC_COLOR",
	"OUT_OF_MEMORY",
	"PACK_ALIGNMENT",
	"POINTS",
	"POLYGON_OFFSET_FACTOR",
	"POLYGON_OFFSET_FILL",
	"POLYGON_OFFSET_UNITS",
	"RED_BITS",
	"RENDERBUFFER",
	"RENDERBUFFER_ALPHA_SIZE",
	"RENDERBUFFER_BINDING",
	"RENDERBUFFER_BLUE_SIZE",
	"RENDERBUFFER_DEPTH_SIZE",
	"RENDERBUFFER_GREEN_SIZE",
	"RENDERBUFFER_HEIGHT",
	"RENDERBUFFER_INTERNAL_FORMAT",
	"RENDERBUFFER_RED_SIZE",
	"RENDERBUFFER_STENCIL_SIZE",
	"RENDERBUFFER_WIDTH",
	"RENDERER",
	"REPEAT",
	"REPLACE",
	"RGB",
	"RGB5_A1",
	"RGB565",
	"RGBA",
	"RGBA4",
	"SAMPLER_2D",
	"SAMPLER_CUBE",
	"SAMPLES",
	"SAMPLE_ALPHA_TO_COVERAGE",
	"SAMPLE_BUFFERS",
	"SAMPLE_COVERAGE",
	"SAMPLE_COVERAGE_INVERT",
	"SAMPLE_COVERAGE_VALUE",
	"SCISSOR_BOX",
	"SCISSOR_TEST",
	"SHADER_COMPILER",
	"SHADER_SOURCE_LENGTH",
	"SHADER_TYPE",
	"SHADING_LANGUAGE_VERSION",
	"SHORT",
	"SRC_ALPHA",
	"SRC_ALPHA_SATURATE",
	"SRC_COLOR",
	"STATIC_DRAW",
	"STENCIL_ATTACHMENT",
	"STENCIL_BACK_FAIL",
	"STENCIL_BACK_FUNC",
	"STENCIL_BACK_PASS_DEPTH_FAIL",
	"STENCIL_BACK_PASS_DEPTH_PASS",
	"STENCIL_BACK_REF",
	"STENCIL_BACK_VALUE_MASK",
	"STENCIL_BACK_WRITEMASK",
	"STENCIL_BITS",
	"STENCIL_BUFFER_BIT",
	"STENCIL_CLEAR_VALUE",
	"STENCIL_FAIL",
	"STENCIL_FUNC",
	"STENCIL_INDEX",
	"STENCIL_INDEX8",
	"STENCIL_PASS_DEPTH_FAIL",
	"STENCIL_PASS_DEPTH_PASS",
	"STENCIL_REF",
	"STENCIL_TEST",
	"STENCIL_VALUE_MASK",
	"STENCIL_WRITEMASK",
	"STREAM_DRAW",
	"SUBPIXEL_BITS",
	"TEXTURE",
	"TEXTURE0",
	"TEXTURE1",
	"TEXTURE2",
	"TEXTURE3",
	"TEXTURE4",
	"TEXTURE5",
	"TEXTURE6",
	"TEXTURE7",
	"TEXTURE8",
	"TEXTURE9",
	"TEXTURE10",
	"TEXTURE11",
	"TEXTURE12",
	"TEXTURE13",
	"TEXTURE14",
	"TEXTURE15",
	"TEXTURE16",
	"TEXTURE17",
	"TEXTURE18",
	"TEXTURE19",
	"TEXTURE20",
	"TEXTURE21",
	"TEXTURE22",
	"TEXTURE23",
	"TEXTURE24",
	"TEXTURE25",
	"TEXTURE26",
	"TEXTURE27",
	"TEXTURE28",
	"TEXTURE29",
	"TEXTURE30",
	"TEXTURE31",
	"TEXTURE_2D",
	"TEXTURE_BINDING_2D",
	"TEXTURE_BINDING_CUBE_MAP",
	"TEXTURE_CUBE_MAP",
	"TEXTURE_CUBE_MAP_NEGATIVE_X",
	"TEXTURE_CUBE_MAP_NEGATIVE_Y",
	"TEXTURE_CUBE_MAP_NEGATIVE_Z",
	"TEXTURE_CUBE_MAP_POSITIVE_X",
	"TEXTURE_CUBE_MAP_POSITIVE_Y",
	"TEXTURE_CUBE_MAP_POSITIVE_Z",
	"TEXTURE_MAG_FILTER",
	"TEXTURE_MIN_FILTER",
	"TEXTURE_WRAP_S",
	"TEXTURE_WRAP_T",
	"TRIANGLES",
	"TRIANGLE_FAN",
	"TRIANGLE_STRIP",
	"UNPACK_ALIGNMENT",
	"UNPACK_COLORSPACE_CONVERSION_WEBGL",
	"UNPACK_FLIP_Y_WEBGL",
	"UNPACK_PREMULTIPLY_ALPHA_WEBGL",
	"UNSIGNED_BYTE",
	"UNSIGNED_INT",
	"UNSIGNED_SHORT",
	"UNSIGNED_SHORT_4_4_4_4",
	"UNSIGNED_SHORT_5_5_5_1",
	"UNSIGNED_SHORT_5_6_5",
	"VALIDATE_STATUS",
	"VENDOR",
	"VERSION",
	"VERTEX_ATTRIB_ARRAY_BUFFER_BINDING",
	"VERTEX_ATTRIB_ARRAY_ENABLED",
	"VERTEX_ATTRIB_ARRAY_NORMALIZED",
	"VERTEX_ATTRIB_ARRAY_POINTER",
	"VERTEX_ATTRIB_ARRAY_SIZE",
	"VERTEX_ATTRIB_ARRAY_STRIDE",
	"VERTEX_ATTRIB_ARRAY_TYPE",
	"VERTEX_SHADER",
	"VIEWPORT",
	"ZERO"
];
