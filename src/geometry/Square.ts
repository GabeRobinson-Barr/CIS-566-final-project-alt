import {vec2, vec3, vec4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';

class Square extends Drawable {
  indices: Uint32Array;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  dims: vec2;

  constructor(scrnDim: vec2) {
    super(); // Call the constructor of the super class. This is required.
    this.dims = scrnDim;
  }

  create() {

  this.indices = new Uint32Array([0, 1, 2,
                                  0, 2, 3]);
  this.normals = new Float32Array([0, 0, 1, 0,
                                   0, 0, 1, 0,
                                   0, 0, 1, 0,
                                   0, 0, 1, 0]);
  this.positions = new Float32Array([-1, -1, 0, 1,
                                     1, -1, 0, 1,
                                     1, 1, 0, 1,
                                     -1, 1, 0, 1]);
  
  this.uvs = new Float32Array([0, 0,
                              this.dims[0], 0,
                              this.dims[0], this.dims[1],
                              0, this.dims[1]]);



    this.generateIdx();
    this.generatePos();
    this.generateUV();

    this.count = this.indices.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufUV);
    gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);

  }
};

export default Square;
