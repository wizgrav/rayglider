var util = require("./util");
var State = require("./state");

var clicked = false, data = new Float32Array(4);

window.addEventListener("mousemove", function(e) {
    if(!clicked) return;
    data[0] = e.clientX;
    data[1] = e.clientY;
});

window.addEventListener("mousedown", function(e) {
    data[2] = e.clientX;
    data[3] = e.clientY;
    clicked = true;
});

window.addEventListener("mouseup", function(e) {
    clicked = false;
    data[2] = data[3] = 0;
});

module.exports = function () {
   State.config.uniforms.iMouse.set(data);
}