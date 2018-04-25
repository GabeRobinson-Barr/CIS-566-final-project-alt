import {Audio} from 'three';
import {vec2, vec3} from 'gl-matrix';

class Analyser {
    dims: vec2;
    analyser: AnalyserNode;
    beats: vec3[] = [];
    lastTone: number = -1;
    restTime: number = 100;
    beatFreq: number = 0.25; // Makeshift Difficulty
    score: number = 0;
    guidims: vec2 = vec2.fromValues(0,0); // Size of the gui in the corner so we dont generate beats under it
    beatTime: number = 0; // Length of this note
    timebuffer: number = 0.2; // Time you get before or after clicking a note that still counts

    constructor(node: AnalyserNode, canvasDim: vec2) {
        this.analyser = node;
        this.dims = canvasDim;
    }

    // Note I don't completely understand how this works, but it does pitch detection based on some correlation algorithm of Fast Fourier Transforms
    // from a guy at MIT, found at https://github.com/cwilso/PitchDetect. I used his because I have no idea how to write one myself
    getNote(): number {
        let samplerate = this.analyser.context.sampleRate;
        let bufLength = this.analyser.fftSize;
        let maxsamples = Math.floor(bufLength / 2);
        let dataArray = new Float32Array(bufLength);
        this.analyser.getFloatTimeDomainData(dataArray);
        let best_offset = -1;
        let best_correlation = 0;
        let rms = 0;
        let foundCorrelation = false;
        let correlations: number[] = new Array(maxsamples);

        for (let i = 0; i < bufLength; i++) {
            let v = dataArray[i];
            rms += v * v;
        }
        rms = Math.sqrt(rms / bufLength);
        if (rms < 0.01) { // Silent
            return -1;
        }

        let lastCorrelation = 1;
        for (let offset = 0; offset < maxsamples; offset++) {
            let correlation = 0;

            for (let i = 0; i < maxsamples; i++) {
                correlation += Math.abs(dataArray[i] - dataArray[i + offset]);
            }
            correlation = 1 - (correlation / maxsamples);
            correlations[offset] = correlation; // Store this correlation

            if ((correlation > 0.9) && (correlation > lastCorrelation)) {
                foundCorrelation = true;
                if (correlation > best_correlation) {
                    best_correlation = correlation;
                    best_offset = offset;
                }
            }
            else if (foundCorrelation) {
                let shift = (correlations[best_offset + 1] - correlations[best_offset - 1]) / correlations[best_offset];
                return samplerate / (best_offset + (8 * shift));
            }
            lastCorrelation = correlation;
        }
        if (best_correlation > 0.01) {
            return samplerate / best_offset;
        }
        return -1; // if we got here there is no correlation (noise)

    }

