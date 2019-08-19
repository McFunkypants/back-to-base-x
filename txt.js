// quick n dirty spritesheet pixel font
// made with love by mcfunkypants

// uses a 500 byte png I made based on boxy bold by Clint Bellanger (CC0)

// layout of the image must be this (blank space is fine, for optimization)
// ascii 32-64 space ! " # $ % & ' ( ) * + , - . / 0 1 2 3 4 5 6 7 8 9 : ; < = > ? @
// ascii 65-96 A B C D E F G H I J K L M N O P Q R S T U V W X Y Z [ \ ] ^ _ `
// ascii 97-126 a b c d e f g h i j k l m n o p q r s t u v w x y z { | } ~

const FORCE_UPPERCASE = true;

var txt_img_loaded = false;
var txt_img = new Image();
txt_img.onload = function() { txt_img_loaded = true; }
txt_img.src = "txt.png";

var txt_x_margin = 0; // where the lines start
var txt_overlap_x = -1; // kerning (so black outlines overlap)
var txt_space_width = 5; // width of " " 
var txt_x = 0; // where we last were
var txt_y = 0; // current line
var txt_line_height = 8; // pixels

// data for letter widths and sprite locations
// specific to the /img/UI/txt.png image
var txt_h = 8; // sprite heights
var txt_w = [ // sprite widths
    4, 7, 9, 7, 10, 9, 4, 5, 5, 6, 8, 5, 6, 4, 6, 7, 4, 7, 7, 7, 7, 7, 7, 7, 7, 4, 4, 6, 6, 6, 8, 8,
    7, 7, 7, 7, 7, 8, 7, 7, 4, 7, 7, 7, 9, 8, 7, 7, 8, 7, 7, 8, 7, 7, 9, 7, 8, 7, 5, 6, 5, 8, 6, 0,
    7, 7, 6, 7, 7, 6, 7, 7, 5, 6, 7, 5, 9, 7, 7, 7, 7, 7, 7, 6, 7, 7, 9, 7, 7, 7, 5, 5, 4, 5, 9];
// fixme: these could be calculated using the above w and h
// maybe using offsets like original.map(element => element - 255);
var txt_dx = [ // sprite coordinates for each letter sprite in the font map image
    0, 5, 13, 23, 31, 42, 52, 57, 63, 69, 76, 85, 91, 98, 103, 110, 118, 123, 131, 139, 147, 155, 163, 171, 179, 187, 192, 197, 204, 211, 218, 227,
    0, 8, 16, 24, 32, 40, 48, 56, 64, 69, 77, 85, 93, 103, 112, 120, 128, 137, 145, 153, 162, 170, 178, 188, 196, 205, 213, 219, 226, 232, 241, -1,
    0, 8, 16, 23, 31, 39, 46, 54, 62, 68, 75, 83, 89, 99, 107, 115, 123, 131, 139, 147, 154, 162, 170, 180, 188, 196, 204, 210, 216, 221, 227];
var txt_dy = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16];

function measuretxt(str) {
    var w = 0;
    var index = 0;
    var max = 0; // multiple lines count from 0
    for (var c = 0, len = str.length; c < len; c++) {
        index = str.charCodeAt(c) - 32 - 1;
        if (txt_w[index] == undefined) index = 0;
        w += txt_w[index];
        if (str[c] == "\n") w = 0; // new line
        if (max < w) max = w;
    }
    return max;
}

function drawtxtCentered(str, x, y) {
    if (FORCE_UPPERCASE) str = str.toUpperCase();
    drawtxt(str, x - Math.round(measuretxt(str) / 2), y);
}

function drawtxt(str, x, y, ctx=window.ctx) {
    if (FORCE_UPPERCASE) str = str.toUpperCase();
    if (!txt_img_loaded) {
        console.log("drawtxt: image not loaded");
        return;
    }

    if (!ctx) {
        console.log("drawtxt: missing canvas context");
        return;
    }

    txt_x_margin = x;
    txt_x = x;
    txt_y = y;
    var sw = 0;
    var sx = 0;
    var sy = 0;
    var index = 0;

    for (var c = 0, len = str.length; c < len; c++) {

        index = str.charCodeAt(c) - 32 - 1;

        // linefeed?
        if (str[c] == "\n") {
            //console.log('TXT newline!');
            txt_x = txt_x_margin;
            txt_y += txt_line_height;
        }
        // missing character or space
        else if (txt_w[index] == undefined) {
            txt_x += txt_space_width; // space
        }
        else // normal letter
        {
            sw = txt_w[index];
            sx = txt_dx[index];
            sy = txt_dy[index];

            // debug spam
            // console.log('txt: index:'+index+'=['+str[c]+'] '+sx+','+sy+' width='+sw)

            // draw it
            ctx.drawImage(txt_img,
                sx,
                sy,
                sw,
                txt_h,
                txt_x,
                txt_y,
                sw,
                txt_h);

            // move to next position
            txt_x = txt_x + sw + txt_overlap_x;
        } // draw
    } // char loop
    return sw; // returns pixel width of string
}

