var State = require("./state");
var twgl = require("twgl-base.js");
var util = require("./util");
var resolve = util.resolve;
var buf;

var vs = [
    "attribute vec2 pos;",
    "void main(void) ",
    "{",
    "   vec4 p = vec4(0.,0.,1.,1.);",
    "   gl_Position = vec4(pos.xy * p.zw + p.xy,0.0,1.0);",
    "}"
].join("\n");

var fsHead = [
    "#define PI 3.14159265359",
    "#define PI2 6.28318530718",
    "#define PHI 1.618033988749895",
    "",
    "#define saturate(x) clamp(x, 0., 1.)",
    "",
    "uniform float iTime;",
    "",
    "uniform float iDelta;",
    "",
    "uniform int iFrame;",
    "",
    "uniform int iFace;",
    "",
    "uniform vec2 iTrack;",
    "",
    "uniform vec4 iView;",
    "",
    "uniform vec3 iRes;",
    "",
    "uniform vec4 iMouse;",
    "",
    "uniform vec4 iPad0;",
    "",
    "uniform vec4 iPad1;",
    "",
    "uniform vec4 iPad2;",
    "",
    "uniform vec4 iPad3;",
    "",
    "uniform sampler2D iBoom;",
    ""
].join("\n");

var fsFoot = [
    "void main( void )",
    "{ ",
    "    vec4 color = vec4(0., 0., 0., 1.);",
    "    $main(color, gl_FragCoord.xy);",
    "    gl_FragColor = color;",
    "}"
].join("\n");

var Eqs = {
    "add": "FUNC_ADD",
    "sub": "FUNC_SUBTRACT",
    "rev": "FUNC_REVERSE_SUBTRACT",
    "min": "MIN_EXT",
    "max": "MAX_EXT"
}

var Funcs = {
    "one": "ONE",
    "zero": "ZERO",
    "src": "SRC_COLOR",
    "msc": "ONE_MINUS_SRC_COLOR",
    "dsc": "DST_COLOR",
    "mdc": "ONE_MINUS_DST_COLOR",
    "sra": "SRC_ALPHA",
    "msa": "ONE_MINUS_SRC_ALPHA",
    "dsa": "DST_ALPHA",
    "mda": "ONE_MINUS_DST_ALPHA",
    "sat": "SRC_ALPHA_SATURATE"
}

var Wrap = {
    "mirror": "MIRRORED_REPEAT",
    "clamp": "CLAMP_TO_EDGE",
    "repeat": "REPEAT"
}

