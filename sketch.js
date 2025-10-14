// Arctic ice extent melting visualization with Voronoi "ice flakes"

const CANVAS_W = 600;
const CANVAS_H = 700;

// Global vars
let points = [];
let delaunay;
let voronoi;
let polygons = [];

let widthCanvas = CANVAS_W;
let heightCanvas = CANVAS_H;

let recording = false;
let gif = null;
let captureFrames = 0;
let workerBlobUrl = null;
let targetYearIndex = 0;

// --- Year data ---
let years = [
  { year: 1979, extent: 7.051 },
  { year: 1980, extent: 7.138 },
  { year: 1981, extent: 7.302 },
  { year: 1982, extent: 7.395 },
  { year: 1983, extent: 6.805 },
  { year: 1984, extent: 6.698 },
  { year: 1985, extent: 7.411 },
  { year: 1986, extent: 7.279 },
  { year: 1987, extent: 7.369 },
  { year: 1988, extent: 7.008 },
  { year: 1989, extent: 6.143 },
  { year: 1990, extent: 6.473 },
  { year: 1991, extent: 7.474 },
  { year: 1992, extent: 6.397 },
  { year: 1993, extent: 7.138 },
  { year: 1994, extent: 6.08 },
  { year: 1995, extent: 7.583 },
  { year: 1996, extent: 6.686 },
  { year: 1997, extent: 6.536 },
  { year: 1998, extent: 6.117 },
  { year: 1999, extent: 6.246 },
  { year: 2000, extent: 6.732 },
  { year: 2001, extent: 5.827 },
  { year: 2002, extent: 6.116 },
  { year: 2003, extent: 5.984 },
  { year: 2004, extent: 5.504 },
  { year: 2005, extent: 5.862 },
  { year: 2006, extent: 4.267 },
  { year: 2007, extent: 4.687 },
  { year: 2008, extent: 5.262 },
  { year: 2009, extent: 4.865 },
  { year: 2010, extent: 4.561 },
  { year: 2011, extent: 3.566 },
  { year: 2012, extent: 5.208 },
  { year: 2013, extent: 5.22 },
  { year: 2014, extent: 4.616 },
  { year: 2015, extent: 4.528 },
  { year: 2016, extent: 4.822 },
  { year: 2017, extent: 4.785 },
  { year: 2018, extent: 4.364 },
  { year: 2019, extent: 4.001 },
  { year: 2020, extent: 4.952 },
  { year: 2021, extent: 4.897 },
  { year: 2022, extent: 4.381 },
  { year: 2023, extent: 4.351 },
  { year: 2024, extent: 4.351 },
  { year: 2025, extent: 4.351 }
];

let yearIndex = 0;
let transitioning = false;
let transitionProgress = 0;
let transitionDirection = 1;


function setup() {
  createCanvas(widthCanvas, heightCanvas);
  noStroke();

  // Generate random points
  let totalPoints = 100;
  for (let i = 0; i < totalPoints; i++) {
    let x = random(-widthCanvas * 0.2, widthCanvas * 1.2);
    let y = random(-heightCanvas * 0.2, heightCanvas * 0.66);
    points.push([x, y]);
  }

  // Compute Voronoi
  delaunay = d3.Delaunay.from(points);
  voronoi = delaunay.voronoi([0, 0, widthCanvas, heightCanvas]);
  polygons = [];
  for (let i = 0; i < points.length; i++) {
    let cell = voronoi.cellPolygon(i);
    if (cell) polygons.push(cell);
  }

  frameRate(30);

  // --- GIF download button ---
  const btn = createButton('Download GIF');
  btn.position(10, heightCanvas + 10);
  btn.mousePressed(startRecording);

    // initialize target index
  targetYearIndex = yearIndex;

  // Use a DOM keydown listener so arrow keys work reliably even if canvas isn't focused
  window.addEventListener('keydown', function (e) {
    // only respond to left/right arrows
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;

    // prevent page scrolling when using arrows
    e.preventDefault();

    // do nothing if already transitioning
    if (transitioning) return;

    // step = 5 if Ctrl (Windows/Linux) or Cmd (Mac) is held, else 1
    const step = (e.ctrlKey || e.metaKey) ? 5 : 1;

    if (e.key === 'ArrowRight') {
      targetYearIndex = (yearIndex + step) % years.length;
    } else { // ArrowLeft
      targetYearIndex = (yearIndex - step + years.length) % years.length;
    }

    transitioning = true;
    transitionProgress = 0;
  });

}