/*
// animate the letters of a string if now is within range
function npcText(message, x, y, starttime, endtime, faceImage) {

    if (!message || !message.length) return; // sanity
    x = Math.round(x);
    y = Math.round(y);
    var now = performance.now(); // timestamp
    var count = 0; // how many characters to draw this frame
    var percent = 1; // where are we in the animation
    var bubbleWidth = measuretxt(message);

    if (now < starttime) {
        count = 0; // draw nothing and wait to start
    }
    else if (now > endtime) {
        count = message.length; // done animating, draw it all
    }
    else if (now >= starttime && now <= endtime) // partway done
    {
        percent = (now - starttime) / (endtime - starttime);
        count = Math.floor(message.length * percent);
    }

    // now render however many chars we want
    message = message.substring(0, count);


    if (!faceImage) // word bubble mode
    {
        canvasContext.globalAlpha = 0.25;
        // draw the word bubble left side
        canvasContext.drawImage(sprites.UI.txt, // see imgPayload.js
            0, // sx
            0, // sy
            bubbleWidth, // sw
            32, // sh
            x - 6, // dx
            y - 6, // dy
            bubbleWidth, // dw
            32); // dh

        // draw the word bubble right side (for liquid layout to fit text)
        canvasContext.drawImage(sprites.UI.txt, // see imgPayload.js
            252, // sx
            0, // sy
            4, // sw
            32, // sh
            x - 6 + bubbleWidth, // dx
            y - 6, // dy
            4, // dw
            32); // dh

        canvasContext.globalAlpha = 1.0;
    }

    //console.log("npc_text:["+message+"] pos:"+x+","+y+" "+~~starttime+" to "+~~endtime+" now="+~~now+" percent:"+~~percent*100);
    drawtxt(message, x, y);
}

// a word bubble
function npcWordBubble(message, x, y, starttime, endtime) {
    npcText(message, x + (-1 * Math.round(measuretxt(message) / 2)), y, starttime, endtime);
}

const NPC_FOOTER_TEXT_X = 52; // pixels from the left of the screen
const NPC_FOOTER_TEXT_Y = 48; // pixels from the *BOTTOM* of the screen
const NPC_FOOTER_HEIGHT = 56; // height of entire footer bg image
const NPC_FOOTER_FACEX = 8;
const NPC_FOOTER_FACEY = 52; // from bottom

// a jrpg subtitles footer bar
function npcTextFooter(message, faceImage, starttime, endtime) {
    //console.log('npcTextFooter!');

    //canvasContext.globalAlpha = 0.25;

    // draw the footer bar left side
    canvasContext.drawImage(sprites.UI.txt, // see imgPayload.js
        0, // sx
        56, // sy of source pixels
        8, // sw
        NPC_FOOTER_HEIGHT, // sh
        0, // dx
        canvas.height - NPC_FOOTER_HEIGHT, // dy
        8, // dw
        NPC_FOOTER_HEIGHT); // dh

    // stretch the footer bar middle
    canvasContext.drawImage(sprites.UI.txt, // see imgPayload.js
        8, // sx
        56, // sy of source pixels
        240, // sw
        NPC_FOOTER_HEIGHT, // sh
        8, // dx
        canvas.height - NPC_FOOTER_HEIGHT, // dy
        canvas.width - 8 - 8, // dw
        NPC_FOOTER_HEIGHT); // dh

    // draw the footer bar right side
    canvasContext.drawImage(sprites.UI.txt, // see imgPayload.js
        248, // sx
        56, // sy of source pixels
        8, // sw
        NPC_FOOTER_HEIGHT, // sh
        canvas.width - 8, // dx
        canvas.height - NPC_FOOTER_HEIGHT, // dy
        8, // dw
        NPC_FOOTER_HEIGHT); // dh

    //canvasContext.globalAlpha = 1.0;

    // draw the face portrait
    if (faceImage) {
        canvasContext.drawImage(faceImage,NPC_FOOTER_FACEX,canvas.height - NPC_FOOTER_FACEY);
    }
    else {
        console.log("Warning: missing faceImage in npcGUI")
    }

    npcText(message, NPC_FOOTER_TEXT_X, canvas.height - NPC_FOOTER_TEXT_Y, starttime, endtime, faceImage);
}

*/