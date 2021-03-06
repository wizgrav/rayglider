
var CM = require("codemirror");
require("codemirror/addon/hint/show-hint");
require("codemirror/addon/edit/matchbrackets");
require("codemirror/addon/edit/closebrackets");
require('./glsl');
var util = require('./util');
var State = require("./state");
var PREFIX = util.PREFIX;
var pads = require("./pads");

Number.prototype.toHHMMSS = function () {
  var sec_num = this;
  var hours   = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  var seconds = sec_num - (hours * 3600) - (minutes * 60);

  seconds = seconds.toFixed(1);
  if (hours   < 10) {hours   = "0"+hours;}
  if (minutes < 10) {minutes = "0"+minutes;}
  if (seconds < 10) {seconds = "0"+seconds;}
  return hours+':'+minutes+':'+seconds+"s";
}

var buttons = document.querySelectorAll("#header button, #foot button");

function toggle(el) {
  if(el.classList.contains("disabled")) {
    el.classList.remove("disabled");
  } else {
    el.classList.add("disabled");
  }
  var cl = el.id;
  if(cl) {
    if(document.body.classList.contains(cl)) {
      document.body.classList.remove(cl);
    } else {
      document.body.classList.add(cl);
    }
  }

  return el.classList.contains("disabled");
}

var Buttons = {};
Array.prototype.forEach.call(buttons, function (b) {
  Buttons[b.id] = b;
  b.addEventListener("click", {
    code:function () {
      document.querySelector("#tap").click();
      toggle(this);
      cm.refresh();
    },

   reset: function () {
      State.fpsCount = State.frameCount = 0;
      State.offsetTime = State.currentTime;
   },

    play: function () {
      State.paused = !toggle(this);
    },

    joy: function () {
      pads(false);
    },

    full: function () {
      document.querySelector("#tap").click();
      var element = State.canvas;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.webkitRequestFullScreen) {
        element.webkitRequestFullScreen();
      }
    },

    apply: function (e) {
      if(this.classList.contains("disabled")) e.preventDefault();
      State.text = cm.getValue();
      this.classList.add("disabled");
    },

    split: function(){
      toggle(this);
      cm.refresh();
      //cs.refresh();
    },

    hd: function(){
      document.querySelector("#tap").click();
      State.canvasScale = toggle(this) ? 0.5 : 1;
    },

    create: function(){
     window.open("run.html?s=XQAAAAKrAAAAAAAAAAAFYdTeawTqKymAWjyFtIA3PCFdfKL6my74WDEb0KQDsz72jEGYTdqWLpRRnBYSxJcYux7lHGFyi_EhBW2J5uw0y1LC4slw3EK69zgNwislq4iRrB5DqeUkJeeLcHvqd_BS9y5Cp5-HCw8Lu1K_eLKUtMKjBC1wqRNhc4urpOBp4N3--OLA");
    }
  }[b.id])
});

var running = false;

var state = document.querySelector("#state");

var hints = {

};

function hint(cm, option) {
  var c = cm.getCursor();
  var w = cm.findWordAt(c);
  var sw = cm.getRange(w.anchor, w.head);
  w.anchor.ch -= 2;
  if(w.anchor.ch <= 0) return;
  var pw = cm.findWordAt(w.anchor);
  if( pw.ch < 1 ) return;
  w.anchor.ch += 1;
  pw.anchor.ch -= 1;
  var ps = cm.getRange(pw.anchor, w.anchor);
  var m = ps.match(/\@(\w+)/);
  if(!m) return;

  var h = hints[m[1]];
  if(!h) return;


  for (var o in obj) {

  };

  return { list: comp,
    from: CodeMirror.Pos(cursor.line, start),
    to: CodeMirror.Pos(cursor.line, end)}
}

function cmOpt(readOnly) {
  return {
    lineNumbers: true,
    lineWrapping: true,
    autoCloseBrackets:true,
    matchBrackets: true,
    extraKeys: {
      "Alt-Enter": function (cm) {
        document.querySelector("#apply").click();
      }
    },
    //hintOptions: {hint: hint},
    mode: "text/x-glsl",
    readOnly: readOnly ? true :false,
    //viewportMargin: Infinity
  }
}

