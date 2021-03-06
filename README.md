# Rayglider

![El Jardí de Catalunya](./jardi.jpg)

Rayglider attempts to modernize glsl development and provide a powerful medium for artistic expression on the web. 

Every aspect of it is driven and configured directly in the editor utilizing RayGL, a glsl variant that provides a modular shader composition mechanism, asset handling and multi pass setup.

Audio reactivity gets some special love by the [Clubber](https://github.com/wizgrav/clubber) library. High quality modulators that tune to the music can be defined in the editor, also with glsl, and used to drive the visuals.

The editor script can be exported as a long url that should be shortened to store, share and, especially, import in other scripts to reuse parts of and build on top of it. 

The limits on url length effectively contain individual scripts to ~4KB of text each but by importing scripts that import other scripts, shaders of any complexity can be composed. Equally excelent scalability for their distribution is provided by the url shortening services.

## Resources

[RayGL Documentation](./RAYGL.md)

[Core shader lib](./lib/)

## Examples

[Techno Kids](https://tinyurl.com/y8a4wb99)

[El Jardí de Catalunya](https://tinyurl.com/ybgfwulm) - [Article describing the audio reactive technique used](https://medium.com/@wizgrav/music-gradients-6b7177a97b5f)
