require('./src/ui');
var twgl = require('twgl.js');
require('glsl-transpiler');
var Clubber = require('clubber');
var Config = require("./src/config");
var State = require('./src/state');
var mouse = require('./src/mouse');
var pads = require('./src/pads');
var ui = require('./src/ui');

State.canvas = document.querySelector("canvas");
State.context = twgl.getWebGLContext(State.canvas);
State.clubber = new Clubber();
State.clubber.listen(document.querySelector("audio")); 

var boomOpts = {src: State.clubber.notes, width: 128, height: 1, format: State.context.LUMINANCE};
var arr = [];

State.extensions = {};

var ext = {
    "OES_standard_derivatives" : ["derivatives", "#extension GL_OES_standard_derivatives : enable"],
    "EXT_shader_texture_lod": ["lod","#extension GL_EXT_shader_texture_lod : enable"],
    "OES_texture_float": ["floatSupport",""],
    "OES_texture_float_linear": ["floatLinear",""],
    "EXT_blend_minmax": ["minmax",""]
}

for(var ex in ext) {
    if(State.context.getExtension(ex)){
        arr.push(ext[ex][1]);
        State.extensions[ext[ex][0]] = true;
    }
}

arr.push("precision highp float;");

State.header = arr.join("\n");

var lastTime = 0;

function render(time) {
    window.requestAnimationFrame(render);

    if(State.text) {
        var text = State.text;
        State.text = null;
        delete State.error;
        Config(text, function (c){
            if(State.error) { ui(State.error); return; } else { ui(null, c.title); }
            if(State.config) {
                State.config.prepass.forEach(function(p) { p(false); });
                State.config.passes.forEach(function(p) { p(false); });
                State.config.postpass.forEach(function(p) { p(false); });
            }
            State.config = c;
            State.config.uniforms.iBoom = twgl.createTexture(State.context, boomOpts);
            // console.log(c);
        });
    }

    if(!State.config || State.paused) return;
    
    
    State.needResize = twgl.resizeCanvasToDisplaySize(State.canvas, State.canvasScale);

    State.config.uniforms.iRes.set([State.canvas.width, State.canvas.height, 1]);
        
    State.currentTime = time;
    State.config.uniforms.iFrame = ++State.frameCount;
    State.config.uniforms.iDelta = (time - lastTime) / 1000; 
    State.config.uniforms.iTime = (State.currentTime - State.offsetTime) / 1000;

    State.clubber.update(State.currentTime);
    twgl.setTextureFromArray(State.context, State.config.uniforms.iBoom, State.clubber.notes, boomOpts);

    mouse();
    pads();
   

    State.config.prepass.forEach(function(p) { p(); });
    State.config.passes.forEach(function(p) { p(); });
    State.config.postpass.forEach(function(p) { p(); });
    
    lastTime = time;
    delete State.needResize;
}

render(0);