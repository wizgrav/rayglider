var util = require("./util");
precedence = require('precedence-maps');
var pass = require("./pass");
var boom = require("./boom");
var track = require("./track");
var asset = require("./asset");
var lzma = util.lzma;
var State = require("./state");

var cache = {};

var config;

function createConfig() {
    return  {
        imports: {},
        exports: {},
        assets: {},
        urls:{},
        prepass:[],
        passes: [],
        uniforms: {
            iTime: 0,
            iDelta: 0,
            iFrame: 0,
            iFace: 0,
            iTrack: new Float32Array(2),
            iRes: new Float32Array(3),
            iView: new Float32Array(4),
            iMouse: new Float32Array(4),
            iPad0: new Float32Array(4),
            iPad1: new Float32Array(4),
            iPad2: new Float32Array(4),
            iPad3: new Float32Array(4),
            iBoom: null
        },
        assetCount: 1,
        text: ""
    }
}

var resolve = util.resolve;
var rext = util.rext;

var left = 0;

function createObj() {
    return {
        outgoing: [],
        ds: {
            import:[], export:[], pass:[], cube: [], image: [], video: [], boom: [], band: [], track: [], net: []
        },
        ns: {},
        exports: {},
        passes: [],
        booms: {},
        bands: {},
        text: "",
        type: "import"
    }
}
function parse(t, u) {
    var obj = cache[u], arr, ds;
    if(!t) return;
    if(!obj) {
        obj = createObj();
    }
    if(!obj.text) {
        var ta = [];
        obj.origText = t;
        t.match(/[^\r\n]+/g).forEach(function(m) {
            var sm = m.match(rext);
            if(!sm) { ta.push(m); return; }
            sm.shift();
            var dsm = obj.ds[sm[0]];
            if(!dsm) return;
            sm[2] = sm[2].trim();
            dsm.push(sm);
        });
        obj.text = ta.join("\n");
    }
    
    if(!u) config.imports[u] = obj;

    var ds = obj.ds;

    ["cube", "image", "video", "net"].forEach(function(k) { 
        obj.ds[k].forEach(function(sm) {
            var ou = config.urls[sm[2]];
            if(!ou) {
                ou = config.urls[sm[2]] = {
                    data: sm[2],
                    text: "uniform " + (k === "cube" ? "samplerCube":"sampler2D") + " $tex;\nuniform vec4 $inf;\n\n",
                    type: k
                }
            }
            config.assetCount++;
            config.assets[sm[2]] = ou;
            obj.ns[sm[1]] = ou;
        });
    });

    ds.export.forEach(function(sm) { 
        if(config.exports[sm[1]]) { 
            return;
        }
        config.exports[sm[1]] = obj;
        obj.exports[sm[1]] = sm[2];
    });

    ds.pass.forEach(function(sm) {
        var p = {data: sm[2], nop: sm[1] === "void", main: sm[1] === "main"};
        obj.passes.push(p);
        obj.ns[sm[1]] = p;
    });

    ds.import.forEach(function(m){
        left++;

        var sm = m[2];
        
        var imp = config.imports;
        if(!imp[sm]) imp[sm] = cache[sm];
        if(imp[sm]){
            obj.ns[m[1]] = imp[sm];
            imp[sm].outgoing.push(u);
            parse(imp[sm].origText, sm);
            return;
        }
        
        if(!sm) return;
        
        cache[sm] = imp[sm] = obj.ns[m[1]] = createObj();

        imp[sm].outgoing.push(u);

        if(sm.split(".").length === 1) {
            fetch("shaders/lib/" + sm).then(function(r){
                r.text().then(function(s) { parse(s, sm); } )
            });
        } else {
            var ss = window.localStorage.getItem(sm);
            if(ss) {
                decomparse(s, sm);
            } else {
                var iframe = document.createElement("iframe"); 
                iframe.setAttribute("name", "raygl$" + sm);
                iframe.style.display = "none";
                document.body.appendChild(iframe);
                iframe.src = sm;
                imp[sm].iframe = iframe;
            }
        }
    });
    left--;
    if(!left) finalize();
}

function decomparse(s, name) {
    lzma.decompress(util.atob(s), function(s, error) {
        var c = config.imports[name];
        document.body.removeChild(c.iframe);
        c.iframe = null;
        parse(s, name);
    }, function(percent) {});
}

window.addEventListener("message", function(e){
    var s = e.data.data;
    if(!e.data.raygl) return;
    var ss = util.getParameterByName("s", s);
    window.localStorage.setItem(e.data.name, ss);
    decomparse(ss, e.data.name);
}, false);

var Cb;

function finalize() {
    precedence.setGraph("imports", { map: config.imports });
    var order = precedence.getOrder("imports");
    var idx = 1;

    var head = [];
    var body = [];

    var passes = [];

    Object.keys(config.assets).forEach(function(o, i) {
        var a = config.assets[o];
        a.idx = idx++;
        head.push(resolve(a.text,a));
    });

    order.forEach(function(o, i) {
        var a = config.imports[o];
        a.outgoing = [];
        a.idx = idx++;
        passes.push({data: "noblend", nop: true});
        var mainPass = {data: "1 1 0 0 rel screen noblend", idx: a.idx, parent: a};
        a.passes.forEach(function(p){ 
            p.idx = idx++;
            p.parent = a;
            if(p.main){ mainPass.data = p.data; return; };
            if(!p.nop) head.push(resolve("uniform sampler2D $tex;\n\n", p));
            passes.push(p);
        });
        a.ds.boom.forEach(function(v) { head.push(resolve("uniform float $" + v[1] + ";\n\n", a)); });
        body.push(resolve(a.text,a));
        if(o === ""){
            passes.push(mainPass);
        }
    });
    
    Object.keys(config.exports).forEach(function(k) {
        var o = config.exports[k];
        var s = o.exports[k];
        var a = s.split("(");
        if(a.length > 1) {
            head.push([a[0], resolve("$" + k, o) + "(", a[1], ";\n"].join(" "));
            return;
        }
        a = s.split("=");
        if(a.length > 1) {
            head.push([a[0], resolve("$" + k, o), "=", a[1], ";\n"].join(" "));
            return;
        }
    });

    config.text = [head.join("\n"), body.join("\n")].join("\n");
    
    passes.forEach(function(p){
        config.passes.push(pass(p, config));
    });

    Object.keys(config.assets).forEach(function(o, i) {
        var a = config.assets[o];
        var ast = asset(a, config);
        if(!ast) return;
        config.prepass.push(ast);
    });

    order.forEach(function(o, i) {
        var a = config.imports[o];
        var bm = boom(a, config);
        if(bm) config.prepass.push(bm);
    });

    var trk = track(config.imports[""], config);

    if(trk) config.prepass.push(trk);
    
    if(!State.error) {
        window.localStorage.setItem("", config.imports[""].origText);
    }

    Cb(config);
    
    return;
}

module.exports = function(t, cb) {
    config = createConfig();
    Cb = cb;
    left = 1;
    parse(t, "");
}