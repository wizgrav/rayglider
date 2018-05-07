var State = require("./state");
var twgl = require("twgl-base.js");
var util = require("./util");
var GLSL = require('glsl-transpiler');

var resolve = util.resolve;

var transpile = GLSL({
    uniform: function (name) {
        return "uniforms."+name;
    }
});

var head = [
    "uniform float iTime;",
    "",
    "uniform float iDelta;",
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
    ""
];

module.exports = function (asset, config) {
    var uniforms = config.uniforms; 
    var head = [
        "uniform float iTime;",
        "",
        "uniform float iDelta;",
        "",
        "uniform vec4 iMouse;",
        "",
        "uniform vec2 iTrack;",
        "",
        "uniform vec4 iPad0;",
        "",
        "uniform vec4 iPad1;",
        "",
        "uniform vec4 iPad2;",
        "",
        "uniform vec4 iPad3;",
        ""
    ];
    
    var bands = {};
    asset.ds.band.forEach(function(b){
        var rep = {s: "smooth", a: "adapt", t: "template", b: "bounds"};
        var obj = {};
        b[2].split(";").forEach(function(o) {
            var ar = o.split(":");
            obj[rep[ar[0].trim()]] = ar[1].trim().split(" ").map(function(v){ return parseFloat(v); });
        });
        if(obj.bounds) {
            obj.from = obj.bounds[0];
            obj.to = obj.bounds[1];
            obj.low = obj.bounds[2];
            obj.high = obj.bounds[3];
        }
        var us = util.resolve("$" + b[1], asset);
        head.push(["uniform vec4 ", us ,";"].join(""));
        bands[us] = State.clubber.band(obj);
        uniforms[us] = new Float32Array(4);
    });
    
    var bandNames = Object.keys(bands);

    var used = false;
    
    var exec = ["for(var step=1000/clubber.fps; currentTime < clubber.time; currentTime += step){"];

    var extra = {};

    asset.ds.boom.forEach(function(b){
        var arr = [];
        var us = resolve("$" + b[1], asset);
        var ub = resolve(b[2], asset, arr);
        if(uniforms[us]) used = true;
        arr.forEach(function(v){ extra[v] = true });
        head.push("float f" + b[1] + "(void){ return " + ub + ";}");
        exec.push("uniforms." + us + " = f" + b[1] + "();");
    });
    
    Object.keys(extra).forEach(function (v) { head.unshift(["uniform float ", v,";"].join("")); });

    if(!used) return false;

    var currentTime = 0;
    exec.push("}");
    exec.push("return currentTime;");
    
    var src = [transpile( head.join("\n") ), exec.join("\n")].join("\n");

    var fn = new Function("uniforms", "currentTime", "clubber", src);

    return function (t) {
        if(!currentTime) currentTime = State.currentTime;
        bandNames.forEach(function(b) { bands[b](uniforms[b]); });
        currentTime = fn(uniforms, currentTime, State.clubber);
    }
}