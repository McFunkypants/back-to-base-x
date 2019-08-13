// Back To Base X
// by Christer McFunkypants Kaitila
// http://www.mcfunkypants.com
// http://www.christerkaitila.com
// http://twitter.com/mcfunkypants

var canvas, ctx, image, noise; 

function runme() {

    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.appendChild(canvas);
        ctx = canvas.getContext("2d");
        image = ctx.createImageData(canvas.width, canvas.height);
        noise = new Perlin();
    }

    var blobSizeX = 250;
    var blobSizeY = 50;
    var numshades = 3;
    var shadesize = 256 / numshades;
    var perlinOffsetX = Math.random() * 10000;
    var perlinOffsetY = Math.random() * 10000;

    for(var i = 0, len = image.data.length; i < len; i += 4){
        var x = Math.floor( (i / 4) % canvas.width );
        var y = Math.floor( (i / 4) / canvas.width );
        
        // since n is -1..1, add +1 and multiply with 127 to get 0..255
        var n = (noise.noise(perlinOffsetX + (x / blobSizeX), perlinOffsetY + (y / blobSizeY), 0) + 1) * 127;

        // reduce the colour count - FIXME: one too many
        n = Math.round(n/shadesize)*shadesize;
        //if (n<127) n = 0; else n = 255; // 1 bit b&w works great

        image.data[i] = n;
        image.data[i+1] = n;
        image.data[i+2] = n;
        image.data[i+3] = 255;
    }

    // write pixel data to destination context
    ctx.putImageData(image,0,0);
}

window.onload = runme;
window.onclick = runme;