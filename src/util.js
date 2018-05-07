var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  
var lookup = new Uint8Array(256);
for (var i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
}

var encode = function(bytes) {
    var i, len = bytes.length, base64 = "";

    for (i = 0; i < len; i+=3) {
    base64 += chars[bytes[i] >> 2];
    base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    base64 += chars[bytes[i + 2] & 63];
    }

    if ((len % 3) === 2) {
    base64 = base64.substring(0, base64.length - 1) + "!";
    } else if (len % 3 === 1) {
    base64 = base64.substring(0, base64.length - 2) + "!!";
    }

    return base64;
};
  
var decode =  function(base64) {
    var bufferLength = base64.length * 0.75,
    len = base64.length, i, p = 0,
    encoded1, encoded2, encoded3, encoded4;

    if (base64[base64.length - 1] === "!") {
    bufferLength--;
    if (base64[base64.length - 2] === "!") {
        bufferLength--;
    }
    }

    var arraybuffer = new ArrayBuffer(bufferLength),
    bytes = new Uint8Array(arraybuffer);

    for (i = 0; i < len; i+=4) {
    encoded1 = lookup[base64.charCodeAt(i)];
    encoded2 = lookup[base64.charCodeAt(i+1)];
    encoded3 = lookup[base64.charCodeAt(i+2)];
    encoded4 = lookup[base64.charCodeAt(i+3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }

    return bytes;
};

var rext = /\#([\w]+)\s+([\w\@\$\-]+)\s*\<\s*(.*)\s*\>/;
var ext1 = /[\@](\w+)\.(\w+)/g;
var ext2 = /[\$](\w+)/g;

function resolve(s, obj, arr) {
    if(!arr) arr = [];
    return s.replace(ext1, function(s1, s2, s3) { var s = ["raygl", s3, obj.ns[s2].idx].join("_"); arr.push(s); return s; })
         .replace(ext2, function(s1, s2) { var s = ["raygl", s2, obj.idx].join("_");  arr.push(s); return s;});
 }


//LZMA © 2015 Nathan Rugg <nmrugg@gmail.com> | MIT
function LZMA(lzma_path) {
    var action_compress   = 1,
        action_decompress = 2,
        action_progress   = 3,
        
        callback_obj = {},
        
        ///NOTE: Node.js needs something like "./" or "../" at the beginning.
        lzma_worker = new Worker(lzma_path || "./lzma_worker-min.js");
    
    lzma_worker.onmessage = function onmessage(e) {
        if (e.data.action === action_progress) {
            if (callback_obj[e.data.cbn] && typeof callback_obj[e.data.cbn].on_progress === "function") {
                callback_obj[e.data.cbn].on_progress(e.data.result);
            }
        } else {
            if (callback_obj[e.data.cbn] && typeof callback_obj[e.data.cbn].on_finish === "function") {
                callback_obj[e.data.cbn].on_finish(e.data.result, e.data.error);
                
                /// Since the (de)compression is complete, the callbacks are no longer needed.
                delete callback_obj[e.data.cbn];
            }
        }
    };
    
    /// Very simple error handling.
    lzma_worker.onerror = function(event) {
        var err = new Error(event.message + " (" + event.filename + ":" + event.lineno + ")");
        
        for (var cbn in callback_obj) {
            callback_obj[cbn].on_finish(null, err);
        }
        
        console.error('Uncaught error in lzma_worker', err);
    };
    
    return (function () {
        
        function send_to_worker(action, data, mode, on_finish, on_progress) {
            var cbn;
            
            do {
                cbn = Math.floor(Math.random() * (10000000));
            } while(typeof callback_obj[cbn] !== "undefined");
            
            callback_obj[cbn] = {
                on_finish:   on_finish,
                on_progress: on_progress
            };
            
            lzma_worker.postMessage({
                action: action, /// action_compress = 1, action_decompress = 2, action_progress = 3
                cbn:    cbn,    /// callback number
                data:   data,
                mode:   mode
            });
        }
        
        return {
            compress: function compress(mixed, mode, on_finish, on_progress) {
                send_to_worker(action_compress, mixed, mode, on_finish, on_progress);
            },
            decompress: function decompress(byte_arr, on_finish, on_progress) {
                send_to_worker(action_decompress, byte_arr, false, on_finish, on_progress);
            },
            worker: function worker() {
                return lzma_worker;
            }
        };
    }());
};

var wsrc = ["var LZMA=function(){function m(a){var b=[];b[a-1]=void 0;return b}function J(a,b){return Z(a[0]+b[0],a[1]+b[1])}function ta(a,b){var c=E(a)&E(b);var d=4294967296*(~~Math.max(Math.min(a[1]/4294967296,2147483647),-2147483648)&~~Math.max(Math.min(b[1]/4294967296,2147483647),-2147483648));var e=c;0>c&&(e+=4294967296);return[e,d]}function M(a,b){if(a[0]==b[0]&&a[1]==b[1])return 0;var c=0>a[1];var d=0>b[1];return c&&!d?-1:!c&&d?1:0>Z(a[0]-b[0],a[1]-b[1])[1]?-1:1}function Z(a,b){b%=1.8446744073709552E19;",
"a%=1.8446744073709552E19;var c=b%4294967296;var d=4294967296*Math.floor(a/4294967296);b=b-c+d;for(a=a-d+c;0>a;)a+=4294967296,b-=4294967296;for(;4294967295<a;)a-=4294967296,b+=4294967296;for(b%=1.8446744073709552E19;0x7fffffff00000000<b;)b-=1.8446744073709552E19;for(;-9223372036854775808>b;)b+=1.8446744073709552E19;return[a,b]}function K(a){return 0<=a?[a,0]:[a+4294967296,-4294967296]}function E(a){return 2147483648<=a[0]?~~Math.max(Math.min(a[0]-4294967296,2147483647),-2147483648):~~Math.max(Math.min(a[0],",
"2147483647),-2147483648)}function aa(a){return 30>=a?1<<a:aa(30)*aa(a-30)}function ua(a,b){b&=63;if(a[0]==va[0]&&a[1]==va[1])return b?H:a;if(0>a[1])throw Error('Neg');var c=aa(b);var d=a[1]*c%1.8446744073709552E19;var e=a[0]*c;c=e-e%4294967296;d+=c;0x7fffffffffffffff<=d&&(d-=1.8446744073709552E19);return[e-c,d]}function wa(a,b){var c=aa(b&63);return Z(Math.floor(a[0]/c),a[1]/c)}function xa(a,b){a.buf=b;a.pos=0;a.count=b.length;return a}function N(a){return a.pos>=a.count?-1:a.buf[a.pos++]&255}function ya(a){a.buf=",
"m(32);a.count=0;return a}function ba(a){var b=a.buf;b.length=a.count;return b}function na(a,b,c,d,e){for(var f=0;f<e;++f)c[d+f]=a[b+f]}function za(a,b,c){a.output=ya({});var d=xa({},b),e=a.output,f=K(b.length);if(0>M(f,ca))throw Error('invalid length '+f);a.length_0=f;b={};var h;b._repDistances=m(4);b._optimum=[];b._rangeEncoder={};b._isMatch=m(192);b._isRep=m(12);b._isRepG0=m(12);b._isRepG1=m(12);b._isRepG2=m(12);b._isRep0Long=m(192);b._posSlotEncoder=[];b._posEncoders=m(114);b._posAlignEncoder=",
"T({},4);b._lenEncoder=Aa({});b._repMatchLenEncoder=Aa({});b._literalEncoder={};b._matchDistances=[];b._posSlotPrices=[];b._distancesPrices=[];b._alignPrices=m(16);b.reps=m(4);b.repLens=m(4);b.processedInSize=[H];b.processedOutSize=[H];b.finished=[0];b.properties=m(5);b.tempPrices=m(128);b._longestMatchLength=0;b._matchFinderType=1;b._numDistancePairs=0;b._numFastBytesPrev=-1;for(h=b.backRes=0;4096>h;++h)b._optimum[h]={};for(h=0;4>h;++h)b._posSlotEncoder[h]=T({},6);h=1<<c.s;b._dictionarySize=h;for(var g=",
"0;h>1<<g;++g);b._distTableSize=2*g;b._numFastBytes=c.f;h=b._matchFinderType;b._matchFinderType=c.m;b._matchFinder&&h!=b._matchFinderType&&(b._dictionarySizePrev=-1,b._matchFinder=null);b._numLiteralPosStateBits=0;b._numLiteralContextBits=3;b._posStateBits=2;b._posStateMask=3;b._writeEndMark='undefined'==typeof LZMA.disableEndMark;b.properties[0]=9*(5*b._posStateBits+b._numLiteralPosStateBits)+b._numLiteralContextBits<<24>>24;for(c=0;4>c;++c)b.properties[1+c]=b._dictionarySize>>8*c<<24>>24;na(b.properties,",
"0,e.buf,e.count,5);e.count+=5;for(c=0;64>c;c+=8)h=E(wa(f,c))&255,e.buf[e.count++]=h<<24>>24;b._needReleaseMFStream=0;b._inStream=d;b._finished=0;b._matchFinder||(d={},f=4,b._matchFinderType||(f=2),d.HASH_ARRAY=2<f,d.HASH_ARRAY?(d.kNumHashDirectBytes=0,d.kMinMatchCheck=4,d.kFixHashSize=66560):(d.kNumHashDirectBytes=2,d.kMinMatchCheck=3,d.kFixHashSize=0),b._matchFinder=d);d=b._literalEncoder;f=b._numLiteralPosStateBits;c=b._numLiteralContextBits;if(null==d.m_Coders||d.m_NumPrevBits!=c||d.m_NumPosBits!=",
"f)for(d.m_NumPosBits=f,d.m_PosMask=(1<<f)-1,d.m_NumPrevBits=c,c=1<<d.m_NumPrevBits+d.m_NumPosBits,d.m_Coders=m(c),f=0;f<c;++f){h=d.m_Coders;g=f;var k={};k.m_Encoders=m(768);h[g]=k}if(b._dictionarySize!=b._dictionarySizePrev||b._numFastBytesPrev!=b._numFastBytes){d=b._matchFinder;f=b._dictionarySize;c=b._numFastBytes;if(1073741567>f){d._cutValue=16+(c>>1);g=f+4096;h=c+274;d._keepSizeBefore=g;d._keepSizeAfter=h;g=g+h+(~~((f+4096+c+274)/2)+256);if(null==d._bufferBase||d._blockSize!=g)d._bufferBase=null,",
"d._blockSize=g,d._bufferBase=m(d._blockSize);d._pointerToLastSafePosition=d._blockSize-h;d._matchMaxLen=c;c=f+1;d._cyclicBufferSize!=c&&(d._son=m(2*(d._cyclicBufferSize=c)));c=65536;d.HASH_ARRAY&&(c=f-1,c|=c>>1,c|=c>>2,c|=c>>4,c=(c|c>>8)>>1|65535,16777216<c&&(c>>=1),d._hashMask=c,++c,c+=d.kFixHashSize);c!=d._hashSizeSum&&(d._hash=m(d._hashSizeSum=c))}b._dictionarySizePrev=b._dictionarySize;b._numFastBytesPrev=b._numFastBytes}b._rangeEncoder.Stream=e;b._state=0;for(e=b._previousByte=0;4>e;++e)b._repDistances[e]=",
"0;e=b._rangeEncoder;e._position=H;e.Low=H;e.Range=-1;e._cacheSize=1;e._cache=0;x(b._isMatch);x(b._isRep0Long);x(b._isRep);x(b._isRepG0);x(b._isRepG1);x(b._isRepG2);x(b._posEncoders);e=b._literalEncoder;f=1<<e.m_NumPrevBits+e.m_NumPosBits;for(d=0;d<f;++d)x(e.m_Coders[d].m_Encoders);for(e=0;4>e;++e)x(b._posSlotEncoder[e].Models);Ba(b._lenEncoder,1<<b._posStateBits);Ba(b._repMatchLenEncoder,1<<b._posStateBits);x(b._posAlignEncoder.Models);b._longestMatchWasFound=0;b._optimumEndIndex=0;b._optimumCurrentIndex=",
"0;b._additionalOffset=0;Ca(b);Da(b);b._lenEncoder._tableSize=b._numFastBytes+1-2;Ea(b._lenEncoder,1<<b._posStateBits);b._repMatchLenEncoder._tableSize=b._numFastBytes+1-2;Ea(b._repMatchLenEncoder,1<<b._posStateBits);b.nowPos64=H;void 0;e={};e.encoder=b;e.decoder=null;e.alive=1;a.chunker=e;return a}function Fa(a,b){a.output=ya({});var c=xa({},b),d=a.output,e='',f,h=[];for(f=0;5>f;++f){var g=N(c);if(-1==g)throw Error('truncated input');h[f]=g<<24>>24}var k={m_OutWindow:{},m_RangeDecoder:{}};k.m_IsMatchDecoders=",
"m(192);k.m_IsRepDecoders=m(12);k.m_IsRepG0Decoders=m(12);k.m_IsRepG1Decoders=m(12);k.m_IsRepG2Decoders=m(12);k.m_IsRep0LongDecoders=m(192);k.m_PosSlotDecoder=m(4);k.m_PosDecoders=m(114);k.m_PosAlignDecoder=U({},4);k.m_LenDecoder=Ga({});k.m_RepLenDecoder=Ga({});k.m_LiteralDecoder={};for(f=0;4>f;++f)k.m_PosSlotDecoder[f]=U({},6);var l;if(5>h.length)f=0;else{var q=h[0]&255;g=~~(q/9);for(l=f=0;4>l;++l)f+=(h[1+l]&255)<<8*l;if(!(h=99999999<f)){q%=9;l=g%5;h=~~(g/5);if(8<q||4<l||4<h)h=0;else{g=k.m_LiteralDecoder;",
"if(null==g.m_Coders||g.m_NumPrevBits!=q||g.m_NumPosBits!=l)for(g.m_NumPosBits=l,g.m_PosMask=(1<<l)-1,g.m_NumPrevBits=q,l=1<<g.m_NumPrevBits+g.m_NumPosBits,g.m_Coders=m(l),q=0;q<l;++q){var n=g.m_Coders,I=q,da={};da.m_Decoders=m(768);n[I]=da}h=1<<h;Ha(k.m_LenDecoder,h);Ha(k.m_RepLenDecoder,h);k.m_PosStateMask=h-1;h=1}h=!h}if(h)f=0;else if(0>f)f=0;else{if(k.m_DictionarySize!=f){k.m_DictionarySize=f;k.m_DictionarySizeCheck=Math.max(k.m_DictionarySize,1);f=k.m_OutWindow;h=Math.max(k.m_DictionarySizeCheck,",
"4096);if(null==f._buffer||f._windowSize!=h)f._buffer=m(h);f._windowSize=h;f._pos=0;f._streamPos=0}f=1}}if(!f)throw Error('corrupted input');for(f=0;64>f;f+=8){g=N(c);if(-1==g)throw Error('truncated input');g=g.toString(16);1==g.length&&(g='0'+g);e=g+''+e}/^0+$|^f+$/i.test(e)?a.length_0=ca:(e=parseInt(e,16),a.length_0=4294967295<e?ca:K(e));e=a.length_0;k.m_RangeDecoder.Stream=c;c=k.m_OutWindow;V(c);c._stream=null;k.m_OutWindow._stream=d;k.m_OutWindow._streamPos=0;k.m_OutWindow._pos=0;x(k.m_IsMatchDecoders);",
"x(k.m_IsRep0LongDecoders);x(k.m_IsRepDecoders);x(k.m_IsRepG0Decoders);x(k.m_IsRepG1Decoders);x(k.m_IsRepG2Decoders);x(k.m_PosDecoders);d=k.m_LiteralDecoder;f=1<<d.m_NumPrevBits+d.m_NumPosBits;for(c=0;c<f;++c)x(d.m_Coders[c].m_Decoders);for(d=0;4>d;++d)x(k.m_PosSlotDecoder[d].Models);Ia(k.m_LenDecoder);Ia(k.m_RepLenDecoder);x(k.m_PosAlignDecoder.Models);d=k.m_RangeDecoder;d.Code=0;d.Range=-1;for(c=0;5>c;++c)d.Code=d.Code<<8|N(d.Stream);k.state=0;k.rep0=0;k.rep1=0;k.rep2=0;k.rep3=0;k.outSize=e;k.nowPos64=",
"H;k.prevByte=0;d={};d.decoder=k;d.encoder=null;d.alive=1;a.chunker=d;return a}function F(a,b){return a._bufferBase[a._bufferOffset+a._pos+b]}function O(a,b,c,d){a._streamEndWasReached&&a._pos+b+d>a._streamPos&&(d=a._streamPos-(a._pos+b));++c;var e=a._bufferOffset+a._pos+b;for(b=0;b<d&&a._bufferBase[e+b]==a._bufferBase[e+b-c];++b);return b}function W(a){return a._streamPos-a._pos}function Ja(a){if(!a._streamEndWasReached)for(;;){var b=-a._bufferOffset+a._blockSize-a._streamPos;if(!b)break;var c=a._stream;",
"c.pos>=c.count?c=-1:(b=Math.min(b,c.count-c.pos),na(c.buf,c.pos,a._bufferBase,a._bufferOffset+a._streamPos,b),c.pos+=b,c=b);if(-1==c){a._posLimit=a._streamPos;c=a._bufferOffset+a._posLimit;c>a._pointerToLastSafePosition&&(a._posLimit=a._pointerToLastSafePosition-a._bufferOffset);a._streamEndWasReached=1;break}a._streamPos+=c;a._streamPos>=a._pos+a._keepSizeAfter&&(a._posLimit=a._streamPos-a._keepSizeAfter)}}function Ka(a,b){a._bufferOffset+=b;a._posLimit-=b;a._pos-=b;a._streamPos-=b}function ea(a){++a._cyclicBufferPos>=",
"a._cyclicBufferSize&&(a._cyclicBufferPos=0);++a._pos;if(a._pos>a._posLimit){var b=a._bufferOffset+a._pos;if(b>a._pointerToLastSafePosition){var c=a._bufferOffset+a._pos-a._keepSizeBefore;0<c&&--c;var d=a._bufferOffset+a._streamPos-c;for(b=0;b<d;++b)a._bufferBase[b]=a._bufferBase[c+b];a._bufferOffset-=c}Ja(a)}1073741823==a._pos&&(b=a._pos-a._cyclicBufferSize,La(a._son,2*a._cyclicBufferSize,b),La(a._hash,a._hashSizeSum,b),Ka(a,b))}function La(a,b,c){var d;for(d=0;d<b;++d){var e=a[d]||0;e=e<=c?0:e-c;",
"a[d]=e}}function Ma(a,b){var c;do{if(a._pos+a._matchMaxLen<=a._streamPos)var d=a._matchMaxLen;else if(d=a._streamPos-a._pos,d<a.kMinMatchCheck){ea(a);continue}var e=a._pos>a._cyclicBufferSize?a._pos-a._cyclicBufferSize:0;var f=a._bufferOffset+a._pos;if(a.HASH_ARRAY){var h=fa[a._bufferBase[f]&255]^a._bufferBase[f+1]&255;var g=h&1023;a._hash[g]=a._pos;h^=(a._bufferBase[f+2]&255)<<8;g=h&65535;a._hash[1024+g]=a._pos;g=(h^fa[a._bufferBase[f+3]&255]<<5)&a._hashMask}else g=a._bufferBase[f]&255^(a._bufferBase[f+",
"1]&255)<<8;h=a._hash[a.kFixHashSize+g];a._hash[a.kFixHashSize+g]=a._pos;var k=(a._cyclicBufferPos<<1)+1;var l=a._cyclicBufferPos<<1;var q=c=a.kNumHashDirectBytes;for(g=a._cutValue;;){if(h<=e||0==g--){a._son[k]=a._son[l]=0;break}var n=a._pos-h;n=(n<=a._cyclicBufferPos?a._cyclicBufferPos-n:a._cyclicBufferPos-n+a._cyclicBufferSize)<<1;var I=a._bufferOffset+h;var m=q<c?q:c;if(a._bufferBase[I+m]==a._bufferBase[f+m]){for(;++m!=d&&a._bufferBase[I+m]==a._bufferBase[f+m];);if(m==d){a._son[l]=a._son[n];a._son[k]=",
"a._son[n+1];break}}(a._bufferBase[I+m]&255)<(a._bufferBase[f+m]&255)?(a._son[l]=h,l=n+1,h=a._son[l],c=m):(a._son[k]=h,k=n,h=a._son[k],q=m)}ea(a)}while(0!=--b)}function V(a){var b=a._pos-a._streamPos;if(b){var c=a._stream;na(a._buffer,a._streamPos,c.buf,c.count,b);c.count+=b;a._pos>=a._windowSize&&(a._pos=0);a._streamPos=a._pos}}function Na(a,b){var c=a._pos-b-1;0>c&&(c+=a._windowSize);return a._buffer[c]}function ha(a){a-=2;return 4>a?a:3}function L(a){return 4>a?0:10>a?a-3:a-6}function ia(a){if(!a.alive)throw Error('bad state');",
"if(a.encoder){a:{var b=a.encoder,c=a.encoder.processedInSize,d=a.encoder.processedOutSize,e=a.encoder.finished,f;c[0]=H;d[0]=H;e[0]=1;if(b._inStream){b._matchFinder._stream=b._inStream;var h=b._matchFinder;h._bufferOffset=0;h._pos=0;h._streamPos=0;h._streamEndWasReached=0;Ja(h);h._cyclicBufferPos=0;Ka(h,-1);b._needReleaseMFStream=1;b._inStream=null}if(!b._finished){b._finished=1;var g=h=b.nowPos64;if(g[0]==H[0]&&g[1]==H[1]){if(!W(b._matchFinder)){oa(b,E(b.nowPos64));break a}pa(b);var k=E(b.nowPos64)&",
"b._posStateMask;t(b._rangeEncoder,b._isMatch,(b._state<<4)+k,0);b._state=L(b._state);var l=F(b._matchFinder,-b._additionalOffset);Oa(P(b._literalEncoder,E(b.nowPos64),b._previousByte),b._rangeEncoder,l);b._previousByte=l;--b._additionalOffset;b.nowPos64=J(b.nowPos64,Pa)}if(W(b._matchFinder))for(;;){g=$a(b,E(b.nowPos64));l=b.backRes;k=E(b.nowPos64)&b._posStateMask;var q=(b._state<<4)+k;if(1==g&&-1==l){t(b._rangeEncoder,b._isMatch,q,0);l=F(b._matchFinder,-b._additionalOffset);q=P(b._literalEncoder,",
"E(b.nowPos64),b._previousByte);if(7>b._state)Oa(q,b._rangeEncoder,l);else{var n=F(b._matchFinder,-b._repDistances[0]-1-b._additionalOffset);var I;k=b._rangeEncoder;var m=n,r=l,w=I=1;for(f=7;0<=f;--f){var v=r>>f&1;n=w;I&&(I=m>>f&1,n+=1+I<<8,I=I==v);t(k,q.m_Encoders,n,v);w=w<<1|v}}b._previousByte=l;b._state=L(b._state)}else{t(b._rangeEncoder,b._isMatch,q,1);if(4>l){if(t(b._rangeEncoder,b._isRep,b._state,1),l?(t(b._rangeEncoder,b._isRepG0,b._state,1),1==l?t(b._rangeEncoder,b._isRepG1,b._state,0):(t(b._rangeEncoder,",
"b._isRepG1,b._state,1),t(b._rangeEncoder,b._isRepG2,b._state,l-2))):(t(b._rangeEncoder,b._isRepG0,b._state,0),1==g?t(b._rangeEncoder,b._isRep0Long,q,0):t(b._rangeEncoder,b._isRep0Long,q,1)),1==g?b._state=7>b._state?9:11:(qa(b._repMatchLenEncoder,b._rangeEncoder,g-2,k),b._state=7>b._state?8:11),q=b._repDistances[l],0!=l){for(;1<=l;--l)b._repDistances[l]=b._repDistances[l-1];b._repDistances[0]=q}}else{t(b._rangeEncoder,b._isRep,b._state,0);b._state=7>b._state?7:10;qa(b._lenEncoder,b._rangeEncoder,g-",
"2,k);l-=4;k=ra(l);q=ha(g);X(b._posSlotEncoder[q],b._rangeEncoder,k);if(4<=k)if(f=(k>>1)-1,n=(2|k&1)<<f,v=l-n,14>k)for(q=b._posEncoders,k=n-k-1,n=b._rangeEncoder,r=v,w=1,v=0;v<f;++v)m=r&1,t(n,q,k+w,m),w=w<<1|m,r>>=1;else Qa(b._rangeEncoder,v>>4,f-4),Ra(b._posAlignEncoder,b._rangeEncoder,v&15),++b._alignPriceCount;q=l;for(l=3;1<=l;--l)b._repDistances[l]=b._repDistances[l-1];b._repDistances[0]=q;++b._matchPriceCount}b._previousByte=F(b._matchFinder,g-1-b._additionalOffset)}b._additionalOffset-=g;b.nowPos64=",
"J(b.nowPos64,K(g));if(!b._additionalOffset){128<=b._matchPriceCount&&Ca(b);16<=b._alignPriceCount&&Da(b);c[0]=b.nowPos64;g=b._rangeEncoder;g=J(J(K(g._cacheSize),g._position),[4,0]);d[0]=g;if(!W(b._matchFinder)){oa(b,E(b.nowPos64));break}g=b.nowPos64;g=Z(g[0]-h[0],g[1]-h[1]);if(0<=M(g,[4096,0])){b._finished=0;e[0]=0;break}}}else oa(b,E(b.nowPos64))}}a.inBytesProcessed=a.encoder.processedInSize[0];a.encoder.finished[0]&&(b=a.encoder,Sa(b),b._rangeEncoder.Stream=null,a.alive=0)}else{a:{b=a.decoder;e=",
"E(b.nowPos64)&b.m_PosStateMask;if(G(b.m_RangeDecoder,b.m_IsMatchDecoders,(b.state<<4)+e)){if(G(b.m_RangeDecoder,b.m_IsRepDecoders,b.state))c=0,G(b.m_RangeDecoder,b.m_IsRepG0Decoders,b.state)?(G(b.m_RangeDecoder,b.m_IsRepG1Decoders,b.state)?(G(b.m_RangeDecoder,b.m_IsRepG2Decoders,b.state)?(d=b.rep3,b.rep3=b.rep2):d=b.rep2,b.rep2=b.rep1):d=b.rep1,b.rep1=b.rep0,b.rep0=d):G(b.m_RangeDecoder,b.m_IsRep0LongDecoders,(b.state<<4)+e)||(b.state=7>b.state?9:11,c=1),c||(c=Ta(b.m_RepLenDecoder,b.m_RangeDecoder,",
"e)+2,b.state=7>b.state?8:11);else if(b.rep3=b.rep2,b.rep2=b.rep1,b.rep1=b.rep0,c=2+Ta(b.m_LenDecoder,b.m_RangeDecoder,e),b.state=7>b.state?7:10,g=ja(b.m_PosSlotDecoder[ha(c)],b.m_RangeDecoder),4<=g)if(d=(g>>1)-1,b.rep0=(2|g&1)<<d,14>g){e=b.rep0;h=b.m_PosDecoders;g=b.rep0-g-1;l=b.m_RangeDecoder;n=1;for(k=f=0;k<d;++k)q=G(l,h,g+n),n<<=1,n+=q,f|=q<<k;b.rep0=e+f}else{e=b.rep0;h=b.m_RangeDecoder;g=0;for(d-=4;0!=d;--d)h.Range>>>=1,l=h.Code-h.Range>>>31,h.Code-=h.Range&l-1,g=g<<1|1-l,h.Range&-16777216||(h.Code=",
"h.Code<<8|N(h.Stream),h.Range<<=8);b.rep0=e+(g<<4);d=b.rep0;e=b.m_PosAlignDecoder;h=b.m_RangeDecoder;q=1;for(l=k=0;l<e.NumBitLevels;++l)g=G(h,e.Models,q),q<<=1,q+=g,k|=g<<l;b.rep0=d+k;if(0>b.rep0){b=-1==b.rep0?1:-1;break a}}else b.rep0=g;if(0<=M(K(b.rep0),b.nowPos64)||b.rep0>=b.m_DictionarySizeCheck){b=-1;break a}d=b.m_OutWindow;e=c;h=d._pos-b.rep0-1;for(0>h&&(h+=d._windowSize);0!=e;--e)h>=d._windowSize&&(h=0),d._buffer[d._pos++]=d._buffer[h++],d._pos>=d._windowSize&&V(d);b.nowPos64=J(b.nowPos64,",
"K(c));b.prevByte=Na(b.m_OutWindow,0)}else{c=b.m_LiteralDecoder;d=E(b.nowPos64);c=c.m_Coders[((d&c.m_PosMask)<<c.m_NumPrevBits)+((b.prevByte&255)>>>8-c.m_NumPrevBits)];if(7>b.state){d=b.m_RangeDecoder;e=1;do e=e<<1|G(d,c.m_Decoders,e);while(256>e);b.prevByte=e<<24>>24}else{d=b.m_RangeDecoder;e=Na(b.m_OutWindow,b.rep0);l=1;do if(g=e>>7&1,e<<=1,h=G(d,c.m_Decoders,(1+g<<8)+l),l=l<<1|h,g!=h){for(;256>l;)l=l<<1|G(d,c.m_Decoders,l);break}while(256>l);b.prevByte=l<<24>>24}c=b.m_OutWindow;d=b.prevByte;c._buffer[c._pos++]=",
"d;c._pos>=c._windowSize&&V(c);b.state=L(b.state);b.nowPos64=J(b.nowPos64,Pa)}b=0}if(-1==b)throw Error('corrupted input');a.inBytesProcessed=ca;a.outBytesProcessed=a.decoder.nowPos64;if(b||0<=M(a.decoder.outSize,H)&&0<=M(a.decoder.nowPos64,a.decoder.outSize))V(a.decoder.m_OutWindow),b=a.decoder.m_OutWindow,V(b),b._stream=null,a.decoder.m_RangeDecoder.Stream=null,a.alive=0}return a.alive}function Ha(a,b){for(;a.m_NumPosStates<b;++a.m_NumPosStates)a.m_LowCoder[a.m_NumPosStates]=U({},3),a.m_MidCoder[a.m_NumPosStates]=",
"U({},3)}function Ta(a,b,c){if(!G(b,a.m_Choice,0))return ja(a.m_LowCoder[c],b);var d=8;return d=G(b,a.m_Choice,1)?d+(8+ja(a.m_HighCoder,b)):d+ja(a.m_MidCoder[c],b)}function Ga(a){a.m_Choice=m(2);a.m_LowCoder=m(16);a.m_MidCoder=m(16);a.m_HighCoder=U({},8);a.m_NumPosStates=0;return a}function Ia(a){x(a.m_Choice);for(var b=0;b<a.m_NumPosStates;++b)x(a.m_LowCoder[b].Models),x(a.m_MidCoder[b].Models);x(a.m_HighCoder.Models)}function Ua(a,b){a._optimumEndIndex=b;var c=a._optimum[b].PosPrev;var d=a._optimum[b].BackPrev;",
"do{if(a._optimum[b].Prev1IsChar){var e=a._optimum[c];e.BackPrev=-1;e.Prev1IsChar=0;a._optimum[c].PosPrev=c-1;a._optimum[b].Prev2&&(a._optimum[c-1].Prev1IsChar=0,a._optimum[c-1].PosPrev=a._optimum[b].PosPrev2,a._optimum[c-1].BackPrev=a._optimum[b].BackPrev2)}var f=c;e=d;d=a._optimum[f].BackPrev;c=a._optimum[f].PosPrev;a._optimum[f].BackPrev=e;a._optimum[f].PosPrev=b;b=f}while(0<b);a.backRes=a._optimum[0].BackPrev;a._optimumCurrentIndex=a._optimum[0].PosPrev;return a._optimumCurrentIndex}function Da(a){for(var b=",
"0;16>b;++b){var c=a._alignPrices,d=b,e,f=a._posAlignEncoder,h=b,g=1,k=0;for(e=f.NumBitLevels;0!=e;--e){var l=h&1;h>>>=1;k+=Y(f.Models[g],l);g=g<<1|l}c[d]=k}a._alignPriceCount=0}function Ca(a){var b;for(b=4;128>b;++b){var c=ra(b);var d=(c>>1)-1;var e=(2|c&1)<<d;var f=a.tempPrices;for(var h=b,g,k=b-e,l=1,q=0;0!=d;--d)g=k&1,k>>>=1,q+=z[((a._posEncoders[e-c-1+l]-g^-g)&2047)>>>2],l=l<<1|g;f[h]=q}for(e=0;4>e;++e){b=a._posSlotEncoder[e];f=e<<6;for(c=0;c<a._distTableSize;++c)a._posSlotPrices[f+c]=ka(b,c);",
"for(c=14;c<a._distTableSize;++c)a._posSlotPrices[f+c]+=(c>>1)-1-4<<6;c=128*e;for(b=0;4>b;++b)a._distancesPrices[c+b]=a._posSlotPrices[f+b];for(;128>b;++b)a._distancesPrices[c+b]=a._posSlotPrices[f+ra(b)]+a.tempPrices[b]}a._matchPriceCount=0}function oa(a,b){Sa(a);var c=b&a._posStateMask;a._writeEndMark&&(t(a._rangeEncoder,a._isMatch,(a._state<<4)+c,1),t(a._rangeEncoder,a._isRep,a._state,0),a._state=7>a._state?7:10,qa(a._lenEncoder,a._rangeEncoder,0,c),c=ha(2),X(a._posSlotEncoder[c],a._rangeEncoder,",
"63),Qa(a._rangeEncoder,67108863,26),Ra(a._posAlignEncoder,a._rangeEncoder,15));for(c=0;5>c;++c)sa(a._rangeEncoder)}function $a(a,b){var c,d,e,f,h,g,k,l;if(a._optimumEndIndex!=a._optimumCurrentIndex){var q=a._optimum[a._optimumCurrentIndex].PosPrev-a._optimumCurrentIndex;a.backRes=a._optimum[a._optimumCurrentIndex].BackPrev;a._optimumCurrentIndex=a._optimum[a._optimumCurrentIndex].PosPrev;return q}a._optimumCurrentIndex=a._optimumEndIndex=0;if(a._longestMatchWasFound){var n=a._longestMatchLength;a._longestMatchWasFound=",
"0}else n=pa(a);q=a._numDistancePairs;var m=W(a._matchFinder)+1;if(2>m)return a.backRes=-1,1;for(c=d=0;4>c;++c)a.reps[c]=a._repDistances[c],a.repLens[c]=O(a._matchFinder,-1,a.reps[c],273),a.repLens[c]>a.repLens[d]&&(d=c);if(a.repLens[d]>=a._numFastBytes){a.backRes=d;q=a.repLens[d];var x=q-1;0<x&&(Ma(a._matchFinder,x),a._additionalOffset+=x);return q}if(n>=a._numFastBytes)return a.backRes=a._matchDistances[q-1]+4,q=n-1,0<q&&(Ma(a._matchFinder,q),a._additionalOffset+=q),n;var r=F(a._matchFinder,-1);",
"var w=F(a._matchFinder,-a._repDistances[0]-1-1);if(2>n&&r!=w&&2>a.repLens[d])return a.backRes=-1,1;a._optimum[0].State=a._state;var v=b&a._posStateMask;a._optimum[1].Price=z[a._isMatch[(a._state<<4)+v]>>>2]+la(P(a._literalEncoder,b,a._previousByte),7<=a._state,w,r);var u=a._optimum[1];u.BackPrev=-1;u.Prev1IsChar=0;u=z[2048-a._isMatch[(a._state<<4)+v]>>>2];var A=u+z[2048-a._isRep[a._state]>>>2];if(w==r){c=a._state;var t=A+(z[a._isRepG0[c]>>>2]+z[a._isRep0Long[(c<<4)+v]>>>2]);t<a._optimum[1].Price&&",
"(a._optimum[1].Price=t,c=a._optimum[1],c.BackPrev=0,c.Prev1IsChar=0)}d=n>=a.repLens[d]?n:a.repLens[d];if(2>d)return a.backRes=a._optimum[1].BackPrev,1;a._optimum[1].PosPrev=0;a._optimum[0].Backs0=a.reps[0];a._optimum[0].Backs1=a.reps[1];a._optimum[0].Backs2=a.reps[2];a._optimum[0].Backs3=a.reps[3];c=d;do a._optimum[c--].Price=268435455;while(2<=c);for(c=0;4>c;++c)if(t=a.repLens[c],!(2>t)){var D=A+Q(a,c,a._state,v);do{var y=D+a._repMatchLenEncoder._prices[272*v+(t-2)];var p=a._optimum[t];y<p.Price&&",
"(p.Price=y,p.PosPrev=0,p.BackPrev=c,p.Prev1IsChar=0)}while(2<=--t)}u+=z[a._isRep[a._state]>>>2];c=2<=a.repLens[0]?a.repLens[0]+1:2;if(c<=n){for(A=0;c>a._matchDistances[A];)A+=2;for(;n=a._matchDistances[A+1],y=u+Va(a,n,c,v),p=a._optimum[c],y<p.Price&&(p.Price=y,p.PosPrev=0,p.BackPrev=n+4,p.Prev1IsChar=0),c!=a._matchDistances[A]||(A+=2,A!=q);++c);}for(n=0;;){++n;if(n==d)return Ua(a,n);D=pa(a);q=a._numDistancePairs;if(D>=a._numFastBytes)return a._longestMatchLength=D,a._longestMatchWasFound=1,Ua(a,n);",
"++b;u=a._optimum[n].PosPrev;a._optimum[n].Prev1IsChar?(--u,a._optimum[n].Prev2?(c=a._optimum[a._optimum[n].PosPrev2].State,c=4>a._optimum[n].BackPrev2?7>c?8:11:7>c?7:10):c=a._optimum[u].State,c=L(c)):c=a._optimum[u].State;u==n-1?c=a._optimum[n].BackPrev?L(c):7>c?9:11:(a._optimum[n].Prev1IsChar&&a._optimum[n].Prev2?(u=a._optimum[n].PosPrev2,v=a._optimum[n].BackPrev2,c=7>c?8:11):(v=a._optimum[n].BackPrev,c=4>v?7>c?8:11:7>c?7:10),u=a._optimum[u],4>v?v?1==v?(a.reps[0]=u.Backs1,a.reps[1]=u.Backs0,a.reps[2]=",
"u.Backs2,a.reps[3]=u.Backs3):2==v?(a.reps[0]=u.Backs2,a.reps[1]=u.Backs0,a.reps[2]=u.Backs1,a.reps[3]=u.Backs3):(a.reps[0]=u.Backs3,a.reps[1]=u.Backs0,a.reps[2]=u.Backs1,a.reps[3]=u.Backs2):(a.reps[0]=u.Backs0,a.reps[1]=u.Backs1,a.reps[2]=u.Backs2,a.reps[3]=u.Backs3):(a.reps[0]=v-4,a.reps[1]=u.Backs0,a.reps[2]=u.Backs1,a.reps[3]=u.Backs2));a._optimum[n].State=c;a._optimum[n].Backs0=a.reps[0];a._optimum[n].Backs1=a.reps[1];a._optimum[n].Backs2=a.reps[2];a._optimum[n].Backs3=a.reps[3];u=a._optimum[n].Price;",
"r=F(a._matchFinder,-1);w=F(a._matchFinder,-a.reps[0]-1-1);v=b&a._posStateMask;y=u+z[a._isMatch[(c<<4)+v]>>>2]+la(P(a._literalEncoder,b,F(a._matchFinder,-2)),7<=c,w,r);m=a._optimum[n+1];p=0;y<m.Price&&(m.Price=y,m.PosPrev=n,m.BackPrev=-1,m.Prev1IsChar=0,p=1);u+=z[2048-a._isMatch[(c<<4)+v]>>>2];A=u+z[2048-a._isRep[c]>>>2];w!=r||m.PosPrev<n&&!m.BackPrev||(t=A+(z[a._isRepG0[c]>>>2]+z[a._isRep0Long[(c<<4)+v]>>>2]),t<=m.Price&&(m.Price=t,m.PosPrev=n,m.BackPrev=0,m.Prev1IsChar=0,p=1));t=W(a._matchFinder)+",
"1;m=t=4095-n<t?4095-n:t;if(!(2>m)){m>a._numFastBytes&&(m=a._numFastBytes);if(!p&&w!=r&&(p=Math.min(t-1,a._numFastBytes),p=O(a._matchFinder,0,a.reps[0],p),2<=p)){var B=L(c);var C=b+1&a._posStateMask;y=y+z[2048-a._isMatch[(B<<4)+C]>>>2]+z[2048-a._isRep[B]>>>2];for(e=n+1+p;d<e;)a._optimum[++d].Price=268435455;y+=(x=a._repMatchLenEncoder._prices[272*C+(p-2)],x+Q(a,0,B,C));p=a._optimum[e];y<p.Price&&(p.Price=y,p.PosPrev=n+1,p.BackPrev=0,p.Prev1IsChar=1,p.Prev2=0)}w=2;for(f=0;4>f;++f)if(r=O(a._matchFinder,",
"-1,a.reps[f],m),!(2>r)){C=r;do{for(;d<n+r;)a._optimum[++d].Price=268435455;y=A+(h=a._repMatchLenEncoder._prices[272*v+(r-2)],h+Q(a,f,c,v));p=a._optimum[n+r];y<p.Price&&(p.Price=y,p.PosPrev=n,p.BackPrev=f,p.Prev1IsChar=0)}while(2<=--r);r=C;f||(w=r+1);if(r<t&&(p=Math.min(t-1-r,a._numFastBytes),p=O(a._matchFinder,r,a.reps[f],p),2<=p)){B=7>c?8:11;C=b+r&a._posStateMask;y=A+(g=a._repMatchLenEncoder._prices[272*v+(r-2)],g+Q(a,f,c,v))+z[a._isMatch[(B<<4)+C]>>>2]+la(P(a._literalEncoder,b+r,F(a._matchFinder,",
"r-1-1)),1,F(a._matchFinder,r-1-(a.reps[f]+1)),F(a._matchFinder,r-1));B=L(B);C=b+r+1&a._posStateMask;y+=z[2048-a._isMatch[(B<<4)+C]>>>2];y+=z[2048-a._isRep[B]>>>2];for(e=r+1+p;d<n+e;)a._optimum[++d].Price=268435455;y+=(k=a._repMatchLenEncoder._prices[272*C+(p-2)],k+Q(a,0,B,C));p=a._optimum[n+e];y<p.Price&&(p.Price=y,p.PosPrev=n+r+1,p.BackPrev=0,p.Prev1IsChar=1,p.Prev2=1,p.PosPrev2=n,p.BackPrev2=f)}}if(D>m){D=m;for(q=0;D>a._matchDistances[q];q+=2);a._matchDistances[q]=D;q+=2}if(D>=w){for(u+=z[a._isRep[c]>>>",
"2];d<n+D;)a._optimum[++d].Price=268435455;for(A=0;w>a._matchDistances[A];)A+=2;for(r=w;;++r)if(D=a._matchDistances[A+1],y=u+Va(a,D,r,v),p=a._optimum[n+r],y<p.Price&&(p.Price=y,p.PosPrev=n,p.BackPrev=D+4,p.Prev1IsChar=0),r==a._matchDistances[A]){if(r<t&&(p=Math.min(t-1-r,a._numFastBytes),p=O(a._matchFinder,r,D,p),2<=p)){B=7>c?7:10;C=b+r&a._posStateMask;y=y+z[a._isMatch[(B<<4)+C]>>>2]+la(P(a._literalEncoder,b+r,F(a._matchFinder,r-1-1)),1,F(a._matchFinder,r-(D+1)-1),F(a._matchFinder,r-1));B=L(B);C=b+",
"r+1&a._posStateMask;y+=z[2048-a._isMatch[(B<<4)+C]>>>2];y+=z[2048-a._isRep[B]>>>2];for(e=r+1+p;d<n+e;)a._optimum[++d].Price=268435455;y+=(l=a._repMatchLenEncoder._prices[272*C+(p-2)],l+Q(a,0,B,C));p=a._optimum[n+e];y<p.Price&&(p.Price=y,p.PosPrev=n+r+1,p.BackPrev=0,p.Prev1IsChar=1,p.Prev2=1,p.PosPrev2=n,p.BackPrev2=D+4)}A+=2;if(A==q)break}}}}}function Va(a,b,c,d){var e=ha(c);if(128>b)b=a._distancesPrices[128*e+b];else{var f=a._posSlotPrices;var h=131072>b?R[b>>6]+12:134217728>b?R[b>>16]+32:R[b>>26]+",
"52;b=f[(e<<6)+h]+a._alignPrices[b&15]}return b+a._lenEncoder._prices[272*d+(c-2)]}function Q(a,b,c,d){if(b){var e=z[2048-a._isRepG0[c]>>>2];1==b?e+=z[a._isRepG1[c]>>>2]:(e+=z[2048-a._isRepG1[c]>>>2],e+=Y(a._isRepG2[c],b-2))}else e=z[a._isRepG0[c]>>>2],e+=z[2048-a._isRep0Long[(c<<4)+d]>>>2];return e}function pa(a){var b=0;a:{var c=a._matchFinder;var d=a._matchDistances,e,f;if(c._pos+c._matchMaxLen<=c._streamPos)var h=c._matchMaxLen;else if(h=c._streamPos-c._pos,h<c.kMinMatchCheck){ea(c);c=0;break a}var g=",
"0;var k=c._pos>c._cyclicBufferSize?c._pos-c._cyclicBufferSize:0;var l=c._bufferOffset+c._pos;var q=1;var n=e=0;if(c.HASH_ARRAY){var m=fa[c._bufferBase[l]&255]^c._bufferBase[l+1]&255;e=m&1023;m^=(c._bufferBase[l+2]&255)<<8;n=m&65535;var t=(m^fa[c._bufferBase[l+3]&255]<<5)&c._hashMask}else t=c._bufferBase[l]&255^(c._bufferBase[l+1]&255)<<8;m=c._hash[c.kFixHashSize+t]||0;if(c.HASH_ARRAY){var r=c._hash[e]||0;var w=c._hash[1024+n]||0;c._hash[e]=c._pos;c._hash[1024+n]=c._pos;r>k&&c._bufferBase[c._bufferOffset+",
"r]==c._bufferBase[l]&&(d[g++]=q=2,d[g++]=c._pos-r-1);w>k&&c._bufferBase[c._bufferOffset+w]==c._bufferBase[l]&&(w==r&&(g-=2),d[g++]=q=3,d[g++]=c._pos-w-1,r=w);0!=g&&r==m&&(g-=2,q=1)}c._hash[c.kFixHashSize+t]=c._pos;var v=(c._cyclicBufferPos<<1)+1;var u=c._cyclicBufferPos<<1;t=f=c.kNumHashDirectBytes;0!=c.kNumHashDirectBytes&&m>k&&c._bufferBase[c._bufferOffset+m+c.kNumHashDirectBytes]!=c._bufferBase[l+c.kNumHashDirectBytes]&&(d[g++]=q=c.kNumHashDirectBytes,d[g++]=c._pos-m-1);for(e=c._cutValue;;){if(m<=",
"k||0==e--){c._son[v]=c._son[u]=0;break}r=c._pos-m;n=(r<=c._cyclicBufferPos?c._cyclicBufferPos-r:c._cyclicBufferPos-r+c._cyclicBufferSize)<<1;var x=c._bufferOffset+m;w=t<f?t:f;if(c._bufferBase[x+w]==c._bufferBase[l+w]){for(;++w!=h&&c._bufferBase[x+w]==c._bufferBase[l+w];);if(q<w&&(d[g++]=q=w,d[g++]=r-1,w==h)){c._son[u]=c._son[n];c._son[v]=c._son[n+1];break}}(c._bufferBase[x+w]&255)<(c._bufferBase[l+w]&255)?(c._son[u]=m,u=n+1,m=c._son[u],f=w):(c._son[v]=m,v=n,m=c._son[v],t=w)}ea(c);c=g}a._numDistancePairs=",
"c;0<a._numDistancePairs&&(b=a._matchDistances[a._numDistancePairs-2],b==a._numFastBytes&&(b+=O(a._matchFinder,b-1,a._matchDistances[a._numDistancePairs-1],273-b)));++a._additionalOffset;return b}function Sa(a){a._matchFinder&&a._needReleaseMFStream&&(a._matchFinder._stream=null,a._needReleaseMFStream=0)}function ra(a){return 2048>a?R[a]:2097152>a?R[a>>10]+20:R[a>>20]+40}function Ba(a,b){x(a._choice);for(var c=0;c<b;++c)x(a._lowCoder[c].Models),x(a._midCoder[c].Models);x(a._highCoder.Models)}function Wa(a,",
"b,c,d,e){var f;var h=z[a._choice[0]>>>2];var g=z[2048-a._choice[0]>>>2];var k=g+z[a._choice[1]>>>2];g+=z[2048-a._choice[1]>>>2];for(f=0;8>f;++f){if(f>=c)return;d[e+f]=h+ka(a._lowCoder[b],f)}for(;16>f;++f){if(f>=c)return;d[e+f]=k+ka(a._midCoder[b],f-8)}for(;f<c;++f)d[e+f]=g+ka(a._highCoder,f-8-8)}function qa(a,b,c,d){8>c?(t(b,a._choice,0,0),X(a._lowCoder[d],b,c)):(c-=8,t(b,a._choice,0,1),8>c?(t(b,a._choice,1,0),X(a._midCoder[d],b,c)):(t(b,a._choice,1,1),X(a._highCoder,b,c-8)));0==--a._counters[d]&&",
"(Wa(a,d,a._tableSize,a._prices,272*d),a._counters[d]=a._tableSize)}function Aa(a){a._choice=m(2);a._lowCoder=m(16);a._midCoder=m(16);a._highCoder=T({},8);for(var b=0;16>b;++b)a._lowCoder[b]=T({},3),a._midCoder[b]=T({},3);a._prices=[];a._counters=[];return a}function Ea(a,b){for(var c=0;c<b;++c)Wa(a,c,a._tableSize,a._prices,272*c),a._counters[c]=a._tableSize}function P(a,b,c){return a.m_Coders[((b&a.m_PosMask)<<a.m_NumPrevBits)+((c&255)>>>8-a.m_NumPrevBits)]}function Oa(a,b,c){var d,e=1;for(d=7;0<=",
"d;--d){var f=c>>d&1;t(b,a.m_Encoders,e,f);e=e<<1|f}}function la(a,b,c,d){var e=1,f=7,h=0;if(b)for(;0<=f;--f){var g=c>>f&1;b=d>>f&1;h+=Y(a.m_Encoders[(1+g<<8)+e],b);e=e<<1|b;if(g!=b){--f;break}}for(;0<=f;--f)b=d>>f&1,h+=Y(a.m_Encoders[e],b),e=e<<1|b;return h}function U(a,b){a.NumBitLevels=b;a.Models=m(1<<b);return a}function ja(a,b){var c,d=1;for(c=a.NumBitLevels;0!=c;--c)d=(d<<1)+G(b,a.Models,d);return d-(1<<a.NumBitLevels)}function T(a,b){a.NumBitLevels=b;a.Models=m(1<<b);return a}function X(a,b,",
"c){var d,e=1;for(d=a.NumBitLevels;0!=d;){--d;var f=c>>>d&1;t(b,a.Models,e,f);e=e<<1|f}}function ka(a,b){var c,d=1,e=0;for(c=a.NumBitLevels;0!=c;){--c;var f=b>>>c&1;e+=Y(a.Models[d],f);d=(d<<1)+f}return e}function Ra(a,b,c){var d,e=1;for(d=0;d<a.NumBitLevels;++d){var f=c&1;t(b,a.Models,e,f);e=e<<1|f;c>>=1}}function G(a,b,c){var d=b[c];var e=(a.Range>>>11)*d;if((a.Code^-2147483648)<(e^-2147483648))return a.Range=e,b[c]=d+(2048-d>>>5)<<16>>16,a.Range&-16777216||(a.Code=a.Code<<8|N(a.Stream),a.Range<<=",
"8),0;a.Range-=e;a.Code-=e;b[c]=d-(d>>>5)<<16>>16;a.Range&-16777216||(a.Code=a.Code<<8|N(a.Stream),a.Range<<=8);return 1}function x(a){for(var b=a.length-1;0<=b;--b)a[b]=1024}function t(a,b,c,d){var e=b[c];var f=(a.Range>>>11)*e;d?(a.Low=J(a.Low,ta(K(f),[4294967295,0])),a.Range-=f,b[c]=e-(e>>>5)<<16>>16):(a.Range=f,b[c]=e+(2048-e>>>5)<<16>>16);a.Range&-16777216||(a.Range<<=8,sa(a))}function Qa(a,b,c){for(--c;0<=c;--c)a.Range>>>=1,1==(b>>>c&1)&&(a.Low=J(a.Low,K(a.Range))),a.Range&-16777216||(a.Range<<=",
"8,sa(a))}function sa(a){var b=a.Low;var c=32;var d=wa(b,c);0>b[1]&&(d=J(d,ua([2,0],63-c)));b=E(d);if(0!=b||0>M(a.Low,[4278190080,0])){a._position=J(a._position,K(a._cacheSize));d=a._cache;do c=a.Stream,d+=b,c.buf[c.count++]=d<<24>>24,d=255;while(0!=--a._cacheSize);a._cache=E(a.Low)>>>24}++a._cacheSize;a.Low=ua(ta(a.Low,[16777215,0]),8)}function Y(a,b){return z[((a-b^-b)&2047)>>>2]}function Xa(a){for(var b=0,c=0,d,e,f,h=a.length,g=[],k=[];b<h;++b,++c){d=a[b]&255;if(d&128)if(192==(d&224)){if(b+1>=h)return a;",
"e=a[++b]&255;if(128!=(e&192))return a;k[c]=(d&31)<<6|e&63}else if(224==(d&240)){if(b+2>=h)return a;e=a[++b]&255;if(128!=(e&192))return a;f=a[++b]&255;if(128!=(f&192))return a;k[c]=(d&15)<<12|(e&63)<<6|f&63}else return a;else{if(!d)return a;k[c]=d}16383==c&&(g.push(String.fromCharCode.apply(String,k)),c=-1)}0<c&&(k.length=c,g.push(String.fromCharCode.apply(String,k)));return g.join('')}function Ya(a){var b=[],c,d=0,e,f=a.length;if('object'==typeof a)return a;for(e=c=0;e<f;++e)b[c++]=a.charCodeAt(e);",
"for(e=0;e<f;++e)a=b[e],1<=a&&127>=a?++d:d=!a||128<=a&&2047>=a?d+2:d+3;c=[];for(e=d=0;e<f;++e)a=b[e],1<=a&&127>=a?c[d++]=a<<24>>24:(!a||128<=a&&2047>=a?c[d++]=(192|a>>6&31)<<24>>24:(c[d++]=(224|a>>12&15)<<24>>24,c[d++]=(128|a>>6&63)<<24>>24),c[d++]=(128|a&63)<<24>>24);return c}function ma(a){return a[1]+a[0]}var S='function'==typeof setImmediate?setImmediate:setTimeout,ca=[4294967295,-4294967296],va=[0,-9223372036854775808],H=[0,0],Pa=[1,0],fa=function(){var a,b,c=[];for(a=0;256>a;++a){var d=a;for(b=",
"0;8>b;++b)d=0!=(d&1)?d>>>1^-306674912:d>>>1;c[a]=d}return c}(),R=function(){var a,b,c=2,d=[0,1];for(b=2;22>b;++b){var e=1<<(b>>1)-1;for(a=0;a<e;++a,++c)d[c]=b<<24>>24}return d}(),z=function(){var a,b,c=[];for(b=8;0<=b;--b){var d=1<<9-b-1;for(a=1<<9-b;d<a;++d)c[d]=(b<<6)+(a-d<<6>>>9-b-1)}return c}(),Za=function(){var a=[{s:16,f:64,m:0},{s:20,f:64,m:0},{s:19,f:64,m:1},{s:20,f:64,m:1},{s:21,f:128,m:1},{s:22,f:128,m:1},{s:23,f:128,m:1},{s:24,f:255,m:1},{s:25,f:255,m:1}];return function(b){return a[b-",
"1]||a[6]}}();'undefined'==typeof onmessage||'undefined'!=typeof window&&'undefined'!=typeof window.document||function(){onmessage=function(a){a&&a.data&&(2==a.data.action?LZMA.decompress(a.data.data,a.data.cbn):1==a.data.action&&LZMA.compress(a.data.data,a.data.mode,a.data.cbn))}}();return{compress:function(a,b,c,d){function e(){try{for(var a,b=(new Date).getTime();ia(f.c.chunker);)if(h=ma(f.c.chunker.inBytesProcessed)/ma(f.c.length_0),200<(new Date).getTime()-b)return d(h),S(e,0),0;d(1);a=ba(f.c.output);",
"S(c.bind(null,a),0)}catch(n){c(null,n)}}var f={},h,g='undefined'==typeof c&&'undefined'==typeof d;if('function'!=typeof c){var k=c;c=d=0}d=d||function(a){'undefined'!=typeof k&&postMessage({action:3,cbn:k,result:a})};c=c||function(a,b){if('undefined'!=typeof k)return postMessage({action:1,cbn:k,result:a,error:b})};if(g){for(f.c=za({},Ya(a),Za(b));ia(f.c.chunker););return ba(f.c.output)}try{f.c=za({},Ya(a),Za(b)),d(0)}catch(l){return c(null,l)}S(e,0)},decompress:function(a,b,c){function d(){try{for(var a,",
"g=0,h=(new Date).getTime();ia(e.d.chunker);)if(0==++g%1E3&&200<(new Date).getTime()-h)return l&&(f=ma(e.d.chunker.decoder.nowPos64)/k,c(f)),S(d,0),0;c(1);a=Xa(ba(e.d.output));S(b.bind(null,a),0)}catch(da){b(null,da)}}var e={},f,h='undefined'==typeof b&&'undefined'==typeof c;if('function'!=typeof b){var g=b;b=c=0}c=c||function(a){'undefined'!=typeof g&&postMessage({action:3,cbn:g,result:l?a:-1})};b=b||function(a,b){if('undefined'!=typeof g)return postMessage({action:2,cbn:g,result:a,error:b})};if(h){for(e.d=",
"Fa({},a);ia(e.d.chunker););return Xa(ba(e.d.output))}try{e.d=Fa({},a);var k=ma(e.d.length_0);var l=-1<k;c(0)}catch(q){return b(null,q)}S(d,0)}}}();this.LZMA=this.LZMA_WORKER=LZMA;"].join("\n");
var blob = new Blob([wsrc], {type: 'application/javascript'});

module.exports = {
    lzma: new LZMA(URL.createObjectURL(blob)),
    btoa: encode,
    atob: decode,
    resolve: resolve,
    rext: rext,
    ext1: ext1,
    ext2: ext2,
    PREFIX: "https://wizgrav.github.io/rayglider/r.html?s=",
    getParameterByName: function(name, search) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(search || location.search);
        return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }
}