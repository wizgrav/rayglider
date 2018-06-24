var State = require("./state");
var audio = document.querySelector("audio");
audio.crossOrigin = "anonymous";

var lastObjectUrl = null;
var CLIENT_ID = "56c4f3443da0d6ce6dcb60ba341c4e8d";
var stream = null;

var tapEl = document.querySelector("#tap");
tapEl.userTapped = false;
tapEl.addEventListener("click", function() {
    if(tapEl.userTapped) return;
    audio.removeAttribute("muted");
    tapEl.style.display = "none";
    tapEl.userTapped = true;
    audio.muted = false;
    State.clubber.context.resume();
    document.body.classList.remove("muted");
    if(audio.paused && audio.src) audio.play();
});

function play (src, dropped) {
    var clubber = State.clubber;

    if(audio.src == src) return;

    if(lastObjectUrl){
        URL.revokeObjectURL(lastObjectUrl);
        lastObjectUrl = null;
    }
    if(stream) {
        var track = stream.getTracks()[0];
        track.stop();
        stream = null;
    }
    if(src instanceof MediaStream) {
        clubber.listen(clubber.context.createMediaStreamSource(src));
        stream = src;
        return;
    } else {
        clubber.listen(audio);
        clubber.muted = false;
        if(dropped) {
            lastObjectUrl = src;
        }
    }
    audio.src=src;
    audio.play();
    
}

audio.onerror = function () {
    console.warn(
      audio.currentSrc.match("blob:")  ?
      "Bad audio file"
      :  
      "Soundcloud API limit reached, try again later.\n\n"
    );
    fallback();
}

var info = document.querySelector("#info");

function updateInfo(url, text) {
    info.innerHTML = "<a href='"+url+"' target='_blank'>Listening to " + text + "</a>";
}

function soundcloud(url) {
    fetch("//api.soundcloud.com/resolve?url=" + encodeURIComponent(url.split("?")[0]) + "&client_id=" + CLIENT_ID)
    .then(function (resp) {
        resp.json().then(function(data){ 
            if (data.kind !== "track"){
                console.warn( "Please provide a track url, " + data.kind + " urls are not supported.");
                fallback();
                return;
            }
            updateInfo(data.permalink_url, data.title+" by "+data.user.username);
            play('//api.soundcloud.com/tracks/'+data.id+'/stream?client_id=' + CLIENT_ID);
        });
    })
}

var handleDragOver = function(e) {
    e.preventDefault();
    e.stopPropagation();
}

var handleDrop = function(e) {
    e.preventDefault();
    e.stopPropagation();
    var objectUrl = URL.createObjectURL(e.dataTransfer.files[0]);
    updateInfo("#", e.dataTransfer.files[0].name);
    play(objectUrl, true);
}


document.body.addEventListener('drop', handleDrop, false);
document.body.addEventListener('dragover', handleDragOver, false);

function mic(){
    var clubber = State.clubber;
    navigator.mediaDevices.getUserMedia({audio: { deviceId: { exact: "default" } }}).then(function(stream) {
        play(stream);
        clubber.muted = true;
    });
}

var tracks = [], activeTrack = null;

function fallback() {
    if(!tracks.length) return;
    document.body.classList.remove("soundcloud");
    activeTrack = tracks.splice(Math.floor(Math.random() * tracks.length),1)[0];
    if(activeTrack === "") {
        updateInfo("#", "live input");
        mic();
    } else if(activeTrack.match(/soundcloud.com/)){
        document.body.classList.add("soundcloud");
        soundcloud(activeTrack);
    } else {
        updateInfo(activeTrack, decodeURIComponent(activeTrack.split("/").pop()));
        play(activeTrack);
    }
}
module.exports = function (asset, config) {
    var uniforms = config.uniforms;
    tracks = [];
    asset.ds.track.forEach(function(tr){
        tracks.push(tr[2]);
    });
    if(!tapEl.userTapped) document.body.classList.add("muted");
    fallback();
    return function (t) {
        uniforms.iTrack[0] = audio.currentTime;
        uniforms.iTrack[1] = audio.duration; 
    }
}