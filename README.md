# Rayglider

Rayglider is a glsl sandbox geared for creative coding.

Every aspect of it is driven solely by the editor. In order to provide flexibility it supports RayGL, a glsl variant that utilizes special prefixes and directives to facilitate asset handling, flexible multi pass setup, code modularization and even a (limited) callback mechanism.

The editor text can be exported, compressed, in the form of a long url that should be shortened in order to share and import it in other scripts. The limits on url length effectively contain individual scripts to ~4KB each but that's more than enough thanks to the modularization provided by RayGL. Complex demos can be made without the need for a server backend(Though technically the url shortening services become our backend, har har)

Finally, audio reactivity is provided by the Clubber library in the form of modulators that react to the currently playing music. These are also configured with glsl, but transpiled to js internally, and their values are made accesible in scripts via normalized float uniforms so you can make your demos boom efficiently and effortlessly :)

## Documentation

