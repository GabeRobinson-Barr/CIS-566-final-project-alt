#version 300 es

// This is a fragment shader. If you've opened this file first, please
// open and read lambert.vert.glsl before reading on.
// Unlike the vertex shader, the fragment shader actually does compute
// the shading of geometry. For every pixel in your program's output
// screen, the fragment shader is run for every bit of geometry that
// particular pixel overlaps. By implicitly interpolating the position
// data passed into the fragment shader by the vertex shader, the fragment shader
// can compute what color to apply to its pixel based on things like vertex
// position, light position, and vertex color.
precision highp float;

uniform vec3 u_Beats[50]; // The beats currently on screen in format vec2(position.x, position.y), (time left onscreen)

in vec2 fs_UV;
in vec4 fs_Pos;

out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

float rand(vec2 s) {
    return fract(s.x * sin(s.y * 583.059f) + 3845.159f);
}


int slideCol(vec3 startvec, vec3 endvec, vec2 uv) {

    if (startvec.z > 0.f) {
        float thisdist = distance(vec2(endvec), uv);
        float ringdist = 30.f + startvec.z * 30.f; // Using 30 as the size of a ring
        if (abs(thisdist - ringdist) <= 1.5f) {
            return 2;
        }
    }

    float slidelen = 90.f * ((endvec.z - startvec.z) / 0.4f); // Every 0.4 seconds of slide adds one ball length
    float xdist = clamp((uv.x - endvec.x) / slidelen, 0.f, 1.f);

    if (startvec.y == 0.f) {

        vec2 cent = vec2(endvec.x - slidelen, endvec.y);
        if (startvec.z <= 0.f) {
            float t = 3.1415f * (abs(startvec.z) / (endvec.z - startvec.z)) / 2.f;
            float tx = slidelen * cos(t) + cent.x;
            float ty = slidelen * sin(t) + cent.y;
            if (distance(uv, vec2(tx, ty)) <= 30.f) {
                return 2;
            }
        }

        float xdiff = uv.x - cent.x;
        float ydiff = uv.y - cent.y;
        float angle = atan(ydiff/xdiff);
        float ypos = slidelen * sin(angle) + cent.y;
        float xpos = slidelen * cos(angle) + cent.x;
        if (angle < 0.f || angle > (3.1415f / 2.f)) {
            if (distance(uv, vec2(endvec)) <= 30.f) {
                return 1;
            }
            xpos = slidelen * cos(3.1415f / 2.f) + cent.x;
            ypos = slidelen * sin(3.1415f / 2.f) + cent.y;
            if (distance(uv, vec2(xpos, ypos)) <= 30.f) {
                return 1;
            }
        }

        if (distance(uv, vec2(xpos, ypos)) <= 30.f) {
            return 1;
        }

        return 0;
    }
    if (startvec.y == 1.f) {

        float ypos = (1.1 * (atan((xdist - 0.5f) * 10.f) / 3.1415f) + 0.5) * 30.f + endvec.y;
        if (startvec.z <= 0.f) {
            float t = abs(startvec.z) / (endvec.z - startvec.z);
            float tpos = (1.1 * (atan((t - 0.5f) * 10.f) / 3.1415f) + 0.5) * 30.f + endvec.y;
            if (distance(uv, vec2(endvec.x + (t * slidelen), tpos)) <= 30.f) {
                return 2;
            }
        }
        if (distance(uv, vec2(endvec.x + (xdist * slidelen), ypos)) <= 30.f) {
            return 1;
        }

        return 0;
    }

    return 0;
}

void main()
{
    // Material base color (before shading)
    vec3 backcol = vec3(mod(fs_UV.y, 30.0) / 30.f + cos(fs_UV.x / 10.0));
    vec4 col = vec4(backcol, 1);
    vec3 a = vec3(0.75, 0.0, 0.75);
    vec3 b = vec3(0.5, 0.0, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0, 0.33, 0.67);

    for (int i = 0; i < 50; i++) {
        float test = abs(u_Beats[i].x + 1.f);

        if(test >= 0.0001) { // Not a slide
            if (u_Beats[i].z > 0.0001) { // If there is time left on the beat (eliminates empty beats)
                float thisdist = distance(vec2(u_Beats[i]), fs_UV);
                float ringdist = 30.f + u_Beats[i].z * 30.f; // Using 30 as the size of a ring
                if (abs(thisdist - ringdist) <= 1.5f) {
                    col = vec4(0.2, 0.2, 0.8, 1);
                    break; // break the case
                }
                else if (thisdist <= 30.f) {
                    col = vec4(a + b * cos(2.f * 3.1415 * (c * rand(u_Beats[i].xy) + d)) * (u_Beats[i].z * 2.f), 1);
                    break;
                }
            }
        }

        if(test < 0.0001) {
            int colidx = slideCol(u_Beats[i], u_Beats[i + 1], fs_UV); // Call the function for figuring out slide color
            switch(colidx) {
                case 0 : // No color
                    i++; // Skip the end slide beat
                break;

                case 1 : // Slide color
                    col = vec4(0.2, 0.8, 0.2, 1);
                    i = 50; // Break the while loop
                break;

                case 2 : // Active slide, Ball color
                    col = vec4(0.2, 0.2, 0.8, 1);
                    i = 50; // Break the while loop
                break;
            }
        }

    }

    // Compute final shaded color
    out_Col = col;
    //out_Col = vec4(fs_UV, 0, 1);
}
