//////////    Customizable Variables    \\\\\\\\\\
// Rocket Variables
let maxThrust = 40000; // in Newton
let wetMass = 200; // Mass in kg with fuel
let dryMass = 10; // Mass in kg without fuel
let fuelFlow = 10; // Fuel flow rate in kg/s
let targetLandingThrottle = 0.9; // Variable for determining the right time for the suicide burn (or hover slam). The higher, the more fuel efficient but riskier. The lower, the safer but less fuel efficient.
let stationaryThrottle = 0.4; // Minimal thrust without shutting off the engine

let xSurfaceArea = 1; // in square meters
let ySurfaceArea = 1; // in square meters
let xDragCoefficient = 0.8; // unitless
let yDragCoefficient = 0.8; // unitless

let airPressure = 1013.25; // in HPa
let temperature = 15; // in degrees Celcius above 0

let xStart = 0; // in m
let xVelocityStart = 0; // in m/s
let yStart = 4000; // in m
let yVelocityStart = -500; // in m/s
let landingPadRadius = 40; // in m

// Simulation Variables
let realtime = false; // True for realtime simulation, false for more accurate results
let simulationFrequency = 100; // If realtime (the above) is false, then it applies the physics this amount of times per second
let debugMode = false; // Turn on for visible debug variables
let zoom = 0.25; // Simulation zoom
let log = true; // True if you'd like to download a flightlog of every frame afterwards
//////////////////////////////////////////////////

//////////    Non-customizable Variables    \\\\\\\\\\
let canvas;
let interval = 0;
let normalFont;
let boldFont;
let rocketEngineOnImage;
let rocketEngineOffImage;

let earthMass = 5.9722e24;
let earthRadius = 6378500;
let gravitationalConstant = 6.67408e-11;
let molarMass = 0.0289644;
let universalGasConstant = 8.31432;

let landingBurnHasStarted = false;
let landingBurnHasEnded = false;
let landingBurnStartingTime = 0;

let debug1;
let debug2;
let debug3;
let debug4;

let lineColor;
let crashedLineColor;
let landedLineColor;
let craftColor;
let backgroundColor;
let landingPadColor;
let textColor;

let minFrameRate = 1;
let logDone = false;
let started = false;
let slider;
//////////////////////////////////////////////////////


//////////    Starting condition class    \\\\\\\\\\
var startingConditions = function(_airPressure, _temperature, altitude, verticalVelocity, displacement, horizontalVelocity) {
  this.airPressure = _airPressure;
  this.temperature = _temperature;
  this.y = altitude;
  this.yVelocity = verticalVelocity;
  this.x = displacement;
  this.xVelocity = horizontalVelocity;
}
////////////////////////////////////////////////////

//////////    Rocket class    \\\\\\\\\\
var Rocket = function(c, _maxThrust, _wetMass, _dryMass, _fuelFlow, _xSurfaceArea, _ySurfaceArea, _xDragCoefficient, _yDragCoefficient) {
  this.maxThrust = _maxThrust;
  this.wetMass = _wetMass;
  this.dryMass = _dryMass;
  this.xSurfaceArea = _ySurfaceArea;
  this.ySurfaceArea = _ySurfaceArea;
  this.xDragCoefficient = _xDragCoefficient;
  this.yDragCoefficient = _yDragCoefficient;
  this.airPressure = c.airPressure;
  this.temperature = c.temperature;
  this.fuelFlow = _fuelFlow;

  this.x = c.x;
  this.y = c.y;
  this.xVelocity = c.xVelocity;
  this.yVelocity = c.yVelocity;
  this.mass = wetMass;
  this.airPressure = c.airPressure;
  this.temperature = c.temperature;
  this.seaLevelAirPressure = airPressure;

  this.zAngle = 0;
  this.time = 0;
  this.impactTime = 0;
  this.impactVelocity = 0;
  this.impactMass = 0;
  this.hasImpacted = false;
  this.airDensity = 0;
  this.throttle = 0;
  this.xEngineForce = 0;
  this.yEngineForce = 0;
  this.xAirResistanceForce = 0;
  this.yAirResistanceForce = 0;
  this.gravityForce = 0;
  this.xForce = 0;
  this.yForce = 0;
  this.xAcceleration = 0;
  this.yAcceleration = 0;
  this.minY = Infinity;
  this.impactX = 0;
  this.simulate = simulate;
}
////////////////////////////////////////