module.exports = function (asset, config) {
    var uniforms = config.uniforms; 
    var gl = State.context;
    var us1 = util.resolve("$tex", asset);
    var arr = asset.data.split(" ");

    var opts = {}, coords = [], funcs, eqs, fmin, fmag, wrap;

    arr.forEach(function (v) {
        var n = parseFloat(v);
        if(isNaN(n)) {
            if(!v.indexOf("func-")){
                funcs = v.split("-").shift().map(function(v){ return gl[Funcs[v]]; });
                opts.blend = true;
            } else if(!v.indexOf("eq-")) {
                eqs = v.split("-").shift().map(function(v){ return gl[Eqs[v]]; });
                opts.blend = true;
            } else if(!v.indexOf("mag-")) {
                fmag = v.split("-")[1];
            } else if(!v.indexOf("min-")) {
                fmin = v.split("-").map(function (s) { return s.toUpperCase(); }).shift();
            } else if(!v.indexOf("wrap-")) {
                wrap = v.split("-").shift().map(function(v){ return gl[Wrap[v]]; });
            } else {
                opts[v] = true;
            }
        } else {
            coords.push(n);
        }
    });

    if(!fmin) {
        fmin = ["LINEAR", "LINEAR"];
    } else if(fmin.length < 2) {
        fmin.push(fmin[0]);
    }

    if(!fmag) {
        fmag = "LINEAR";
    }

    if(!wrap) {
        wrap = [gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE];
    }

    if(!opts.rel) {
        coords = coords.map(function(n) { return Math.floor(n); });
    }

    if(!coords.length){
        coords = [1,1,0,0];
    } else if(coords.length == 1) {
        coords.push(coords[0]); 
    }

    if(coords.length < 4) coords[2] = coords[3] = 0;

    var fbs = [];

    if(!opts.screen && !opts.nop) {
        var flmin = gl[opts.mips ? fmin.join("_MIPMAP_"): fmin[0]];
        var ft = opts.float ? gl.FLOAT : gl.UNSIGNED_BYTE;
        var att = [
            {type: ft, min:flmin, mag:gl[fmag], wrapS: wrap[0], wrapT: wrap[1], flipY: opts.flip, auto: opts.mips, target: opts.cube ? gl.TEXTURE_CUBE_MAP : gl.TEXTURE_2D}
        ]
        fbs.push(twgl.createFramebufferInfo(gl, att));
        fbs.push(twgl.createFramebufferInfo(gl, att));
    }

    var width = 0, height = 0, offsetX, offsetY;

    if(!opts.rel){
        width = coords[0];
        height = coords[1];
        if(!fbs.length) {
            offsetX = coords[2];
            offsetY = coords[3];
        }
    } else {
        resize();
    }
    
    var prog = null;

    if(!asset.nop) {
        fs = [State.header, "#define " + resolve("$PASS", asset) + " 1" , fsHead, config.text, resolve(fsFoot, asset.parent)].join("\n");
        // console.log(fs);
            
        prog  = twgl.createProgramInfo(gl, [vs, fs], function(msg){
            State.error = msg;
        });
        if(prog) {
            Object.keys(prog.uniformSetters).forEach(function (k) {
                if(!(k in uniforms)) uniforms[k] = 1;
            })
        }
    }

    function resize() {
        width = Math.floor(gl.canvas.width * coords[0]);
        height = Math.floor(gl.canvas.height * coords[1]);
        if(!fbs.length) {
            offsetX = Math.floor(gl.canvas.width * coords[2]);
            offsetY = Math.floor(gl.canvas.height * coords[3]);
        }
        fbs.forEach(function(fb){
            twgl.resizeFramebufferInfo(gl, fb, att, width, height);   
        });
    }

    return function (t) {
        if(t === false && prog) {
            gl.deleteProgram(prog.program);
            fbs.forEach(function(fb) {
                gl.deleteTexture(fb.attachments[0]);
                gl.deleteFramebuffer(fb.framebuffer);
            });
            return;
        }

        if(opts.noblend) gl.disable(gl.BLEND);
        if(opts.blend) gl.enable(gl.BLEND);
        
        if(eqs) {
            if(eqs.length === 2) {
                gl.blendEquation(eqs[0], eqs[1]);
            } else if(eqs.length === 4) {
                gl.blendEquationSeparate(eqs[0], eqs[1], eqs[2], eqs[3])
            }
        }

        if(funcs) {
            if(funcs.length === 1) {
                gl.blendFunc(funcs[0]);
            } else if(funcs.length === 2) {
                gl.blendFuncSeparate(funcs[0], funcs[1])
            }
        }
        
        if(asset.nop) return;

        if(!buf) {
            buf = twgl.createBufferInfoFromArrays(gl, {pos: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0]});
        }

        if(opts.rel && State.needResize) {
            resize();
        }

        var fc = uniforms.iFrame;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbs.length ? fbs[fc & 1].framebuffer : null);
        gl.useProgram(prog.program);
        var view = [offsetX, offsetY, width, height]
        gl.viewport(view[0], view[1], view[2], view[3]);
        uniforms.iView.set(view);
        twgl.setBuffersAndAttributes(gl, prog, buf);
        twgl.setUniforms(prog, uniforms);
        if(opts.cube) {
            for(var i=0; i < 6; i++){
                twgl.setUniforms(prog, { iFace: i });
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X+i, fbs[fc & 1].attachment[0], 0);
                twgl.drawBufferInfo(gl, buf);
            }
        } else {
            twgl.drawBufferInfo(gl, buf);
        }
        if(fbs.length) {
            uniforms[us1] = fbs[fc & 1].attachments[0];
            if(opts.mips) {
                var tr = opts.cube ? gl.TEXTURE_CUBE_MAP: gl.TEXTURE_2D;
                gl.bindTexture(tr, uniforms[us1]);
                gl.generateMipmaps(tr);
            }
        }
    }
}