function draw() {
  background(10, 25, 50);

  // --- handle transition progress toward targetYearIndex ---
  if (transitioning) {
    transitionProgress += 0.07; // adjust speed as desired
    if (transitionProgress >= 1) {
      transitionProgress = 0;
      transitioning = false;
      yearIndex = targetYearIndex; // finalize to target
    }
  }

  // Use targetYearIndex for interpolation so jumps >1 year work
  let nextYearIndex = targetYearIndex;
  let minExtent = 3.5;
  let maxExtent = 7.5;
  let extentCurr = map(years[yearIndex].extent, minExtent, maxExtent, 0.2, 1);
  let extentNext = map(years[nextYearIndex].extent, minExtent, maxExtent, 0.2, 1);
  let extentNorm = lerp(extentCurr, extentNext, transitionProgress);

// Draw Voronoi polygons as ice flakes with subtle texture and highlights
for (let i = 0; i < polygons.length; i++) {
  let poly = polygons[i];
  let Polycenter = centroid(poly);
  if (Polycenter[1] > heightCanvas * 2 / 3) continue;

  // Dynamic scaling and gentle floating
  let noiseTime = frameCount * 0.005;
  let noiseVal = noise(i * 0.3, noiseTime);
  let shrinkScale = extentNorm * map(noiseVal, 0, 1, 0.85, 1);
  let floatX = 2 * sin(frameCount * 0.003 + i);
  let floatY = 1.5 * cos(frameCount * 0.004 + i * 1.5);

  // Simulate light direction from top-left (gives ice flakes a subtle 3D look)
  let light = createVector(-0.5, -0.8).normalize();
  let surfacenormal = createVector(Polycenter[0] - widthCanvas / 2, Polycenter[1] - heightCanvas / 2).normalize();
  let brightness = map(light.dot(surfacenormal), -1, 1, 0.8, 1);
let lightFactor = (light.dot(surfacenormal) + 1) / 2; // normalize 0–1
    lightFactor = pow(lightFactor, 0.8); // soften curve
let lightbrightness = map(lightFactor, 0, 1, 0.85, 1.05);

  // Frosty semi-transparent fill with subtle bluish hue
  fill(180 * brightness, 210 * brightness, 255, 180);

// Edge shimmer outline
stroke(240, 250, 255, 200);
strokeWeight(1.3);

  beginShape();
  for (let j = 0; j < poly.length; j++) {
    let [x, y] = poly[j];
    let jitterMag = map(shrinkScale, 0.2, 1, 3, 0);
    let angle = noise(j * 0.5, i * 0.3, frameCount * 0.01) * TWO_PI * 2;
    let jitterX = jitterMag * cos(angle);
    let jitterY = jitterMag * sin(angle);

    let vx = Polycenter[0] + (x - Polycenter[0]) * shrinkScale + floatX + jitterX;
    let vy = Polycenter[1] + (y - Polycenter[1]) * shrinkScale + floatY + jitterY;

    vertex(vx, vy);
  }
  endShape(CLOSE);

  // Add crystalline edge shimmer
let edgeBrightness = map(noise(i * 0.2, frameCount * 0.01), 0, 1, 180, 255);
stroke(edgeBrightness, edgeBrightness, 255, 180);
strokeWeight(0.8);
noFill();
beginShape();
for (let j = 0; j < poly.length; j++) {
  let [x, y] = poly[j];
  let vx = Polycenter[0] + (x - Polycenter[0]) * shrinkScale;
  let vy = Polycenter[1] + (y - Polycenter[1]) * shrinkScale;
  vertex(vx, vy);
}
endShape(CLOSE);

// --- Crystalline shimmer outline (safe version) ---
push();
noFill();

// Make shimmer color vary subtly per flake
let shimmerHue = map(noise(i * 0.2, frameCount * 0.01), 0, 1, 220, 255);
stroke(shimmerHue, shimmerHue, 255, 180);
strokeWeight(1);
beginShape();

for (let j = 0; j < polygons[i].length; j++) {
  let [x, y] = polygons[i][j];
  let vx = Polycenter[0] + (x - Polycenter[0]) * shrinkScale;
  let vy = Polycenter[1] + (y - Polycenter[1]) * shrinkScale;
  vertex(vx, vy);
}

endShape(CLOSE);
pop();
}


  // --- show year text ---
  fill(255);
  textSize(20);
  textAlign(LEFT, BOTTOM);
  text(years[yearIndex].year, 10, heightCanvas - 10);

  // --- record frames if recording ---
  if (recording) {
    captureIfRecording();
  }
}

// --- GIF recording setup ---
async function startRecording() {
  if (recording) return;

  if (typeof GIF === 'undefined') {
    console.error('gif.js not found. Add <script src="https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js"></script> to your HTML.');
    return;
  }

  try {
    const resp = await fetch('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js');
    const text = await resp.text();
    const blob = new Blob([text], { type: 'application/javascript' });
    if (workerBlobUrl) URL.revokeObjectURL(workerBlobUrl);
    workerBlobUrl = URL.createObjectURL(blob);
  } catch (err) {
    console.error('Could not fetch worker script:', err);
    return;
  }

  gif = new GIF({
    workers: 2,
    quality: 10,
    workerScript: workerBlobUrl,
  });

  gif.on('finished', function (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arctic_ice.gif';
    a.click();
    URL.revokeObjectURL(url);
  });

  captureFrames = 90;
  recording = true;
  console.log('Recording started...');
}

// --- Capture frames while recording ---
function captureIfRecording() {
  if (!recording || !gif) return;

  try {
    gif.addFrame(canvas.elt, { delay: 33, copy: true });
  } catch (err) {
    console.error('Frame capture failed:', err);
    recording = false;
    gif = null;
    return;
  }

  captureFrames--;
  if (captureFrames <= 0) {
    recording = false;
    console.log('Rendering GIF...');
    gif.render();
  }
}

// --- Utility: centroid of polygon ---
function centroid(poly) {
  let xSum = 0;
  let ySum = 0;
  for (let [x, y] of poly) {
    xSum += x;
    ySum += y;
  }
  return [xSum / poly.length, ySum / poly.length];
}
