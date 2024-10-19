import svgstore from 'svgstore';
import fs from 'fs';

var INPUT = './icons/';
var OUTPUT = '../static/icons.svg';
var sprites = svgstore();

function addIcon(name, file) {
    file = file || name +'.svg';
    sprites.add(name, fs.readFileSync(INPUT+file, 'utf8'));
}


fs.readdirSync(INPUT).forEach(file => {

    if (file.includes('.svg')) {
        console.log(file)
        addIcon(file.replace('.svg', ''), file);
    }
})


fs.writeFileSync(OUTPUT, sprites.toString());

