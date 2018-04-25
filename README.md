# CIS-566-2018-final-project-GabeRobinson-Barr

Midpoint Writeup

I have the audio loader working for local files, and the tone analysis algorithm implemented. The tone analysis works reasonably well, but struggles to differentiate between tones in the melody when there is a strong background tone in the music. I don't know if I will be able to end up fixing this as tone analysis is not particularly easy to implement, but I'm looking for better algorithms or techniques.

I have also finished a very basic structure for beat placement, which I am planning to tweak and expand on in the coming week. 

The majority of the relevant code is in Analyser.ts such as the tone analysis algorithm, and the beat generation function.

Here is an image of what it looks like mid song.

![](beatmapimg.png)

The video labeled "midpointdemo" is a 1 minute clip that shows the full program as it is now. 
Warning: It might be loud