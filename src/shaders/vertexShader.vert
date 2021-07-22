#version 300 es

in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;

uniform mat4 matrix;      
//matrix to transform normals
uniform mat4 nMatrix;     
uniform mat4 pMatrix;

out vec3 fs_pos;
out vec3 fs_norm;
out vec2 fs_uv;

void main() {
  fs_norm = mat3(nMatrix) * a_normal; 
  fs_pos = mat3(pMatrix) * a_position;
  fs_uv = a_uv;

  gl_Position = matrix * vec4(a_position, 1.0);
}