var cm = CM(document.querySelector("#main"), cmOpt());
var cs = CM(document.querySelector("#side"), cmOpt(true));

var applyButton = document.querySelector("#apply");
cm.on("change", function(cm, change) { applyButton.classList.remove("disabled"); });

function checkAlt(e){
  if(e.altKey) {
    document.body.classList.add("hide-editor");
  } else {
    document.body.classList.remove("hide-editor");
  }
}
document.addEventListener("keydown", checkAlt );
document.addEventListener("keyup", checkAlt );

window.addEventListener("focus", function () { document.body.classList.remove("hide-editor"); }, false);
    

document.querySelector('#main').addEventListener("click", function(e) {
  if(e.target.classList.contains('cm-link'))  {
    var s = e.target.textContent;
    if(s[0] === "@") {
      var o = State.config.imports[""];
      s = s.replace("@", "");
      o = o.ns[s];
      s = o.origText;
      if(!o || !o.origText) {
        return;
      }
    } else if (s in State.config.imports) {
      s = State.config.imports[s].origText;
      if(!s) return;
    } else {
      open(s, "Rayglider");
      return;
    }
    if(document.body.classList.contains("split")) {
      Buttons["split"].click();
    }
    cs.setValue(s);
  }
})

state.addEventListener("mouseenter", function() {
  if(this.classList.contains("wait")) return;
  var s = cm.getValue();
  if(s === state._lastValue) return;
  this.classList.add("wait");
  this.classList.remove("bad");
  this.classList.remove("good");
  this.title = "Generating editor state url."
  state._lastValue = s;
  var self = this;
  util.lzma.compress(s, 9, function(r) {
    self.classList.remove("wait");
    var enc = util.btoa(new Uint8Array(r));
    state.href = PREFIX + enc;
    var len = state.href.length;
    if(len > 2048) {
      self.classList.add("bad");
      self.title = "URL TOO BIG "+len+" bytes > 2KB) Won't be able to shorten it :(";
    } else {
      self.classList.add("good");
      self.title = "State url is "+len+" bytes. You can shorten and share it :)";
    }
    // console.log(s.length, len);
  }, function(pc) {
    // console.log(pc+"%");
  });
});

state.addEventListener("click", function(e) {
  if(this.classList.contains("wait")) e.preventDefault();
});

var stats = document.querySelectorAll("#stats span");

setInterval(function () {
  stats[0].textContent = "Frame " + State.frameCount;
  stats[1].textContent = (1000 * (State.frameCount - State.fpsCount) / (State.currentTime - State.fpsTime + 0.0001)).toFixed(1) + " FPS";
  stats[2].textContent = ((State.currentTime - State.offsetTime) / 1000).toHHMMSS();
  State.fpsCount = State.frameCount;
  State.fpsTime = State.currentTime;
}, 150);

var src = util.getParameterByName("s");
if(!src) {
  var res = [
    "","",
    "void $main(inout vec4 fragColor, vec2 fragCoord) {",
    "  vec2 uv = fragCoord/iRes.xy;", "",
    "  vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));","",
    "  fragColor = vec4(col,1.0);","",
    "}"
  ].join("\n");
  var s = window.localStorage.getItem("");
  if(s) res = s;
  State.text = res;
  cm.setValue(res);
} else{
  util.lzma.decompress(util.atob(src), function(res){ State.text = res; cm.setValue(res);  }, function(){});
}
cm.refresh();
var titleEl = document.querySelector("#title"), titleTimeout;

module.exports = function (err, title) {
  if(err) {
    if(document.body.classList.contains("split")) {
      Buttons["split"].click();
    }
    document.body.classList.add("error");
    cs.setValue(err);
    cs.execCommand("goDocEnd");
    
    
  } else {
    document.body.classList.remove("error");
    cs.setValue("");
  }

  if(title) {
    titleEl.textContent = title;
    titleEl.classList.add("show");
    if(titleTimeout) window.clearTimeout(titleTimeout);
    titleTimeout = window.setTimeout(function() {
      titleEl.remove("show");
    }, title.length * 200);
  }
}