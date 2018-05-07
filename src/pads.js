var util = require("./util");
var State = require("./state");

State.netData = new Float32Array(4 * 6);

var pads, active=[true,false,false,false];

function select() {

    var a = ["Provide up to 4, space separated, of the ids below to use as the active pads:",""];
    var gm = navigator.getGamepads(), sm = [];
    pads = [false, true];
    Array.prototype.forEach.call(gm, function(g, i){ if(g) pads.push(g)});
    pads.forEach(function(v,i){
       if(v === false) {
        a.push("0: Disable");
       } else if(v === true) {
        a.push("1: Keyboard(Arrows/wasd + R + F)");
       } else {
        a.push(i+": "+v.id);
       }
    });
    var s = prompt(a.join("\n"));
    if(!s) return;
    active = s.split(" ").map(function(v) {
        var idx = parseInt(v);
        return pads[idx] ? pads[idx] : false;
    });

    while(active.length < 4) {
        active.push(false);
    }
}

var keyMap = {
  "ArrowDown": false,
  "ArrowUp": false,
  "ArrowLeft": false,
  "ArrowRight": false,
  "w": false,
  "a": false,
  "s": false,
  "d": false,
  "e": false,
  "r": false,
  "c": false,
  "v": false
}
var keys = [0, 0, 0, 0];

window.addEventListener("keydown", function(e){
  // console.log(e.key);
  if(e.key in keyMap) keyMap[e.key] = true;
});

window.addEventListener("keyup", function(e){
  if(e.key in keyMap) keyMap[e.key] = false;
});

module.exports = function (t) {
    if(t===false) { select(); return;}
    keys[0] = keyMap["ArrowLeft"] || keyMap["a"] ? -1 : (keyMap["ArrowRight"] || keyMap["d"] ? 1 : 0);
    keys[1] = keyMap["ArrowDown"] || keyMap["s"] ? -1 : (keyMap["ArrowUp"] || keyMap["w"] ? 1 : 0);
    keys[2] = keyMap["c"] ? -1 : (keyMap["e"] ? 1 : 0);
    keys[3] = keyMap["v"] ? -1 : (keyMap["r"] ? 1 : 0);
    
    var u = State.config.uniforms;
    var gm = navigator.getGamepads();
    for(var i=0; i< 4; i++){
        var v = active[i];
        var uv = u["iPad"+i];
        if(v === true) {
            uv.set(keys);
        } else if(v.id) {
            var g = gm[v.index];
            
            uv[0] = g.axes[0];
            uv[1] = g.axes[1];
            var btp = [false, false], btv = [0, 0], btm = [1, 1];
            for(var j=0; j < g.buttons.length; j++) {
                var bt = g.buttons[j];
                if(bt.pressed) {
                  btp[j & 1] = true;
                  btv[j & 1] = bt.value;
                  btm[j & 1] = (j & 3) > 1 ? -1 : 1;
                }
            }
            uv[2] = btp[0] ? btv[0] * btm[0]: 0;
            uv[3] = btp[1] ? btv[1] * btm[1]: 0;
        }
    }
}