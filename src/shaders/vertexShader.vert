#version 300 es

in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;

uniform mat4 matrix; 
uniform mat4 nMatrix;     //matrix to transform normals

out vec3 fs_pos;
out vec3 fs_norm;
out vec2 fs_uv;

void main() {
  fs_pos = mat3(matrix) * a_position;
  fs_norm = mat3(nMatrix) * a_normal; 
  fs_uv = a_uv;

  gl_Position = matrix * vec4(a_position, 1.0);
}