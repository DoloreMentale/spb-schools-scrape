import vision from '@google-cloud/vision';
import fs from "fs/promises";

const client = new vision.ImageAnnotatorClient();

import data from './output.json' assert { type: "json" };

const schools = data;

const writeToFile = async (data) => {
  await fs.writeFile('output.json', JSON.stringify(data));
};

const recogniseScore = async (idx) => {
  const base64Data = schools[idx].img.replace(/^data:image\/png;base64,/, "");

  await fs.writeFile("out.jpg", base64Data, { encoding: 'base64' });

  const result = await client.textDetection('./out.png');

  console.log(result[0]);

  const score = result[0]?.fullTextAnnotation?.text;

  console.log(score);

  schools[idx].score = score;

  await writeToFile(schools);
};

// for (let i = 0; i < schools.length; i++) {
//   if (schools[i].result && !schools[i].score) {
//     await recogniseScore(i);
//   } else {
//     console.log(`#${i} img is empty`);
//   }
// }

await recogniseScore(2);