// Back To Base X
// by Christer McFunkypants Kaitila
// http://www.mcfunkypants.com
// http://www.christerkaitila.com
// http://twitter.com/mcfunkypants

/* global Perlin, ZZFX, drawtxt */

var canvas, ctx, framecount,
    terraindata, terraincanvas, terrainctx, 
    stampcanvas, stampctx, 
    spritesheet, spritesheet_loaded, spritesheet2,
    noise, 
    ai,
    // inputs
    up,right,down,left,
    // reusables
    x,y,i,n,val,num,len,hit,flip;

// reset player input
up = right = down = left = framecount = 0;

const DEBUG = true;
const spritew = 8;
const spriteh = 8;
const stampw = 64;
const stampr = 32;
const scorchw = 48;
const scorchr = 24;
const holew = 40;
const holer = 20;
const numsprites = 8;
const WALKCYCLE_FRAMECOUNT = 4;
const WALKCYCLE_FRAMESKIP = 5;

// 0..1 perlin range for each shade
var strata = [
    0.15, // ore
    0.4, // rock
    0.44, // mud
    0.46 // grass
];
// colour map for terrain shades
const shades = [
    [255,255,0,255], // ore
    [90,77,65,255], // rock
    [100,60,20,255], // mud
    //[124,252,0,255], // grass
    [30,60,10,255], // grass
    [135,205,250,0], // sky
];
const numshades = shades.length;

// terrain settings
const blobSizeX = 300;
const blobSizeY = 75;
const perlinOffsetX = Math.random() * 10000;
const perlinOffsetY = Math.random() * 10000;
const detailSizeX = 16;
const detailSizeY = 5;
const detailStrength = 0.1; // for some roughness

// nice sounds I've found
var sfx = {
    miss_woosh: 54897,
    whistle_up: 83755,
    wave_scrape: 29757,
    bubble_jump: 13387,
    robo_sense: 38037,
    sting_hurt: 24148,
    woosh_punch: 18845,
    soft_bwop: 51561,
    whum_soft: 79858,
    step_rip: 95746,
    wah_whee: 97710,
    pickup_bubble: 73760,
    alien_hmm: 73742,
    takeoff_eh: 1094,
    splash_hit: 15966,
    bubble: 11730,
    woosh_howl: 62230,
    teleport: 58562,
    bird_whistle: 5027,
    robo_wha: 5029,
    punch_woosh: 38058,
    splat: 56192,
    crunch: 6539,
    swing: 55238,
    bird_wow: 5193,
    robo_whee: 68581,
    compu_butt: 88748,
    hiyah: 36507,
    synth: 51314,
    flutter: 50970,
    wet_hop: 40803,
    quiet_tap: 58210,
    dive_deep: 36626,
    quiet_discard: 90825,
    dig_smooth: 14155,
    zap: 13698,
    sword_chop: 81875,
    whip_throw: 21974,
    why: 5321,
    quiet_noise: 79685,
    shock_wisp: 91896,
    awaken_purr: 60386,
    slash: 49521,
    soft_oof: 20165,
    flute: 15807,
    slime_smile: 91932,
    tweet_squeak: 72732,
    fail: 32962,
    silent_organ: 70963,
    fast_wish: 21103,
    robo_whine: 22429,
    timpani: 30227,
    blaster: 37334,
    blow: 22454,
    missile: 90504,
    hurt: 47168,
    shatter: 460,
    quiet_pole: 13290,
    hit_soft: 9270,
    robo_cool: 66730,
    bomb_fall: 85933,
    gowhee: 3351,
    noisy_click: 3722,
    hitbox: 63521,
    hit_back: 8496,
    fast_swing: 26265,
    hit_shield: 5177,
    drip: 77903,
    shoot_air: 61156,
    bang: 42667,
    beep: 35558,
    tone: 0,
    punch_hit: 1,
    quiet_frong: 14,
    karate: 28,
    pac: 56,
    small_impact: 58,
    bwu: 84,
    robo_hum: 97
};

function randomProperty(obj) {
    var keys = Object.keys(obj)
    return obj[keys[ keys.length * Math.random() << 0]];
};