    generateBeat(deltaT: number) {
        let newbeats: vec3[] = [];
        for (let i = 0; i < this.beats.length; i++) { // Update beats and remove expired beats
            let beat = this.beats[i];
            if (beat[0] == -1) { // If this beat is the start of a slide check if the end is stil live
                let endslide = this.beats[i + 1];
                if (endslide[2] - deltaT >= -this.timebuffer) { // If the end of the slide is still live
                    beat[2] -= deltaT;
                    endslide[2] -= deltaT;
                    newbeats.push(beat); // Update both parts of the slide
                    newbeats.push(endslide);
                    i++;
                }
            }
            else if (beat[2] - deltaT >= -this.timebuffer) { // Give a 0.2 grace period for missing beats
                beat[2] -= deltaT;
                newbeats.push(beat);
            }
            else { // If a beat is expired subtract from the score
                this.score -= 100;
            }
        }

        let pitch = this.getNote();
        let newTone = false;
        if (pitch == -1) { // Update the time since the last note
            this.restTime += deltaT;
            newTone = true; // Pauses count as new tones
        }
        else if (this.restTime <= this.beatFreq) {
            this.beatTime += deltaT;
            this.restTime += deltaT;
        }
        else {
            let tonediff = Math.abs(pitch - this.lastTone);
            if (12 * (Math.log(tonediff / 440)/Math.log(2)) <= 1) { // Tones are the same
                if (this.restTime >= 1.5) { // Repeated tone after long pause can start be anywhere
                    let lastbeat = this.beats[this.beats.length - 1];
                    newbeats.push(vec3.fromValues(Math.random() * this.dims[0], Math.random() * this.dims[1], 6));
                }
                else { // If this beat has gone on for less than 1.5 sec
                    this.beatTime += deltaT;
                }
            }
            else { // different tones
                let newbeat: vec3;
                if (this.restTime >= 1.0 || this.beats.length == 0) {
                    newbeat = vec3.fromValues(Math.random() * this.dims[0], Math.random() * this.dims[1], 6);
                }
                else {
                    let lastbeat = this.beats[this.beats.length - 1];
                    newbeat = vec3.fromValues(lastbeat[0] + (Math.random() - 0.5) * 200, lastbeat[1] + (Math.random() - 0.5) * 200, 6);
                }

                newbeat[0] = Math.min(this.dims[0] - 100, Math.max(100, newbeat[0])); // Make sure the beat is on the screen
                newbeat[1] = Math.min(this.dims[1] - 100, Math.max(100, newbeat[1]));
                let guidistx = (this.dims[0] - this.guidims[0]) - newbeat[0];
                let guidisty = (this.dims[1] - this.guidims[1]) - newbeat[1];
                if (guidistx <= 100 && guidisty <= 100) { // Make sure beat isnt behind the gui
                    if (guidistx > guidisty) {
                        newbeat[0] -= Math.min(Math.abs(2 * guidistx) + 100, 150);
                    }
                    else {
                        newbeat[1] -= Math.min(Math.abs(2 * guidisty) + 100, 150);
                    }
                }
                newbeats.push(newbeat);
                newTone = true;
            } // end different tones case
            
            this.restTime = 0;
        }
        if (newTone) { // If we started a newtone
            if (this.lastTone != -1 && this.beatTime > this.beatFreq) {
                let lastbeat = this.beats[this.beats.length - 1];
                if (this.beatTime <= 0.4 || Math.random() < 0.3) { // 0.4 seconds is the shortest a slide can be. 70% chance for a slide when valid

                    let missedbeats = Math.floor((this.beatTime - this.beatFreq) / this.beatFreq); // Number of beats that we didnt generate waiting for the tone to end

                    for (let i = 0; i < missedbeats; i++) { // Add the missed beats in the same location as the last one
                        newbeats.push(vec3.fromValues(lastbeat[0], lastbeat[1], lastbeat[2] + i * this.beatFreq));
                    }
                }
                else { // generate a slide
                    //let slidebeat = vec3.fromValues(-1, 1, lastbeat[2]);
                    let slidebeat = vec3.fromValues(-1, Math.floor(Math.pow(Math.random(), 2) * 2), lastbeat[2]); // X = -1 indicates this should be a slide, Y determines what type/shape
                    lastbeat[0] = Math.min(this.dims[0] - 300, Math.max(300, lastbeat[0])); // Make sure the slide is on the screen
                    lastbeat[1] = Math.min(this.dims[1] - 300, Math.max(300, lastbeat[1]));
                    let guidistx = (this.dims[0] - this.guidims[0]) - lastbeat[0];
                    let guidisty = (this.dims[1] - this.guidims[1]) - lastbeat[1];
                    if (guidistx <= 300 && guidisty <= 300) { // Make sure slide isnt behind the gui
                        if (guidistx > guidisty) {
                            lastbeat[0] -= Math.min(Math.abs(2 * guidistx) + 300, 450);
                        }
                        else {
                            lastbeat[1] -= Math.min(Math.abs(2 * guidisty) + 100, 450);
                        }
                    }

                    lastbeat[2] += this.beatTime; // Update the slide's ending time
                    if (pitch != -1) { // If we already generated a beat this update
                        let beatholder = newbeats.pop(); // pop the generated beat off the top
                        newbeats[newbeats.length - 1] = slidebeat; // Replace lastbeat with the slidebeat
                        newbeats.push(lastbeat);
                        newbeats.push(beatholder); // Push the beats we popped back onto the array
                    }
                    else { // If this pitch was a pause/rest we didnt generate a new beat this turn
                        newbeats[newbeats.length - 1] = slidebeat;
                        newbeats.push(lastbeat);
                    }
                }
            }
            this.beatTime = 0;
        }
        
        this.lastTone = pitch;
        this.beats = newbeats;
    }

    getBeats(): number[] {
        let beatarray: number[] = [];

        for (let i = 0; i < this.beats.length; i++) {
            let beat = this.beats[i];
            if (beat[0] == -1 && beat[2] <= 1) { // Slides should be active in negative time
                beatarray.push(beat[0]);
                beatarray.push(beat[1]);
                beatarray.push(beat[2]);
                let endslide = this.beats[i + 1]; // Also make sure we add the end of the slide
                beatarray.push(endslide[0]);
                beatarray.push(endslide[1]);
                beatarray.push(endslide[2]);
                i++;
            }
            else if (beat[2] >= 0 && beat[2] <= 1) { // If the beat is live add it
                beatarray.push(beat[0]);
                beatarray.push(beat[1]);
                beatarray.push(beat[2]);
            }
        }
        for (let i = this.beats.length; i < 50; i++) { // If we dont fill all 50 spots in the array old beats might not get overwritten
            beatarray.push(0);
            beatarray.push(0);
            beatarray.push(0);
        }
        return beatarray;
    }

    updateScore(clickpos: vec2) { // This function handles updating the score for NON SLIDES ONLY
        if (this.beats.length > 0) {
            if (this.beats[0][2] < 1) { // Cant misclick beats that are not on the screen yet
                let nextbeat = this.beats.shift(); // Remove and return the values for the first beat
                let nexttime = nextbeat[2];

                let dist = vec2.distance(clickpos, vec2.fromValues(nextbeat[0], nextbeat[1]));

                if (nexttime <= this.timebuffer && dist <= 30) { // Add score for a good click
                    this.score += 200 * Math.floor((2 / this.timebuffer) * (this.timebuffer - nexttime)) + 100;
                }
                else if (dist > 30 && dist <= 60) { // -300 for a click outside the beat
                    this.score -= 300;
                }
                else {
                    this.score -= 500; // -500 for a click out of time or a bad misclick
                }
            }
        }
    }

};

export default Analyser;
