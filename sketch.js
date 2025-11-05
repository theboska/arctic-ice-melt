// Arctic ice extent melting visualization with Voronoi "ice flakes"

const CANVAS_W = 550;
const CANVAS_H = 600;

// Global vars
let points = [];
let delaunay;
let voronoi;
let polygons = [];

let widthCanvas = CANVAS_W;
let heightCanvas = CANVAS_H;

// --- Year data ---
let years = [
  { year: 1979, extent: 7.051 },
  { year: 1980, extent: 7.667 },
  { year: 1981, extent: 7.138 },
  { year: 1982, extent: 7.302 },
  { year: 1983, extent: 7.395 },
  { year: 1984, extent: 6.805 },
  { year: 1985, extent: 6.698 },
  { year: 1986, extent: 7.411 },
  { year: 1987, extent: 7.279 },
  { year: 1988, extent: 7.369 },
  { year: 1989, extent: 7.008 },
  { year: 1990, extent: 6.143 },
  { year: 1991, extent: 6.473 },
  { year: 1992, extent: 7.474 },
  { year: 1993, extent: 6.397 },
  { year: 1994, extent: 7.138 },
  { year: 1995, extent: 6.08 },
  { year: 1996, extent: 7.583 },
  { year: 1997, extent: 6.686 },
  { year: 1998, extent: 6.536 },
  { year: 1999, extent: 6.117 },
  { year: 2000, extent: 6.246 },
  { year: 2001, extent: 6.732 },
  { year: 2002, extent: 5.827 },
  { year: 2003, extent: 6.116 },
  { year: 2004, extent: 5.984 },
  { year: 2005, extent: 5.504 },
  { year: 2006, extent: 5.862 },
  { year: 2007, extent: 4.267 },
  { year: 2008, extent: 4.687 },
  { year: 2009, extent: 5.262 },
  { year: 2010, extent: 4.865 },
  { year: 2011, extent: 4.561 },
  { year: 2012, extent: 3.566 },
  { year: 2013, extent: 5.208 },
  { year: 2014, extent: 5.22 },
  { year: 2015, extent: 4.616 },
  { year: 2016, extent: 4.528 },
  { year: 2017, extent: 4.822 },
  { year: 2018, extent: 4.785 },
  { year: 2019, extent: 4.364 },
  { year: 2020, extent: 4.001 },
  { year: 2021, extent: 4.952 },
  { year: 2022, extent: 4.897 },
  { year: 2023, extent: 4.381 },
  { year: 2024, extent: 4.351 },
];

let yearIndex = 0;
let transitioning = false;
let transitionProgress = 0;
let transitionDirection = 1;
let queuedSteps = 0;
let transitionDelay = 0;

function setup() {
  // 💡 FIX: Create the canvas and immediately assign its parent to 
  // the wrapper element defined in your HTML.
  let p5Canvas = createCanvas(widthCanvas, heightCanvas);
  p5Canvas.parent('main-viz-wrapper'); 

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

  // Keyboard controls
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    if (transitioning) return;

    // normal step = 1, ctrl/cmd = 5
    const step = (e.ctrlKey || e.metaKey) ? 5 : 1;
    const direction = e.key === 'ArrowRight' ? 1 : -1;

    // queue multiple mini-steps if jumping 5 years
    queuedSteps = step;
    transitionDirection = direction;
    transitioning = true;
    transitionProgress = 0;
    transitionDelay = 0;
  });
}

