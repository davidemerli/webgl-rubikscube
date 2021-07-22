#version 300 es

precision mediump float;

in vec3 fs_pos;
in vec3 fs_norm;
in vec2 fs_uv;

uniform vec3 mDiffColor; //material diffuse color 

uniform vec3 dirLightDirection; // directional light direction vec
uniform vec3 dirLightColor; // directional light color 
uniform float dirLightGamma; // reflection coefficient

uniform vec3 pointLightPos; // point light position
uniform vec3 pointLightColor; // point light color 


uniform vec3 eyePosition; // observer position

uniform sampler2D u_texture;

out vec4 outColor;

vec3 lambertDiffuse(vec3 lightDir, vec3 normal, vec3 lightColor, vec3 diffuseColor) {
  return lightColor * diffuseColor * clamp(dot(lightDir, normal), 0.0, 1.0);
}

vec3 blinnSpecular(vec3 eyeDir, vec3 normal, vec3 lightDir, float shininess, vec3 diffColor) {
  vec3 halfVector = normalize(lightDir + eyeDir);
  
  return diffColor * clamp(pow(dot(halfVector, normal), shininess), 0.0, 1.0);
}

vec3 pointLightColorWithDecay(vec3 pointLightPos, vec3 pointLightColor, vec3 fs_pos, float target, float decay) {
  return pointLightColor * pow(target / length(pointLightPos - fs_pos), decay);
}

void main() {
  vec3 dirLightDirection = normalize(dirLightDirection);
  vec3 eyeDir = normalize(eyePosition - fs_pos);
  vec3 normal = normalize(fs_norm);
  vec3 pointLightDirection = vec3(normalize(pointLightPos - fs_pos));

  // compute lambert diffuse
  vec3 diffuseA = lambertDiffuse(dirLightDirection, normal, dirLightColor, mDiffColor);

  // compute blinn specular
  vec3 specular = blinnSpecular(eyeDir, normal, dirLightDirection, dirLightGamma, mDiffColor);

  // compute point light
  vec3 pointLightColor = pointLightColorWithDecay(pointLightPos, pointLightColor, fs_pos, 1.0, 0.0);
  vec3 diffuseB = lambertDiffuse(pointLightDirection, normal, pointLightColor, mDiffColor);

  // combine
  vec3 diffuse = diffuseA + diffuseB;
  vec3 color = diffuse + specular;

  outColor = vec4(color, 1.0) * texture(u_texture, fs_uv);
}
