// Back To Base X
// by Christer McFunkypants Kaitila
// http://www.mcfunkypants.com
// http://www.christerkaitila.com
// http://twitter.com/mcfunkypants

var canvas, ctx, 
    terraindata, terraincanvas, terrainctx, 
    stampcanvas, stampctx, 
    spritesheet, spritesheet_loaded,
    noise, 
    ai,
    // reusables
    x,y,i,val,num,len,hit;

// player input
var up = right = down = left = false;

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
const shadesize = 256 / numshades;

// terrain settings
const blobSizeX = 300;
const blobSizeY = 75;
const perlinOffsetX = Math.random() * 10000;
const perlinOffsetY = Math.random() * 10000;
const detailSizeX = 16;
const detailSizeY = 5;
const detailStrength = 0.1; // for some roughness


function click(e) {
    if (DEBUG) console.log("onclick");

    sfx_pew();

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
}

function init() {
    if (DEBUG) console.log("onload");

    spritesheet = new Image();
    spritesheet.onload = function() { 
        if (DEBUG) console.log("spritesheet loaded");
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
        

        /*
        // since n is -1..1, add +1 and multiply with 127 to get 0..255
        var n = (noise.noise(perlinOffsetX + (x / blobSizeX), perlinOffsetY + (y / blobSizeY), 0) + 1) * 127;
        // reduce the colour count to shades of grey
        //if (n<127) n = 0; else n = 255; // 1 bit b&w works great too
        n = Math.round(n/shadesize*shadesize);
        image.data[i] = n;
        image.data[i+1] = n;
        image.data[i+2] = n;
        image.data[i+3] = 255;
        */

        // n is an index into the colour table
        // +1/2 so it is 0..1
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
    //ctx.putImageData(terraindata,0,0);
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
        for (num=0,max=ai.length; num<max; num++) {
            if (ai[num].active) {
                ctx.drawImage(spritesheet,
                    0,0,
                    spritew,spriteh,
                    ai[num].x+ai[num].xofs,ai[num].y+ai[num].yofs,
                    spritew,spriteh);
            }
        }
    }
}

var framecount = 0;

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

// sound effects using xem's amazing code
var audioctx=new AudioContext();
function sfx_pew() {
    if (DEBUG) console.log("sfx");
    if (!audioctx) return;
    var A = audioctx; // ctk

    // Sound
    var f = function(i){
    var n=2e4;
    if (i > n) return null;
    var q = t(i,n);
    return Math.sin(-i*0.03*Math.sin(0.09*i+Math.sin(i/200))+Math.sin(i/100))*q*q;
    }
    // Sound player
    var t=(i,n)=>(n-i)/n;
    //var A=new AudioContext(); // we reuse the old one
    var m=A.createBuffer(1,96e3,48e3);
    var b=m.getChannelData(0);
    for(var i=96e3;i--;)b[i]=f(i);
    var s=A.createBufferSource();
    s.buffer=m;
    s.connect(A.destination);
    s.start();
}


window.addEventListener("load", init);
window.addEventListener("click", click);
