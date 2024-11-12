import svgstore from 'svgstore';
import fs from 'fs';



function addIcon(name, file, s) {
    file = file || name +'.svg';
    s.add(name, fs.readFileSync(INPUT+file, 'utf8'));
}

var INPUT = './icons/';
var OUTPUT = '../static/icons.svg';
var sprites = svgstore();
console.log('Generating sprite file for action icons...');
fs.readdirSync(INPUT).forEach(file => {

    if (file.includes('.svg')) {
        console.log(' - ' +file)
        addIcon(file.replace('.svg', ''), file, sprites);
    }
})


fs.writeFileSync(OUTPUT, sprites.toString());


console.log('Generating sprite file for illustrative icons...');
var INPUT = './icons-outline/';
var OUTPUT = '../static/icons-o.svg';
var spriteso = svgstore();

fs.readdirSync(INPUT).forEach(file => {

    if (file.includes('.svg')) {
        console.log(' - ' +file)
        addIcon(file.replace('.svg', ''), file, spriteso);
    }
})


fs.writeFileSync(OUTPUT, spriteso.toString());