/// The heart of the simulation, this is where the physics get applied to the rocket \\\
function simulate(_interval) {
  //////////    General Variables    \\\\\\\\\\
  this.time += _interval;
  this.airPressure = this.seaLevelAirPressure * Math.exp((-gravityAtAltitude(0) * molarMass * this.y) / (universalGasConstant * (parseFloat(this.temperature) + 273.15)));
  this.airDensity = airDensity(this.airPressure, this.temperature);

  //////////    Horizontal Dimension    \\\\\\\\\\
  this.xAirResistanceForce = -airResistance(this.xDragCoefficient, this.airDensity, this.xVelocity, this.xSurfaceArea);
  if (this.xVelocity < 0) this.xAirResistanceForce *= -1;

  if (this.mass <= this.dryMass) this.xEngineForce = 0;
  else this.xEngineForce = this.maxThrust * this.throttle * sin(this.zAngle);

  this.xForce = this.xEngineForce + this.xAirResistanceForce;
  this.xAcceleration = this.xForce / this.mass;

  this.xVelocity += this.xAcceleration * _interval;
  this.x += this.xVelocity * _interval + (0.5 * this.xAcceleration * _interval * _interval);

  //////////    Vertical Dimension    \\\\\\\\\\
  this.yAirResistanceForce = -airResistance(this.yDragCoefficient, this.airDensity, this.yVelocity, this.ySurfaceArea);
  if (this.yVelocity < 0) this.yAirResistanceForce *= -1;

  if (this.mass <= this.dryMass) this.yEngineForce = 0;
  else this.yEngineForce = this.maxThrust * this.throttle * cos(this.zAngle);
  this.gravityForce = -gravityAtAltitude(this.y) * this.mass;

  this.yForce = this.yEngineForce + this.yAirResistanceForce + this.gravityForce;
  this.yAcceleration = this.yForce / this.mass;

  this.yVelocity += this.yAcceleration * _interval;
  this.y += this.yVelocity * _interval + (0.5 * (this.yAcceleration) * _interval * _interval);


  //////////    Simulation Handling    \\\\\\\\\\
  if (this.mass <= this.dryMass) this.mass = this.dryMass;
  else this.mass -= (this.fuelFlow * _interval * this.throttle);
  if (this.y < this.minY) this.minY = this.y;

  if (this.y <= 0) {
    if (!this.hasImpacted) {
      this.impactTime = this.time;
      this.impactVelocity = this.yVelocity;
      this.impactMass = this.mass;
      this.impactX = this.x;
      this.hasImpacted = true;
    }
    this.y = 0;
    this.yVelocity = 0;
    this.xVelocity = 0;
    this.throttle = 0;
  }
}
////////////////////////////////////////////////////////////////////////////////////////

function preload() {
  rocketEngineOnImage = loadImage('assets/RocketEngineOn.png');
  rocketEngineOffImage = loadImage('assets/RocketEngineOff.png');
  normalFont = loadFont("assets/normal.ttf");
  //boldFont = loadFont("assets/bold.vlw");
}

//////////    Setup function    \\\\\\\\\\
function setup() {
  canvas = createCanvas(900, 900 * (9 / 16));
  canvas.position((windowWidth - width) / 2);
  canvas.parent('sketch-holder');

  print("Page loaded");

  //////////    Color Variables    \\\\\\\\\\
  lineColor = color(255, 255, 255);
  crashedLineColor = color(215, 38, 11);
  landedLineColor = color(11, 147, 115);
  craftColor = color(255, 255, 255);
  backgroundColor = color(0, 0, 0);
  landingPadColor = color(255, 60, 0);
  textColor = color(255, 255, 255);

  startActions();

  slider = createSlider(1, 100, 80);
  slider.parent('slider-holder');

  noLoop();
}
//////////////////////////////////////////

