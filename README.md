# Rayglider

Rayglider is a glsl sandbox that attempts to modernize glsl coding. 

Every aspect of it is driven solely by the editor via RayGL, a glsl variant that facilitates asset loading handling, multi pass setup, code modularization and even a (limited) callback mechanism. 

Audio reactivity also gets some special love by integrating the Clubber library. High quality modulators can be defined in the editor using glsl and used to drive the visuals. It booms nicely.

The editor source can be exported, in the form of a long url. That should be shortened in order to share and even import it in other scripts. 

The limits on url length effectively contain individual scripts to ~4KB each but that's more than enough thanks to the modularization provided by RayGL. 

Complex demos and prototypes can be composed in this way using the url shortening services as the storage backend. This scheme should scale well :) 

 
