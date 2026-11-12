const sharp=require('/opt/npm-tools/node_modules/sharp'); const fs=require('fs');
const spr=JSON.parse(fs.readFileSync('sprites.json','utf8')); const names=JSON.parse(fs.readFileSync('names.json','utf8'));
const ids=Object.keys(spr); const cols=8, cell=170, rows=Math.ceil(ids.length/cols);
(async()=>{
  const comps=[];
  for(let i=0;i<ids.length;i++){
    const id=ids[i]; const svg=spr[id].replace('width="100" height="100"','width="150" height="150"');
    const png=await sharp(Buffer.from(svg)).png().toBuffer();
    const x=(i%cols)*cell+10, y=Math.floor(i/cols)*(cell+22)+8;
    comps.push({input:png,left:x,top:y});
    const lab=`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="22"><text x="${cell/2-5}" y="15" font-size="11" font-family="sans-serif" text-anchor="middle" fill="#222">${(i+1)+'. '+names[id].replace(/&/g,'y')}</text></svg>`;
    comps.push({input:Buffer.from(lab),left:(i%cols)*cell+5,top:y+152});
  }
  await sharp({create:{width:cols*cell+10,height:rows*(cell+22)+16,channels:4,background:'#dfeae6'}}).composite(comps).png().toFile('/tmp/sheet.png');
  console.log('sheet ok',rows,'rows');
})();
