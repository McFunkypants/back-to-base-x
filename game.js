// Back To Base X
// by Christer McFunkypants Kaitila
// http://www.mcfunkypants.com
// http://www.christerkaitila.com
// http://twitter.com/mcfunkypants

var canvas, ctx, 
    terraindata, terraincanvas, terrainctx, 
    spritecanvas, spritectx, 
    noise, 
    ai; 

const DEBUG = true;
const spritew = 64;
const spriteh = 64;
const spriter = 32;
const scorchw = 48;
const scorchh = 48;
const scorchr = 24;
const holew = 40;
const holeh = 40;
const holer = 20;
const numsprites = 8;

// colour map for terrain shades
var shades = [
    [255,255,0,255], // ore
    [90,77,65,255], // rock
    [100,60,20,255], // mud
    [124,252,0,255], // grass
    [135,205,250,0], // sky
];

window.onclick = function(e) {
    if (DEBUG) console.log("onclick");
    var newai = {
        active:true,
        x:e.clientX,
        y:e.clientY,
        xofs:-4,
        yofs:-8,
        xs:(Math.random()*2-1) * 3,
        ys:(Math.random()*2-1) * 3 - 3,
        hp:1
    }
    ai.push(newai);
}

window.onload = function () {
    if (DEBUG) console.log("onload");
    
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

    spritecanvas = document.createElement("canvas");
    spritecanvas.width = spritew * numsprites;
    spritecanvas.height = spriteh;
    spritectx = spritecanvas.getContext("2d");

    noise = new Perlin();
    generate();
    animate();
}

function generate() {
    if (DEBUG) console.log("generate");

    // generate game objects
    ai = [];

    // generate spritesheet
    spritectx.beginPath();
    spritectx.arc(spriter, spriter, spriter, 0, 2*Math.PI); // x,y,r,start,end
    spritectx.fillStyle = '#000000';
    spritectx.fill();    

    // generate terrain
    var blobSizeX = 250;
    var blobSizeY = 50;
    var numshades = shades.length;
    var shadesize = 256 / numshades;
    var perlinOffsetX = Math.random() * 10000;
    var perlinOffsetY = Math.random() * 10000;
    var detailSizeX = 6;
    var detailSizeY = 6;
    var detailStrength = 0.085; // for some roughness


    for(var i = 0, len = terraindata.data.length; i < len; i += 4){
        var x = Math.floor( (i / 4) % canvas.width );
        var y = Math.floor( (i / 4) / canvas.width );
        

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
        var str = (noise.noise(perlinOffsetX + (x / blobSizeX), perlinOffsetY + (y / blobSizeY), 0) + 1) / 2;

        // perturb by another octave
        str -= (detailStrength * (noise.noise(perlinOffsetX + (x / detailSizeX), perlinOffsetY + (y / detailSizeY), 0) + 1) / 2);

        var n = Math.floor(numshades * str); // split evenly

        // uneven strata sizes
        if (str<0.15) { n = 0; }
        else if (str<0.4) { n = 1; }
        else if (str<0.42) { n = 2; }
        else if (str<0.43) { n = 3; }
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
    terrainctx.drawImage(img,0,0,spritew,spriteh,
        x-scorchr,y-scorchr,scorchw,scorchh);

	// erase source where dest is: cut out holes!
	terrainctx.globalCompositeOperation = 'destination-out';
    terrainctx.drawImage(img,0,0,spritew,spriteh,
        x-holer,y-holer,holew,holeh);
	
    // grab colision data with new terrain - COSTLY!
    terraindata = terrainctx.getImageData(0,0,terraincanvas.width,terraincanvas.height);

}

function step() {
    for (var num=0,max=ai.length; num<max; num++) {
        if (ai[num].active) {
            var x = ai[num].x;
            var y = ai[num].y;
            // try moving here
            x += ai[num].xs;
            y += ai[num].ys;
            // bounds
            x = Math.max(0,Math.min(terraincanvas.width,x));
            y = Math.max(0,Math.min(terraincanvas.height,y));
            // collision detection
            var hit = collides(x,y);
            // set new pos
            if (hit) {
                // stop moving
                ai[num].xs = 0;
                ai[num].ys = 0;
                stampterrain(x,y,spritecanvas);
                ai[num].active = false;
            } else {
                // keep moving
                ai[num].x = x;
                ai[num].y = y;
                // gravity
                ai[num].ys += 0.0975;
            }
        } // if active
    } 
}

function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(terraincanvas,0,0);
    for (var num=0,max=ai.length; num<max; num++) {
        if (ai[num].active) {
            ctx.drawImage(spritecanvas,
                0,0,
                spritew,spriteh,
                ai[num].x+ai[num].xofs,ai[num].y+ai[num].yofs,
                4,4);
        }
    }
}

function animate() {
    step();
    draw();
    requestAnimationFrame(animate);
}