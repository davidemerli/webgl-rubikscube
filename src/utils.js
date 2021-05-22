export async function loadShaders() {
    const vertexShader = await fetch('./src/shaders/vertexShader.vert');
    const fragmentShader = await fetch('./src/shaders/fragmentShader.frag');

    const vs = await vertexShader.text();
    const fs = await fragmentShader.text();

    return [vs, fs];
}
