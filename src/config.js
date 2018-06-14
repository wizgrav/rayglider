var util = require("./util");
precedence = require('precedence-maps');
var pass = require("./pass");
var boom = require("./boom");
var track = require("./track");
var asset = require("./asset");
var lzma = util.lzma;
var State = require("./state");

var config;

function createConfig() {
    return  {
        title: null,
        imports: {},
        exports: {},
        assets: {},
        urls:{},
        prepass:[],
        passes: [],
        postpass: [],
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

function createObj(sid) {
    return {
        outgoing: [],
        ds: {
            import:[], export:[], pass:[], post: [], cube: [], image: [], video: [], boom: [], band: [], track: [], net: []
        },
        ns: {},
        exports: {},
        passes: [],
        post: [],
        booms: {},
        bands: {},
        text: "",
        type: "import",
        sid: sid
    }
}

function parse(t, u) {
    if(!t) return;
    var obj = config.imports[u], arr, ds;
    if(!obj) {
        obj = createObj(u);
    }
    if(!obj.text) {
        var ta = [];
        obj.origText = t;
        t.match(/[^\r\n]+/g).forEach(function(m) {
            if(!u && !config.title && m.substr(0,2) === "//") {
                config.title = m.substr(2);
            }
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

    if(!obj.processed){}
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
            if(!config.assets[sm[2]]) {
                config.assetCount++;
                config.assets[sm[2]] = ou;
            }
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

    ds.post.forEach(function(sm) {
        var p = {data: sm[2], nop: sm[1] === "void", main: sm[1] === "main"};
        obj.post.push(p);
        obj.ns[sm[1]] = p;
    });

    ds.import.forEach(function(m){
        
        var sm = m[2];
        
        var imp = config.imports;
        if(imp[sm]){
            obj.ns[m[1]] = imp[sm];
            if(sm) imp[sm].outgoing.push(u);
            return;
        }
        
        left++;

        imp[sm] = obj.ns[m[1]] = createObj(sm);

        imp[sm].outgoing.push(u);

        if(sm.split(".").length === 1) {
            if(State.cache[sm]) {
                parse(State.cache[sm], sm);
            } else {
                fetch("shaders/lib/" + sm).then(function(r){
                    r.text().then(function(s) { 
                        State.cache[sm] = s;
                        parse(s, sm); 
                    } );
                });
            }
        } else {
            var ss = window.localStorage.getItem(sm);
            if(ss) {
                decomparse(ss, sm);
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
        if(c.iframe) document.body.removeChild(c.iframe);
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
    var post = [];
    
    config.imports[""].exported = config.exports;

    Object.keys(config.assets).forEach(function(o, i) {
        var a = config.assets[o];
        a.idx = idx++;
        head.push(resolve(a.text,a));
    });

    order.forEach(function(o, i) {
        config.imports[o].idx = o ? idx++ : "";
    });

    order.forEach(function(o, i) {
        var a = config.imports[o];
        a.outgoing = [];
        if(a.passes.length) passes.push({data: "noblend", nop: true});
        var mainPass = {data: "view: 1 1 0 0; rel; screen; noblend", idx: a.idx, parent: a};
        
        function passFn(p){
            p.idx = idx++;
            p.parent = a;
            if(!p.nop){ 
                head.push("\n// tex: " + o); 
                head.push(resolve("uniform sampler2D $tex;\n\n", p));
            }
        }
        
        a.passes.forEach(function(p){ 
            passFn(p);
            if(p.main){ mainPass.data = p.data; return; };
            passes.push(p);
        });

        a.post.forEach(function(p){ 
            passFn(p);
            post.push(p);
        });
        
        if(a.ds.boom.length) head.push("\n// boom: " + o); 
        
        a.ds.boom.forEach(function(v) {
            head.push(resolve("uniform float $" + v[1] + ";\n\n", a)); 
        });
        body.push("\n// body: " + o);
        body.push(resolve(a.text,a));
        if(o === ""){
            passes.push(mainPass);
        }
    });
    
    Object.keys(config.exports).forEach(function(k) {
        var o = config.exports[k];
        var s = o.exports[k];
        var a = s.split("(");
        head.push("\n// exported: " + o.sid);
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

    post.forEach(function(p){
        config.postpass.push(pass(p, config));
    });

    Object.keys(config.assets).forEach(function(o, i) {
        var a = config.assets[o];
        var ast = asset(a, config);
        if(!ast) return;
        config.prepass.push(ast);
    });

    var bm;
    order.forEach(function(o, i) {
        var a = config.imports[o];
        bm = boom(a, config);
    });
    
    if(bm) config.prepass.push(bm);
    
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