//////////    Frame draw function    \\\\\\\\\\      // Gets executed every frame
function draw() {
  angleMode(DEGREES);
  canvas.position((windowWidth - width) / 2);
  if (started) {
    colorMode(RGB, 255);
    zoom = slider.value() / 100;

    /// Draw background \\\
    background(backgroundColor);
    if (!rocket.hasImpacted) {
      stroke(lineColor);
    } else if (rocket.hasImpacted && rocket.impactVelocity > -10 && rocket.impactX >= -landingPadRadius && rocket.impactX <= landingPadRadius) {
      stroke(landedLineColor);
    } else {
      stroke(crashedLineColor);
    }

    let groundHeight = height * 0.8;
    strokeWeight(4);
    line(0, groundHeight, width, groundHeight);
    stroke(landingPadColor);
    line(width * 0.5 - (landingPadRadius * zoom), groundHeight, width * 0.5 + (landingPadRadius * zoom), groundHeight);

    /// Update landing interval \\\
    if (frameRate() < minFrameRate) interval = 0;
    else if (realtime) interval = (1 / frameRate());
    else interval = (1 / simulationFrequency);

    /// Apply physics \\\
    if (!rocket.hasImpacted) {
      flightController(rocket);
      rocket.simulate(interval);
    }

    updatePosition(rocket);
    displayTelemetry(rocket);

    if (log) generateFlightLog(rocket.time, rocket.y, rocket.x, rocket.yVelocity, rocket.xVelocity, rocket.throttle, rocket.mass, rocket.mass - rocket.dryMass, rocket.airPressure, rocket.zAngle);

    if (rocket.hasImpacted && !logDone && log) {
      downloadFlightLog();
      logDone = true;
    }

  }

}
///////////////////////////////////////////////

//////////    Visualize rocket position function    \\\\\\\\\\
function updatePosition(r) {
  let centerX = (width * 0.5) + r.x * zoom;
  let centerY = (height * 0.8) - r.y * zoom;

  push();
  strokeWeight(5 * zoom);
  stroke(craftColor);

  translate(centerX, centerY);
  point(0, 0);
  pop();

  push();
  stroke(255);
  translate(centerX, centerY - (rocketEngineOnImage.height / 4 * zoom));
  point(0, 0);
  rotate(radians(r.zAngle));
  imageMode(CENTER);
  if (r.throttle > 0) image(rocketEngineOnImage, 0, (rocketEngineOnImage.height / 4 * zoom), rocketEngineOnImage.width * zoom, rocketEngineOnImage.height * zoom);
  else image(rocketEngineOffImage, 0, (rocketEngineOffImage.height / 4 * zoom), rocketEngineOffImage.width * zoom, rocketEngineOffImage.height * zoom);
  pop();
}
//////////////////////////////////////////////////////////////

//////////    Implement real-world physics equations    \\\\\\\\\\
function gravityAtAltitude(altitude) {
  return ((earthMass * gravitationalConstant) / Math.pow(earthRadius + altitude, 2));
}

function airResistance(dragCoefficient, airDensity, velocity, referenceArea) {
  return (0.5 * dragCoefficient * airDensity * velocity * velocity * referenceArea);
}

function airDensity(airPressure, temperature) {
  return (airPressure * 100 / (287.058 * (temperature + 273.15)));
}
//////////////////////////////////////////////////////////////////

