var State = require("./state");
var twgl = require("twgl.js");
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

var currentTime;
var ret = { bands: [], booms: []}, lret;

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
        var obj = util.parseStyle(b[2]);
        for(var k in rep) obj[rep[k]] = obj[k];
        
        if(obj.bounds) {
            obj.from = obj.bounds[0];
            obj.to = obj.bounds[1];
            obj.low = obj.bounds[2];
            obj.high = obj.bounds[3];
        }

        var us = util.resolve("$" + b[1], asset);
        head.push(["uniform vec4 ", us ,";"].join(""));
        bands[us] = State.clubber.band(obj);
        bands[us].target = uniforms[us] = new Float32Array(4);
    });
    
    
    var used = false;
    
    var exec = [];

    var extra = {};

    asset.ds.boom.forEach(function(b){
        var arr = [];
        var us = resolve("$" + b[1], asset);
        var ub = resolve(b[2], asset, arr);
        if(uniforms[us]) used = true;
        uniforms[us] = 1;
        arr.forEach(function(v){ extra[v] = true });
        head.push("float f" + b[1] + "(void){ return " + ub + ";}");
        exec.push("uniforms." + us + " = f" + b[1] + "();");
    });
    
    Object.keys(extra).forEach(function (v) { head.unshift(["uniform float ", v,";"].join("")); });

    if(used){

        Object.keys(bands).forEach(function(b) { ret.bands.push(bands[b]); })
        
        var src = [transpile( head.join("\n") ), exec.join("\n")].join("\n");

        ret.booms.push(new Function("uniforms", "clubber", src));
    }

   

    return function (t) {
        if(t === false || !lret) {
            lret = ret;
            ret = { bands: [], booms: []};
            currentTime = 0;
        }
        var cl = State.clubber, step = 1000 / cl.fps;
        
        if(!currentTime || Math.abs(currentTime - cl.time) > 1000) currentTime = cl.time;
        
        var tmax = cl.time;
        cl.time = currentTime;

        for ( ; cl.time < tmax; cl.time += step) {
            lret.bands.forEach(function(b){ b(b.target); });
            lret.booms.forEach(function(b){ b(uniforms, cl); });
        }

        currentTime = cl.time;
    }
}