function click(e) {
    if (DEBUG) console.log("onclick");

    //ZZFX.z(sfx.karate);
    ZZFX.z(randomProperty(sfx));

    var newai;
    len = ai.length;
    for (num=0; num<len; num++) {
        if (!ai[num].active) { // reuse
            newai = ai[num];
            break;
        }
    }
    if (!newai) { // brand new
        if (DEBUG) console.log("new ai " + num);
        newai = {};
        ai.push(newai);
    }

    // respawn
    newai.active=true;
    newai.x=e.clientX;
    newai.y=e.clientY;
    newai.xofs=-4;
    newai.yofs=-8; // feet pos
    newai.xs=(Math.random()*2-1) * 3;
    newai.ys=(Math.random()*2-1) * 3 - 3;
    newai.hp=1;
    newai.explosive = (Math.random()>0.5);
    newai.frame = Math.floor(Math.random()*WALKCYCLE_FRAMECOUNT);
}

function mirrorImage(img) { // returns a canvas
    if (DEBUG) console.log("mirrorImage");
    
    var flipped = document.createElement("canvas");
    var flippedCTX = flipped.getContext('2d');

    var scaleH = -1;
    var scaleV = 1;
    var posX = img.width * -1; // Set x position to -100% if flip horizontal 
    var posY = 0; // Set y position to -100% if flip vertical

    flipped.width = img.width;
    flipped.height = img.height;
    
    // debug - I suck
    flippedCTX.fillStyle = "red";
    flippedCTX.fillRect(0,0,img.width,img.height);

    flippedCTX.save(); // Save the current state
    flippedCTX.scale(scaleH, scaleV); // Set scale to flip the image
    flippedCTX.drawImage(img, posX, posY, img.width, img.height); // draw the image
    flippedCTX.restore(); // Restore the last saved state

    return flipped;
}

function init() {
    if (DEBUG) console.log("onload");

    spritesheet = new Image();
    spritesheet.onload = function() { 
        if (DEBUG) console.log("spritesheet loaded");
        // create a miorr image of it for left facing sprites
        spritesheet2 = mirrorImage(spritesheet);
        spritesheet_loaded=true; 
    }
    spritesheet.src = "spritesheet.png";
    
    canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");

    terraincanvas = document.createElement("canvas");
    terraincanvas.width = canvas.width;
    terraincanvas.height = canvas.width;
    terrainctx = terraincanvas.getContext("2d");
    terraindata = terrainctx.createImageData(canvas.width, canvas.height);

    stampcanvas = document.createElement("canvas");
    stampcanvas.width = stampw * numsprites;
    stampcanvas.height = stampw;
    stampctx = stampcanvas.getContext("2d");

    noise = new Perlin();
    generate();
    animate();
}

function generate() {
    if (DEBUG) console.log("generate");

    // generate game objects
    ai = [];

    // generate spritesheet
    stampctx.beginPath();
    stampctx.arc(stampr, stampr, stampr, 0, 2*Math.PI); // x,y,r,start,end
    stampctx.fillStyle = '#000000';
    stampctx.fill();    

    len = terraindata.data.length;
    for(i = 0; i < len; i += 4){
        x = Math.floor( (i / 4) % canvas.width );
        y = Math.floor( (i / 4) / canvas.width );
        
        // n is an index into the colour table (+1/2 so it is 0..1)
        val = (noise.noise(perlinOffsetX + (x / blobSizeX), perlinOffsetY + (y / blobSizeY), 0) + 1) / 2;

        // perturb by another octave
        val -= (detailStrength * (noise.noise(perlinOffsetX + (x / detailSizeX), perlinOffsetY + (y / detailSizeY), 0) + 1) / 2);

        n = Math.floor(numshades * val); // split evenly

        // uneven strata sizes
        if (val<strata[0]) { n = 0; }
        else if (val<strata[1]) { n = 1; }
        else if (val<strata[2]) { n = 2; }
        else if (val<strata[3]) { n = 3; }
        else { n = 4; }

        terraindata.data[i] = shades[n][0];
        terraindata.data[i+1] = shades[n][1];
        terraindata.data[i+2] = shades[n][2];
        terraindata.data[i+3] = shades[n][3];
    }

    // write pixel data to destination context
    terrainctx.putImageData(terraindata,0,0);
}

function collides(x,y) {
    return terraindata.data[(Math.floor(x)+(Math.floor(y)*terraincanvas.width))*4+3] != 0;
}

function stampterrain(x,y,img) {
    if (DEBUG) console.log("stampterrain");

    // test: draw on terrain
    // terrainctx.drawImage(img,0,0,8,8,x-16,y-16,32,32);

	// only draw where source was visible - eg scorch marks
	terrainctx.globalCompositeOperation = 'source-atop'; 
    terrainctx.drawImage(img,0,0,stampw,stampw,
        x-scorchr,y-scorchr,scorchw,scorchw);

	// erase source where dest is: cut out holes!
	terrainctx.globalCompositeOperation = 'destination-out';
    terrainctx.drawImage(img,0,0,stampw,stampw,
        x-holer,y-holer,holew,holew);
	
    // grab colision data with new terrain - COSTLY! GC!
    terraindata = terrainctx.getImageData(0,0,terraincanvas.width,terraincanvas.height);

}