//////////    Telemetry Function    \\\\\\\\\\
function displayTelemetry(r) {
  textFont(normalFont, 15);
  noStroke();
  fill(textColor);
  strokeWeight(0.5);
  stroke(textColor);

  let normalTextIndent = 10;
  let unitTextIndent = 300;

  let textHeight = 20;

  text("Frame rate:           " + nfc(frameRate(), 3), normalTextIndent, textHeight);
  text("fps", unitTextIndent, textHeight);
  textHeight += 15;
  text("Simulation interval:  " + nfc(interval, 4), normalTextIndent, textHeight);
  text("s", unitTextIndent, textHeight);
  textHeight += 15;
  text("Mission time:         " + nfc(r.time, 3), normalTextIndent, textHeight);
  text("s", unitTextIndent, textHeight);
  textHeight += 15;
  text("Mass:                 " + nfc(r.mass, 2), normalTextIndent, textHeight);
  text("kg", unitTextIndent, textHeight);
  textHeight += 15;
  text("Altitude:             " + nfc(r.y, 2), normalTextIndent, textHeight);
  text("m", unitTextIndent, textHeight);
  textHeight += 15;
  text("Vertical Velocity:    " + nfc(r.yVelocity, 2), normalTextIndent, textHeight);
  text("m/s", unitTextIndent, textHeight);
  textHeight += 15;
  text("Air Pressure:         " + nfc(r.airPressure, 3), normalTextIndent, textHeight);
  text("HPa", unitTextIndent, textHeight);
  textHeight += 15;
  text("Fuel left:            " + nfc((r.mass - r.dryMass), 2), normalTextIndent, textHeight);
  text("kg", unitTextIndent, textHeight);
  textHeight += 15;

  textHeight += 15;
  text("Engine force:         " + nfc(r.yEngineForce, 2), normalTextIndent, textHeight);
  text("N", unitTextIndent, textHeight);
  textHeight += 15;
  text("Air Resistance force: " + nfc(r.yAirResistanceForce, 2), normalTextIndent, textHeight);
  text("N", unitTextIndent, textHeight);
  textHeight += 15;
  text("Gravity force:        " + nfc(r.gravityForce, 2), normalTextIndent, textHeight);
  text("N", unitTextIndent, textHeight);
  textHeight += 15;
  text("Y Acceleration:       " + nfc(r.yAcceleration, 2), normalTextIndent, textHeight);
  text("m/s/s", unitTextIndent, textHeight);
  textHeight += 15;
  text("Throttle:             " + nfc(r.throttle * 100, 2), normalTextIndent, textHeight);
  text("%", unitTextIndent, textHeight);

  if (r.hasImpacted) {
    textHeight += 40;
    text("Impact time:          " + nfc(r.impactTime, 2), normalTextIndent, textHeight);
    text("s", unitTextIndent, textHeight);
    textHeight += 15;
    text("Impact velocity:      " + nfc(r.impactVelocity, 2), normalTextIndent, textHeight);
    text("m/s", unitTextIndent, textHeight);
    textHeight += 15;
    text("Impact velocity:      " + nfc((r.impactVelocity * 3.6), 2), normalTextIndent, textHeight);
    text("km/h", unitTextIndent, textHeight);
    textHeight += 15;
    text("Fuel spent:           " + nfc((r.wetMass - r.mass), 2), normalTextIndent, textHeight);
    text("kg", unitTextIndent, textHeight);
    textHeight += 15;
    if (r.impactX > 0) {
      text("Landing offset:       " + nfc(r.impactX, 3), normalTextIndent, textHeight);
      text("m", unitTextIndent, textHeight);
    } else if (r.impactX < 0) {
      text("Landing offset:       " + nfc(-r.impactX, 3), normalTextIndent, textHeight);
      text("m", unitTextIndent, textHeight);
    } else {
      push();
      text("Landing offset:", normalTextIndent, textHeight);
      fill(landedLineColor);
      text("                      SPOT ON!", normalTextIndent, textHeight);
      pop();
    }
  }

  if (debugMode) {
    textHeight += 15;
    text(debug1, 10, textHeight);
    textHeight += 15;
    text(debug2, 10, textHeight);
    textHeight += 15;
    text(debug3, 10, textHeight);
    textHeight += 15;
    text(debug4, 10, textHeight);
  }

  push();
  stroke(255);
  strokeWeight(4);
  noFill();
  rect(0, 0, unitTextIndent + 80, textHeight + 14);
  pop();
}
//////////////////////////////////////////////

//////////    Setup Function    \\\\\\\\\\
function startActions() {
  /// Optional \\\
}

