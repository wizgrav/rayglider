# RayGL

RayGL makes use of special prefixes and directives that transpile to glsl and setup the multi pass state. THe main script and all dependencies are composed in a single uber shader(Multi pass is controlled with conditional defines and the pass directive). If you want to debug the final glsl output, for now, just make a small typo and click "Apply". The side editor will show the final shader text along with the error message.

All scripts must use "$main(vec4 outputColor, vec3 fragCoords)" as the entry point. The use of the "$" character does the name mangling to prevent conflicts and allow for variable/function reuse in other scripts.

Code modularization is performed with the following directives:


## #import

In a script we define eg a function
```
vec3 $myfunc(float myArg) {
    return vec3(myArg);
}
```

We get the state from the Save link, and short url it to "someUrl"

We can then import it in another script and give it a namespace which we can access with the "@" prefix as follows.
```
#import myModule < http://someUrl >

$main(vec4 outputColor, vec3 fragCoords) 
{
    outputColor.rgb = @myModule.myfunc(123);
}
```

## #export

Scripts can define special placeholders in a global namespace to allow for overridable behavior(or a poor man's callback mechanism):

```
#export a_global_func < vec3 (vec3 col) >
#export a_global_var < vec3 = vec3(0.1, 0.3, 0.2) >
#import GLOBAL <>

vec3 $a_global_func( vec3 col )
{
    return col * @GLOBAL.a_global_var;
}

$main(vec4 outputColor, vec3 fragCoords) 
{
    outputColor.rgb = @GLOBAL.a_global_func(outputColor);
}
```

Functions must be defined in the scripts but variables must not, they will be automatically added on the top of the shader using the configuration.

We then save/short url this script in someUrl and make a new one like:

```
#import myModule <someUrl>
#export a_global_func < vec3 (float myArg) >
#export a_global_var < vec3 = vec3(0.5, 0.2, 0.1) >

vec3 $a_global_func( vec3 col )
{
    return col + @GLOBAL.a_global_var;
}

$main(vec4 outputColor, vec3 fragCoords) 
{
    @myModule.main(outputColor, fragCoords);
}
```

This way we can call code and override parts of it. Check the sdf module in the core lib for a more complex example.

## #image

Fetch and use images from the web in sampler2D uniforms like this:

```
#import IMG < http://imageUrl >

vec4 texel = texture2D(@IMG.tex, uv);
vec4 infor = @IMG.inf.xyzw;
```

The "tex" property is a sampler2D and the inf property the following vec4:

{ x: imageWidth, y: imageHeight, z: 0.0, y:0.0 }

## #cube

Fetch and use cubemaps in samplerCube uniforms. The image url provided must contain all six sides of the cube in 1x6, 6x1, 3x2 or 2x3 arrangement.

```
#import CUBE < http://imageUrl >

vec4 texel = textureCube(@CUBE.tex, dir.xyz);
vec4 infor = @CUBE.inf.xyzw;
```

The "tex" property is a samplerCube and the inf property the following vec4:

{ x: cubeSideWidth, y: cubeSideHeight, z: 0.0, y:0.0 }

## #video
Fetch and use video frames in sampler2D uniforms. Videos are always muted and looping.

```
#import VID < http://videoUrl >

vec4 texel = texture2D(@IMG.tex, dir.xyz);
vec4 infor = @IMG.inf.xyzw;
```

The "tex" property is a sampler2D and the inf property the following vec4:

{ x: imageWidth, y: imageHeight, z: currentTime, y: videoDuration }

## #net
Stream 2D textures from websockets. Servers just have to push arraybuffers of unsigned byte RGBA format prepended by a 2 Uint64s header width with the width and height of the current frame.

```
#import NET < ws://serverUrl >

vec4 texel = texture2D(@NET.tex, dir.xyz);
vec4 infor = @NET.inf.xyzw;
```

The "tex" property is a sampler2D and the inf property the following vec4:

{ x: imageWidth, y: imageHeight, z: lastReceivedFrameTime, y: 0.0 }

## #pass

## #band

## #boom

## #track