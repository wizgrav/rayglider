var State = require("./state");
var twgl = require("twgl.js");
var util = require("./util");

twgl.setDefaults({crossOrigin: ""});

var cache = {};


function parseAsset(a, gl){
    if(a.type === "net") {
        return {
            src: new Uint8Array(4)
        }
    } else {
        return {
            flipY: true,
            src: a.type === "video" ? null : a.data,
            target: a.type === "cube" ? gl.TEXTURE_CUBE_MAP: gl.TEXTURE_2D
        }
    }
}

module.exports = function (asset, config) {
    var gl = State.context;

    var uniforms = config.uniforms; 

    var us1 = util.resolve("$tex", asset);

    if(!uniforms[us1]) return false;

    var us2 = util.resolve("$inf", asset);

    var tex = cache[asset.data];

    var opts = parseAsset(asset, gl);

    var inf = new Float32Array(4);
    
    if( !tex){
        var cb;
        if(asset.type === "video") {
            var el = document.createElement("video");
            el.muted = true;
            el.loop = true;
            el.autoplay = true;
            el.crossOrigin = "";
            el.playsinline = true;
            el.src = asset.data;
            tex = twgl.createTexture(gl, opts);
            tex.source = el;
        } else {
            tex = twgl.createTexture(gl, opts, function(err, img){ 
                if(!err) return;
                tex.source = img;
                inf.set([img.naturalWidth, img.naturalHeight, 0, 0])
            });
        }
        cache[asset.data] = tex;
    }

    var ws = null, wsd = null;

    if(asset.type === "net") {
        ws = new WebSocket(asset.data, "rayglider");
        ws.binaryType = 'arraybuffer';
        ws.onmessage = function () {
            var data = e.data;
            var dv = new DataView(data);
            var w = Math.min(2048, dv.getUint16(0));
            var h = Math.min(2048, dv.getUint16(2));
            wsd = new Uint8Array(data, 4);
            inf.set([w,h,0,0]);
        }
    }
    uniforms[us1] = tex;

    uniforms[us2] = inf;

    return function (t) {
        if(ws) {
            if(t === false) {
                ws.close();
            } else {
                twgl.setTextureFromArray(gl, tex, wsd, opts);
            }
        } else if(asset.type === "video"){
            var ts = tex.source;
            if(t === false) {
                ts.pause();
            } else if(ts.paused) {
                ts.play();
            } else {
                if(ts.readyState && inf[2] !== ts.currentTime) {
                    opts.width = ts.videoWidth;
                    opts.height = ts.videoHeight;
                    twgl.setTextureFromElement(gl, tex, ts, opts);
                    inf.set([ts.videoWidth, ts.videoHeight, ts.currentTime, ts.duration]);
                }
            }
        }
    }
}