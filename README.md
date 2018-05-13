# Rayglider

Rayglider is a shader sandbox that attempts to modernize glsl development and provides a platform for spontaneous creative fun. 

Every aspect of it is driven and configured solely by the editor text utilizing RayGL, a glsl variant that facilitates asset loading and handling, multi pass flows as well as a module system and even a (crude) callback mechanism for glsl.

Audio reactivity gets special love from the [Clubber](https://github.com/wizgrav/clubber) library. High quality modulators that tune to the music, not just the sound, can be defined in the editor with glsl and used via uniforms to drive the visuals. Music visualizations are a first class citizen.

For storage purposes, the editor source can be exported, in the form of a long url. That should be shortened in order to save, share and, especially, import in other scripts to reuse and or override parts of it and build on top of it. It's free as it always should be.

The limits on url length effectively contain individual scripts to ~4KB each but that's more than enough with the modularization provided by RayGL. You can import scripts that imports scripts and compose demos and prototypes of any complexity, using the url shortening services as the backend. This scheme is expected to scale really well :) 

 
