import svgstore from "svgstore";
import fs from "fs";

processIcons("./icons/", "../static/icons.svg");
processIcons("./icons-outline/", "../static/icons-o.svg");
processIcons("./files/", "../static/files.svg");

function processIcons(INPUT, OUTPUT) {
  console.log("Processing icons from " + INPUT + " to " + OUTPUT);
  var spriteso = svgstore();

  fs.readdirSync(INPUT).forEach((file) => {
    if (file.includes(".svg")) {
      console.log(" - " + file);
      addIcon(INPUT, file.replace(".svg", ""), file, spriteso);
    }
  });

  fs.writeFileSync(OUTPUT, spriteso.toString());
}

function addIcon(INPUT, name, file, s) {
  file = file || name + ".svg";
  s.add(name, fs.readFileSync(INPUT + file, "utf8"));
}