function step() {
    len=ai.length;
    for (num=0; num<len; num++) {
        if (ai[num].active) {
            x = ai[num].x;
            y = ai[num].y;
            // arrow keys to move
            if (up) ai[num].ys = -1;
            if (down) ai[num].ys = 1;
            if (left) ai[num].xs = -1;
            if (right) ai[num].xs = 1;
            // try moving here
            x += ai[num].xs;
            y += ai[num].ys;
            // bounds
            x = Math.max(0,Math.min(terraincanvas.width,x));
            y = Math.max(0,Math.min(terraincanvas.height,y));
            // check one axis at a time to allow wall sliding
            hit = false;
            
            // vertical
            if (collides(ai[num].x,y)) {
                // stop moving
                ai[num].ys = 0;
                hit = true;
            } else {
                // keep moving
                ai[num].y = y;
                // gravity
                ai[num].ys += 0.0975;
            }
            
            // horizontal
            if (collides(x,ai[num].y)) {
                // stair climbing
                if (!collides(x,ai[num].y-1)) {
                    ai[num].y -= 1; // step up 1 pixel
                    ai[num].x = x; // keep moving
                } else if (!collides(x,ai[num].y-2)) {
                    ai[num].y -= 2; // step up 2 pixels
                    ai[num].x = x; // keep moving
                } else {
                    // stop moving
                    ai[num].xs = 0;
                    hit = true;
                }
            } else {
                // keep moving
                ai[num].x = x;
            }

            if (hit) {
                if (ai[num].explosive) {
                    stampterrain(x,y,stampcanvas);
                    ai[num].active = false; // die?
                }
            }

        } // if active
    } 
}

function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(terraincanvas,0,0);
    if (spritesheet_loaded) {
        for (num=0,len=ai.length; num<len; num++) {
            if (ai[num].active) {
                
                // facing left?
                flip = (ai[num].xs<0);
                // spritesheet coords
                ai[num].frame++;
                x = spritew*((Math.floor(ai[num].frame/WALKCYCLE_FRAMESKIP)) % WALKCYCLE_FRAMECOUNT);
                y = 0;
                // draw the ai using a spritesheet
                ctx.drawImage(spritesheet,
                    //flip?spritesheet2:spritesheet, // FIXME spritesheet2 doesn't work
                    x, 
                    y,
                    spritew,
                    spriteh,
                    ai[num].x+ai[num].xofs,
                    ai[num].y+ai[num].yofs,
                    spritew,
                    spriteh);
               
            }
        }
    }
}

function animate() {
    framecount++;
    step();
    draw();
    drawtxt("Back to Base-X\na #JS13k game\nby mcfunkypants\n\nFrame: "+framecount,8,8,ctx);
    // demoscene cracktro style sin wave text scroller greetz (c) 1992
    drawtxt("Greetz to my leet haxxor gamedev friends!",canvas.width - framecount,canvas.height-16,ctx,8,0.003,-0.04);
    requestAnimationFrame(animate);
}

// Keydown listener
onkeydown = (e) => {

  // Up (up / W / Z)
  if(e.keyCode == 38 || e.keyCode == 90 || e.keyCode == 87){
    up = true;
  }
  
  // Right (right / D)
  if(e.keyCode == 39 || e.keyCode == 68){
    right = true;
  }
  
  // Down (down / S)
  if(e.keyCode == 40 || e.keyCode == 83){
    down = true;
  }
  
  // Left (left / A / Q)
  if(e.keyCode == 37 || e.keyCode == 65 ||e.keyCode == 81){
    left = true;
  }
}

// Keyup listener
onkeyup = (e) => {
    
  // Up
  if(e.keyCode == 38 || e.keyCode == 90 || e.keyCode == 87){
    up = false;
  }
  
  // Right
  if(e.keyCode == 39 || e.keyCode == 68){
    right = false;
  }
  
  // Down
  if(e.keyCode == 40 || e.keyCode == 83){
    down = false;
  }
  
  // Left
  if(e.keyCode == 37 || e.keyCode == 65 || e.keyCode == 81){
    left = false;
  }
}

window.addEventListener("load", init);
window.addEventListener("click", click);