function draw() {
  background(5, 15, 50);

  // --- Smooth year transitions ---
  if (transitioning) {
    transitionProgress += 0.03; // speed per mini-transition EDIT HERE IF TOO FAST
    if (transitionProgress >= 1) {
      transitionProgress = 0;
      yearIndex = (yearIndex + transitionDirection + years.length) % years.length;
      queuedSteps--;

      if (queuedSteps > 0 ) {
        // small pause between increments
        transitionDelay = 5;
      } else {
        // 🔴 FIX: Stop the transition when all queued steps are complete.
        transitioning = false; 
      }
    }
  }

  // small frame delay between mini-steps
  if (transitionDelay > 0) {
    transitionDelay--;
    if (transitionDelay === 0 && queuedSteps > 0) {
      transitioning = true;
    }
  }

  // --- Extent interpolation ---
  let nextYearIndex = (yearIndex + transitionDirection + years.length) % years.length;
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

    // Simulate light direction from top-left (arctic sun low on horizon)
    let light = createVector(-0.5, -0.8).normalize();
    let surfaceNormal = createVector(Polycenter[0] - widthCanvas / 2, Polycenter[1] - heightCanvas / 2).normalize();
    let lightFactor = (light.dot(surfaceNormal) + 1) / 2; // normalize 0–1
    lightFactor = pow(lightFactor, 0.6); // soften curve
    let brightness = map(lightFactor, 0, 1, 0.7, 1.05);

    // Base fill color setup (dynamic blue/white mix)
    let dynamicBlue = map(brightness, 0.7, 1.05, 150, 200);
    let baseFillR = dynamicBlue * brightness;
    let baseFillG = (dynamicBlue + 20) * brightness;
    let baseFillB = 255 * brightness;
    let baseFillA = 180;
    
    // ------------------------------------------------------------------------------------------------------------------
    // --- Inner Reflection/Refraction Layer (Enhances Depth) ---
    push();
    noFill();
    stroke(255, 255, 255, 30); // Very transparent white stroke
    strokeWeight(map(shrinkScale, 0.2, 1, 8, 12)); // Wide stroke simulates inner reflection/refraction
    
    // Draw the shape slightly shrunken inward
    let innerShrinkScale = shrinkScale * 0.98;
    beginShape();
    for (let j = 0; j < poly.length; j++) {
      let [x, y] = poly[j];
      let vx = Polycenter[0] + (x - Polycenter[0]) * innerShrinkScale + floatX;
      let vy = Polycenter[1] + (y - Polycenter[1]) * innerShrinkScale + floatY;
      vertex(vx, vy);
    }
    endShape(CLOSE);
    pop();
    // ------------------------------------------------------------------------------------------------------------------


    // --- START: Internal Texture (Cloudy/Milky Patches) & Fill (Drawn OVER Inner Reflection) ---
    push();
    noStroke();
    beginShape();
    for (let j = 0; j < poly.length; j++) {
      let [x, y] = poly[j];
      let jitterMag = map(shrinkScale, 0.2, 1, 3, 0);
      let angle = noise(j * 0.5, i * 0.3, frameCount * 0.01) * TWO_PI * 2;
      let jitterX = jitterMag * cos(angle);
      let jitterY = jitterMag * sin(angle);

      let vx = Polycenter[0] + (x - Polycenter[0]) * shrinkScale + floatX + jitterX;
      let vy = Polycenter[1] + (y - Polycenter[1]) * shrinkScale + floatY + jitterY;

      // Calculate a noise value for this vertex to influence its fill color/alpha
      let textureNoise = noise(vx * 0.02, vy * 0.02, frameCount * 0.005);
      // Slight variations in alpha/brightness for cloudy effect
      let texturedAlpha = map(textureNoise, 0, 1, baseFillA * 0.85, baseFillA * 1.05); 
      let texturedBrightness = map(textureNoise, 0, 1, 0.95, 1.05); 

      fill(baseFillR * texturedBrightness, baseFillG * texturedBrightness, baseFillB * texturedBrightness, texturedAlpha);
      vertex(vx, vy);
    }
    endShape(CLOSE);
    pop(); 
    // --- END: Internal Texture & Fill ---


    // --- START: Add Subtle Cracks/Internal Lines (Bézier fix) ---
    if (random(1) < 0.15) { 
      push();
      noFill();
      strokeWeight(1);
      stroke(255, 255, 255, random(50, 100)); // Semi-transparent white
      
      let numCracks = floor(random(1, 3)); 
      for (let k = 0; k < numCracks; k++) {
        let startOffset = p5.Vector.random2D().mult(random(0, shrinkScale * 10)); 
        let endOffset = p5.Vector.random2D().mult(random(0, shrinkScale * 15)); 

        let x1 = Polycenter[0] + startOffset.x + floatX;
        let y1 = Polycenter[1] + startOffset.y + floatY;
        let x4 = Polycenter[0] + endOffset.x + floatX;
        let y4 = Polycenter[1] + endOffset.y + floatY;

        let mid_x = lerp(x1, x4, 0.5);
        let mid_y = lerp(y1, y4, 0.5);
        let noiseOffset = map(noise(i, k * 0.1, (frameCount + 1000) * 0.001), 0, 1, -20, 20);
        
        let x2 = lerp(x1, mid_x, 0.3) + noiseOffset;
        let y2 = lerp(y1, mid_y, 0.3) + noiseOffset;

        let x3 = lerp(x4, mid_x, 0.3) - noiseOffset;
        let y3 = lerp(y4, mid_y, 0.3) - noiseOffset;

        bezier(x1, y1, x2, y2, x3, y3, x4, y4); 
      }
      pop();
    }
    // --- END: Add Subtle Cracks/Internal Lines ---

    // --- START: Fresnel Reflection Approximation (New Layer) ---
    push();
    noFill();
    
    // 1. Calculate the 'Grazing Angle' Approximation
    let yPosNorm = map(Polycenter[1], 0, heightCanvas * 0.66, 0.5, 1); 
    
    // Add a subtle flicker based on Perlin noise for realism
    let noiseFlicker = map(noise(i * 0.5, frameCount * 0.1), 0, 1, 0.9, 1.1); 
    
    // Fresnel Reflection = Grazing Angle (Y-Pos) * Lighting Factor * Noise
    let fresnelAlpha = map(yPosNorm * brightness * noiseFlicker, 0.4, 1.2, 50, 100); 
    fresnelAlpha = constrain(fresnelAlpha, 0, 120); 
    
    // 2. Draw the reflection as a semi-transparent white stroke
    stroke(255, 255, 255, fresnelAlpha);
    strokeWeight(1.8); 
    
    // Draw the shape slightly expanded to sit just outside the main fill
    let reflectionScale = shrinkScale * 1.005; 
    beginShape();
    for (let j = 0; j < poly.length; j++) {
      let [x, y] = poly[j];
      let vx = Polycenter[0] + (x - Polycenter[0]) * reflectionScale + floatX;
      let vy = Polycenter[1] + (y - Polycenter[1]) * reflectionScale + floatY;
      vertex(vx, vy);
    }
    endShape(CLOSE);
    pop();
    // --- END: Fresnel Reflection Approximation ---

    // --- Edge shimmer outline (OUTER STROKE, JITTERED) ---
    noFill();
    stroke(240, 250, 255, 100); 
    strokeWeight(1); 
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

    // --- Refined crystalline outline shimmer (INNER STROKE, CLEAN) ---
    push();
    noFill();
    let shimmerHue = map(noise(i * 0.25, frameCount * 0.015), 0, 1, 230, 255);
    let shimmerAlpha = map(noise(i * 0.3, frameCount * 0.02), 0, 1, 150, 255); 
    stroke(shimmerHue, shimmerHue, 255, shimmerAlpha);
    strokeWeight(1.5); 
    beginShape();
    for (let j = 0; j < poly.length; j++) {
      let [x, y] = poly[j];
      let vx = Polycenter[0] + (x - Polycenter[0]) * shrinkScale + floatX;
      let vy = Polycenter[1] + (y - Polycenter[1]) * shrinkScale + floatY;
      vertex(vx, vy);
    }
    endShape(CLOSE);
    pop();
  }

  // --- show year text ---
  fill(255);
  textSize(20);
  textAlign(LEFT, BOTTOM);
  textFont('Poppins');
  text(years[yearIndex].year, 10, heightCanvas - 10);
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