//////////    FlightController Function (gets called every frame)   \\\\\\\\\\
function flightController(r) {
  r.zAngle = 0;
  let maxAcceleration = (r.maxThrust / r.mass);
  let timeToGround = (r.y / -r.yVelocity);
  let landingTime = (-r.yVelocity / (maxAcceleration / targetLandingThrottle));

  let landingDisplacement = (-r.yVelocity * landingTime) + (0.5 * (maxAcceleration * targetLandingThrottle) * landingTime * landingTime);
  //let landingBurnCondition = (r.y <= landingDisplacement);
  let targetThrottle = ((landingDisplacement - (-r.yVelocity * timeToGround)) / (0.5 * timeToGround * timeToGround)) / maxAcceleration;

  let landingBurnCondition = (targetThrottle >= targetLandingThrottle);

  if (r.hasImpacted) r.throttle = 0;
  else if (r.yVelocity > 0) {
    r.throttle = 0;
    landingBurnHasEnded = true;
  }
  //else if (targetThrottle > 1 && landingBurnHasStarted && !landingBurnHasEnded) r.throttle = 1;
  //else if (targetThrottle < stationaryThrottle && landingBurnHasStarted && !landingBurnHasEnded) r.throttle = stationaryThrottle;
  else if (landingBurnCondition && landingBurnHasStarted && !landingBurnHasEnded) r.throttle = max(stationaryThrottle, min(targetThrottle, 1));
  else if (landingBurnCondition && !landingBurnHasStarted && !landingBurnHasEnded) {
    r.throttle = max(stationaryThrottle, min(targetThrottle, 1));
    landingBurnHasStarted = true;
  } else if (!landingBurnCondition && landingBurnHasStarted && !landingBurnHasEnded) r.throttle = max(stationaryThrottle, min(targetThrottle, 1));
  //else if (!landingBurnCondition && !landingBurnHasStarted && !landingBurnHasEnded) r.throttle = 0;
  else r.throttle = 0;
}

let table = new p5.Table();
table.addColumn("Time");
table.addColumn("Altitude");
table.addColumn("Horizontal Position");
table.addColumn("Vertical Velocity");
table.addColumn("Horizontal Velocity");
table.addColumn("Throttle");
table.addColumn("Mass");
table.addColumn("Fuel left");
table.addColumn("Air Pressure");
table.addColumn("Rotation");

function generateFlightLog(_time, _y, _x, _yVelocity, _xVelocity, _throttle, _mass, _fuelLeft, _airPressure, _zAngle) {
  let newRow = table.addRow();
  newRow.setNum(0, _time);
  newRow.setNum(1, _y);
  newRow.setNum(2, _x);
  newRow.setNum(3, _yVelocity);
  newRow.setNum(4, _xVelocity);
  newRow.setNum(5, _throttle);
  newRow.setNum(6, _mass);
  newRow.setNum(7, _fuelLeft);
  newRow.setNum(8, _airPressure);
  newRow.setNum(9, _zAngle);
}

function downloadFlightLog() {
  let name = "FlightLog - " + day() + "-" + month() + "-" + year() + " " + hour() + minute() + ".csv"
  save(table, name);
}

let conditions;
let rocket;

function start() {
  print("Simulation starting...");

  maxThrust = parseFloat(document.getElementById('thrust').value); // in Newton
  wetMass = parseFloat(document.getElementById('wetMass').value); // Mass in kg with fuel
  dryMass = parseFloat(document.getElementById('dryMass').value); // Mass in kg without fuel
  fuelFlow = parseFloat(document.getElementById('fuelFlow').value); // Fuel flow rate in kg/s
  stationaryThrottle = parseFloat(document.getElementById('stationaryThrottle').value);

  airPressure = parseFloat(document.getElementById('airPressure').value); // in HPa
  temperature = parseFloat(document.getElementById('temperature').value); // in degrees Celcius above 0

  yVelocityStart = parseFloat(document.getElementById('verticalVelocity').value); // in m/s
  xVelocityStart = parseFloat(document.getElementById('horizontalVelocity').value); // in m/s
  yStart = parseFloat(document.getElementById('yStart').value); // in m
  xStart = parseFloat(document.getElementById('xStart').value); // in m

  realtime = document.getElementById('realtime').checked;
  log = document.getElementById('log').checked;

  conditions = new startingConditions(airPressure, temperature, yStart, yVelocityStart, xStart, xVelocityStart);
  rocket = new Rocket(conditions, maxThrust, wetMass, dryMass, fuelFlow, xSurfaceArea, ySurfaceArea, xDragCoefficient, yDragCoefficient);

  print("Simulation started...");
  print("Detected the folowing variables: ");
  print(conditions, rocket);

  started = true;
  loop();
}

function reset() {
  rocket = new Rocket(conditions, maxThrust, wetMass, dryMass, fuelFlow, xSurfaceArea, ySurfaceArea, xDragCoefficient, yDragCoefficient);

  started = false;
  noLoop();
}
