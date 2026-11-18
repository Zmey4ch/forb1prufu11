// ===== Иллюстрации для Sprechen Teil 2 (SVG) =====
const SKIN=["#f1c7a5","#d9a27a","#a8714d","#7b4a2d"];
function person(x,g,o={}){
  const s=o.s||1, skin=o.skin||SKIN[0], shirt=o.shirt||"#3d6fb0", pants=o.pants||"#2d2a26", hair=o.hair||"#3b2a1d", dir=o.dir||1;
  const P=(v)=>v*s;
  const sy=g-P(88), hy=g-P(102);
  let arms="";
  const sh=[x-P(15),sy+P(4)], sh2=[x+P(15),sy+P(4)];
  const line=(a,b,c,d,col=shirt)=>`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${col}" stroke-width="${P(8)}" stroke-linecap="round"/>`;
  const arm=o.arm||"down";
  if(arm==="down"){arms=line(sh[0],sh[1],sh[0]-P(4),sy+P(40))+line(sh2[0],sh2[1],sh2[0]+P(4),sy+P(40));}
  if(arm==="point"){arms=line(sh[0],sh[1],sh[0]-P(4),sy+P(40))+line(x+dir*P(15),sy+P(4),x+dir*P(48),sy-P(6));
    if(dir<0) arms=line(sh2[0],sh2[1],sh2[0]+P(4),sy+P(40))+line(sh[0],sh[1],x-P(48),sy-P(6));}
  if(arm==="carry"){arms=line(sh[0],sh[1],x+dir*P(30),sy+P(22))+line(sh2[0],sh2[1],x+dir*P(38),sy+P(22));}
  if(arm==="up"){arms=line(sh[0],sh[1],sh[0]-P(10),sy-P(30))+line(sh2[0],sh2[1],sh2[0]+P(10),sy-P(30));}
  if(arm==="phone"){arms=line(sh[0],sh[1],sh[0]-P(4),sy+P(40))+line(sh2[0],sh2[1],x+P(13),hy+P(6))+`<rect x="${x+P(9)}" y="${hy-P(6)}" width="${P(6)}" height="${P(14)}" rx="${P(1.5)}" fill="#222"/>`;}
  if(arm==="wave"){arms=line(sh[0],sh[1],sh[0]-P(4),sy+P(40))+line(sh2[0],sh2[1],sh2[0]+P(20),sy-P(26));}
  const legs=`<line x1="${x-P(7)}" y1="${g-P(46)}" x2="${x-P(9)}" y2="${g}" stroke="${pants}" stroke-width="${P(10)}" stroke-linecap="round"/><line x1="${x+P(7)}" y1="${g-P(46)}" x2="${x+P(9)}" y2="${g}" stroke="${pants}" stroke-width="${P(10)}" stroke-linecap="round"/>`;
  const body=o.dress?`<path d="M${x-P(15)} ${sy} L${x+P(15)} ${sy} L${x+P(22)} ${g-P(36)} L${x-P(22)} ${g-P(36)} Z" fill="${shirt}"/>`:`<rect x="${x-P(16)}" y="${sy}" width="${P(32)}" height="${P(46)}" rx="${P(9)}" fill="${shirt}"/>`;
  const apron=o.apron?`<rect x="${x-P(12)}" y="${sy+P(14)}" width="${P(24)}" height="${P(40)}" rx="${P(3)}" fill="#fff" opacity=".9"/>`:"";
  const hairS=o.long?`<path d="M${x-P(13)} ${hy+P(2)} Q${x} ${hy-P(22)} ${x+P(13)} ${hy+P(2)} L${x+P(14)} ${hy+P(20)} L${x-P(14)} ${hy+P(20)} Z" fill="${hair}"/>`:`<path d="M${x-P(12)} ${hy-P(1)} Q${x} ${hy-P(19)} ${x+P(12)} ${hy-P(1)} Z" fill="${hair}"/>`;
  const head=`<circle cx="${x}" cy="${hy}" r="${P(12)}" fill="${skin}"/>`;
  const glasses=o.glasses?`<circle cx="${x-P(5)}" cy="${hy}" r="${P(3.5)}" fill="none" stroke="#222" stroke-width="${P(1.4)}"/><circle cx="${x+P(5)}" cy="${hy}" r="${P(3.5)}" fill="none" stroke="#222" stroke-width="${P(1.4)}"/>`:"";
  return `<g>${o.long?hairS:""}${legs}${body}${apron}${arms}${head}${o.long?"":hairS}${glasses}</g>`;
}
function seated(x,seat,o={}){
  const s=o.s||1, skin=o.skin||SKIN[0], shirt=o.shirt||"#3d6fb0", pants=o.pants||"#2d2a26", hair=o.hair||"#3b2a1d", d=o.dir||1;
  const P=(v)=>v*s, top=seat-P(46), hy=top-P(14);
  const legs=`<path d="M${x} ${seat} L${x+d*P(26)} ${seat} L${x+d*P(26)} ${seat+P(34)}" fill="none" stroke="${pants}" stroke-width="${P(10)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const body=`<rect x="${x-P(15)}" y="${top}" width="${P(30)}" height="${P(48)}" rx="${P(9)}" fill="${shirt}"/>`;
  const arm=o.arm==="reach"?`<line x1="${x}" y1="${top+P(8)}" x2="${x+d*P(40)}" y2="${top+P(18)}" stroke="${shirt}" stroke-width="${P(8)}" stroke-linecap="round"/>`
    :o.arm==="book"?`<line x1="${x}" y1="${top+P(10)}" x2="${x+d*P(24)}" y2="${top+P(18)}" stroke="${shirt}" stroke-width="${P(8)}" stroke-linecap="round"/><rect x="${x+d*P(20)-P(9)}" y="${top+P(2)}" width="${P(18)}" height="${P(22)}" fill="#e3a92b"/>`
    :o.arm==="raise"?`<line x1="${x}" y1="${top+P(8)}" x2="${x+d*P(8)}" y2="${top-P(36)}" stroke="${shirt}" stroke-width="${P(8)}" stroke-linecap="round"/><circle cx="${x+d*P(8)}" cy="${top-P(38)}" r="${P(5)}" fill="${skin}"/>`
    :`<line x1="${x}" y1="${top+P(8)}" x2="${x+d*P(20)}" y2="${seat-P(4)}" stroke="${shirt}" stroke-width="${P(8)}" stroke-linecap="round"/>`;
  const hairS=o.long?`<path d="M${x-P(13)} ${hy+P(2)} Q${x} ${hy-P(22)} ${x+P(13)} ${hy+P(2)} L${x+P(14)} ${hy+P(20)} L${x-P(14)} ${hy+P(20)} Z" fill="${hair}"/>`:`<path d="M${x-P(12)} ${hy-P(1)} Q${x} ${hy-P(19)} ${x+P(12)} ${hy-P(1)} Z" fill="${hair}"/>`;
  return `<g>${o.long?hairS:""}${legs}${body}${arm}<circle cx="${x}" cy="${hy}" r="${P(12)}" fill="${skin}"/>${o.long?"":hairS}${o.sling?`<path d="M${x-P(12)} ${top+P(4)} L${x+d*P(14)} ${top+P(30)}" stroke="#fff" stroke-width="${P(5)}"/>`:""}</g>`;
}
const svgWrap=(inner,title)=>`<svg class="scene" viewBox="0 0 400 260" role="img" aria-label="${title}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

const SCENES=[
 {id:"markt",title:"Einkaufen auf dem Markt",
  beschreibung:"Ein Wochenmarkt im Freien an einem sonnigen Tag. In der Mitte steht ein Marktstand mit einem rot-weiß gestreiften Dach. Auf dem Stand liegen Kisten mit roten Tomaten, grünen Äpfeln und gelben Bananen. Links hinter dem Stand steht ein Verkäufer mit Bart und weißer Schürze. Rechts steht eine Frau mit langen Haaren, einem grünen Kleid und einem Einkaufskorb; sie zeigt auf das Obst. Neben ihr steht ein kleines Kind. Im Hintergrund sieht man weitere Stände und die Sonne.",
  fragen:["Wo kaufen Sie normalerweise ein – im Supermarkt oder auf dem Markt? Warum?","Wie ist das Einkaufen in Ihrem Heimatland?","Was kaufen Sie gern ein?"],
  words:["markt","stand","obst","gemüse","tomate","apfel","äpfel","banane","verkäufer","frau","kind","korb","kauf","sonne","schürze"],
  svg:()=>svgWrap(`<rect width="400" height="260" fill="#cfe6f5"/><circle cx="350" cy="40" r="22" fill="#f6c443"/>
   <rect x="10" y="120" width="70" height="70" fill="#d8d2c4"/><path d="M5 120 L85 120 L75 100 L15 100Z" fill="#6a9a5b"/>
   <rect x="320" y="125" width="70" height="65" fill="#d8d2c4"/><path d="M315 125 L395 125 L385 105 L325 105Z" fill="#5b7fa8"/>
   <rect y="200" width="400" height="60" fill="#b9ad97"/>
   ${person(150,200,{shirt:"#7a5a3a",apron:true,hair:"#2b1d12",skin:SKIN[1],arm:"down"})}<path d="M140 108 Q150 122 160 108" fill="#2b1d12"/>
   <rect x="100" y="150" width="160" height="50" fill="#9b6b3d"/>
   <path d="M90 80 L270 80 L258 60 L102 60Z" fill="#c8412b"/><path d="M112 60 L105 80 M136 60 L135 80 M160 60 L162 80 M184 60 L190 80 M208 60 L218 80 M232 60 L246 80" stroke="#fff" stroke-width="9"/>
   <line x1="104" y1="80" x2="104" y2="150" stroke="#6b4a2a" stroke-width="5"/><line x1="256" y1="80" x2="256" y2="150" stroke="#6b4a2a" stroke-width="5"/>
   <rect x="108" y="136" width="44" height="18" fill="#c99a5b"/>${[116,126,136,146].map(c=>`<circle cx="${c}" cy="134" r="6" fill="#d7352a"/>`).join("")}
   <rect x="158" y="136" width="44" height="18" fill="#c99a5b"/>${[166,176,186,196].map(c=>`<circle cx="${c}" cy="134" r="6" fill="#7cb342"/>`).join("")}
   <rect x="208" y="136" width="44" height="18" fill="#c99a5b"/><path d="M214 134 Q230 118 246 134" stroke="#f2c230" stroke-width="7" fill="none"/><path d="M216 130 Q230 114 244 130" stroke="#e6b422" stroke-width="6" fill="none"/>
   ${person(305,232,{shirt:"#3f8a5a",dress:true,long:true,hair:"#6b3b1e",arm:"point",dir:-1,pants:SKIN[0]})}
   <path d="M318 175 q12 0 12 14 h-24 q0 -14 12 -14z" fill="none" stroke="#8a5a2b" stroke-width="3"/><rect x="306" y="188" width="24" height="16" rx="3" fill="#b07a40"/>
   ${person(350,232,{s:.6,shirt:"#e3a92b",hair:"#6b3b1e",arm:"down"})}`,"Markt")},
 {id:"familie",title:"Familie beim Abendessen",
  beschreibung:"Eine Familie sitzt in der Küche am Tisch und isst zu Abend. Es ist Abend, draußen vor dem Fenster ist es dunkel und man sieht den Mond. Über dem Tisch hängt eine Lampe. Links sitzt der Vater mit Brille, rechts die Mutter mit langen Haaren; beide greifen nach dem Essen. In der Mitte sitzen ein Junge und ein kleines Mädchen. Auf dem Tisch stehen Teller, eine große Schüssel mit Salat, Gläser und ein Brot.",
  fragen:["Essen Sie oft mit Ihrer Familie zusammen? Wann?","Wer kocht bei Ihnen zu Hause?","Was isst man in Ihrem Heimatland gern zum Abendessen?"],
  words:["familie","tisch","essen","abendessen","vater","mutter","kind","sohn","tochter","teller","salat","schüssel","lampe","küche","brot","fenster","glas","gläser"],
  svg:()=>svgWrap(`<rect width="400" height="260" fill="#f3e3c7"/><rect y="200" width="400" height="60" fill="#c9a77c"/>
   <rect x="290" y="30" width="80" height="70" fill="#22324f" stroke="#fff" stroke-width="5"/><line x1="330" y1="30" x2="330" y2="100" stroke="#fff" stroke-width="4"/><circle cx="352" cy="52" r="9" fill="#f6e7a5"/>
   <line x1="200" y1="0" x2="200" y2="40" stroke="#555" stroke-width="2"/><path d="M178 58 L222 58 L210 40 L190 40Z" fill="#e3a92b"/><ellipse cx="200" cy="62" rx="10" ry="4" fill="#fff6c4"/>
   ${seated(80,180,{shirt:"#2c5d8f",dir:1,arm:"reach"})}<circle cx="75" cy="120" r="3.5" fill="none" stroke="#222" stroke-width="1.4"/><circle cx="85" cy="120" r="3.5" fill="none" stroke="#222" stroke-width="1.4"/>
   ${seated(320,180,{shirt:"#b8433a",long:true,hair:"#4a2a17",dir:-1,arm:"reach"})}
   ${seated(165,182,{s:.7,shirt:"#4d9a6a",hair:"#3b2a1d",arm:"down"})}${seated(235,182,{s:.62,shirt:"#e08bb0",long:true,hair:"#3b2a1d",dir:-1,arm:"down"})}
   <rect x="70" y="158" width="260" height="14" rx="3" fill="#8a5a2b"/><rect x="90" y="172" width="10" height="45" fill="#7a4e24"/><rect x="300" y="172" width="10" height="45" fill="#7a4e24"/>
   ${[115,165,235,285].map(c=>`<ellipse cx="${c}" cy="156" rx="17" ry="5" fill="#fff"/>`).join("")}
   <path d="M180 150 Q200 170 220 150Z" fill="#f2f2f2"/><circle cx="192" cy="148" r="5" fill="#6bbf59"/><circle cx="203" cy="146" r="5" fill="#d7352a"/><circle cx="212" cy="149" r="4" fill="#6bbf59"/>
   <ellipse cx="140" cy="150" rx="15" ry="7" fill="#c78a43"/><rect x="255" y="136" width="9" height="18" fill="#cfe6f5" opacity=".9"/><rect x="132" y="138" width="0" height="0"/>`,"Familie")},
 {id:"arzt",title:"Im Wartezimmer beim Arzt",
  beschreibung:"Ein Wartezimmer in einer Arztpraxis. An der Wand steht das Schild „Praxis Dr. Berg“ und es hängt eine Uhr, es ist neun Uhr. Links sitzen drei Patienten auf Stühlen: ein älterer Mann mit Brille liest eine Zeitschrift, eine Mutter sitzt mit ihrem kleinen Kind, das Kind hat einen Arm in einer Schlinge. Rechts ist die Anmeldung; dort steht eine Arzthelferin in Weiß hinter dem Tresen, und ein junger Mann zeigt ihr seine Versichertenkarte. In der Ecke steht eine Pflanze.",
  fragen:["Wie oft gehen Sie zum Arzt?","Wie ist ein Arztbesuch in Ihrem Heimatland? Muss man lange warten?","Was machen Sie, wenn Sie krank sind?"],
  words:["arzt","praxis","wartezimmer","patient","stuhl","uhr","zeitschrift","kind","mutter","arm","anmeldung","arzthelferin","karte","versichertenkarte","pflanze","warten","krank"],
  svg:()=>svgWrap(`<rect width="400" height="260" fill="#e7eef0"/><rect y="205" width="400" height="55" fill="#b5c2c4"/>
   <rect x="40" y="22" width="130" height="30" rx="4" fill="#fff" stroke="#2c5d8f" stroke-width="2"/><text x="105" y="43" font-size="15" text-anchor="middle" font-family="sans-serif" fill="#2c5d8f" font-weight="700">Praxis Dr. Berg</text>
   <circle cx="215" cy="45" r="20" fill="#fff" stroke="#333" stroke-width="3"/><line x1="215" y1="45" x2="215" y2="30" stroke="#333" stroke-width="3"/><line x1="215" y1="45" x2="203" y2="45" stroke="#333" stroke-width="2.5"/>
   ${[45,105,165].map(c=>`<rect x="${c-18}" y="178" width="44" height="8" fill="#6c7a89"/><rect x="${c-18}" y="186" width="5" height="22" fill="#6c7a89"/><rect x="${c+21}" y="186" width="5" height="22" fill="#6c7a89"/>`).join("")}
   ${seated(45,178,{shirt:"#7a6a56",hair:"#cfcfcf",arm:"book"})}<circle cx="40" cy="118" r="3.5" fill="none" stroke="#222" stroke-width="1.4"/><circle cx="50" cy="118" r="3.5" fill="none" stroke="#222" stroke-width="1.4"/>
   ${seated(105,178,{shirt:"#9a4f8a",long:true,hair:"#2b1d12",skin:SKIN[2]})}${seated(165,178,{s:.65,shirt:"#e3a92b",hair:"#2b1d12",skin:SKIN[2],sling:true})}
   ${person(330,190,{shirt:"#ffffff",long:true,hair:"#c58b3a",arm:"down"})}<rect x="270" y="140" width="120" height="70" fill="#8fa9b8"/><rect x="265" y="134" width="130" height="10" fill="#6c8696"/>
   ${person(245,232,{shirt:"#2f7d4f",hair:"#111",skin:SKIN[3],arm:"point",dir:1})}<rect x="290" y="114" width="16" height="11" rx="2" fill="#3a8fd8" stroke="#fff"/>
   <rect x="365" y="180" width="22" height="28" fill="#a0522d"/><path d="M376 180 C360 150 350 160 368 140 C372 160 380 130 386 150 C392 140 398 160 376 180Z" fill="#4f8f3f"/>`,"Arztpraxis")},
 {id:"spielplatz",title:"Nachmittag auf dem Spielplatz",
  beschreibung:"Ein Spielplatz in einem Park an einem sonnigen Nachmittag. Links ist eine Rutsche, ein Junge rutscht gerade herunter und hebt die Arme. In der Mitte steht eine Schaukel, darauf schaukelt ein Mädchen. Rechts sitzt eine Frau auf einer Bank und liest ein Buch. Vorne rechts spielt ein kleines Kind im Sandkasten. Im Hintergrund sieht man grüne Bäume.",
  fragen:["Was machen Sie in Ihrer Freizeit mit Kindern oder mit der Familie?","Gibt es in Ihrem Heimatland viele Spielplätze und Parks?","Wohin gehen Sie gern, wenn das Wetter schön ist?"],
  words:["spielplatz","park","rutsche","rutscht","schaukel","schaukelt","junge","mädchen","kind","bank","buch","liest","sandkasten","sand","baum","bäume","sonne","spielen"],
  svg:()=>svgWrap(`<rect width="400" height="260" fill="#d4ecf7"/><circle cx="60" cy="40" r="20" fill="#f6c443"/>
   ${[40,130,300,370].map(c=>`<rect x="${c-5}" y="90" width="10" height="60" fill="#7a4e24"/><circle cx="${c}" cy="80" r="32" fill="#6aa84f"/>`).join("")}
   <rect y="150" width="400" height="110" fill="#9fcf7c"/>
   <line x1="30" y1="100" x2="30" y2="200" stroke="#c8412b" stroke-width="6"/><line x1="55" y1="100" x2="55" y2="200" stroke="#c8412b" stroke-width="6"/><line x1="30" y1="100" x2="55" y2="100" stroke="#c8412b" stroke-width="6"/>
   ${[120,140,160,180].map(y=>`<line x1="30" y1="${y}" x2="55" y2="${y}" stroke="#c8412b" stroke-width="3"/>`).join("")}<path d="M55 100 L130 200" stroke="#e3a92b" stroke-width="12" stroke-linecap="round"/>
   <g transform="rotate(30 95 150)">${person(95,195,{s:.6,shirt:"#2c5d8f",arm:"up"})}</g>
   <line x1="160" y1="80" x2="250" y2="80" stroke="#555" stroke-width="6"/><line x1="160" y1="80" x2="150" y2="210" stroke="#555" stroke-width="6"/><line x1="250" y1="80" x2="260" y2="210" stroke="#555" stroke-width="6"/>
   <line x1="195" y1="80" x2="195" y2="165" stroke="#333" stroke-width="2"/><line x1="215" y1="80" x2="215" y2="165" stroke="#333" stroke-width="2"/><rect x="190" y="164" width="30" height="6" fill="#7a4e24"/>
   ${seated(205,166,{s:.6,shirt:"#e08bb0",long:true,hair:"#e0b050"})}
   <rect x="290" y="178" width="90" height="8" fill="#7a4e24"/><rect x="295" y="186" width="6" height="20" fill="#7a4e24"/><rect x="370" y="186" width="6" height="20" fill="#7a4e24"/>
   ${seated(320,178,{shirt:"#3f8a5a",long:true,hair:"#2b1d12",skin:SKIN[1],arm:"book"})}
   <rect x="250" y="222" width="100" height="30" fill="#e9d59c" stroke="#b08b4a" stroke-width="4"/>${seated(300,240,{s:.45,shirt:"#e3a92b",hair:"#3b2a1d"})}<rect x="318" y="226" width="12" height="10" fill="#c8412b"/>`,"Spielplatz")},
 {id:"umzug",title:"Der Umzug",
  beschreibung:"Vor einem Haus steht ein weißer Umzugswagen, er ist rechts im Bild. Zwei Männer tragen zusammen einen großen Karton zum Wagen. Links vor dem Haus stehen viele Kartons übereinander, auf einem steht „Küche“. Eine Frau steht an der Haustür, hält eine Pflanze und winkt. Es ist Tag, der Himmel ist blau.",
  fragen:["Sind Sie schon einmal umgezogen? Wie war das?","Wer hat Ihnen geholfen?","Wie findet man in Ihrem Heimatland eine Wohnung?"],
  words:["umzug","umziehen","wagen","lkw","auto","karton","kartons","kiste","tragen","männer","mann","frau","haus","tür","pflanze","winkt","helfen"],
  svg:()=>svgWrap(`<rect width="400" height="260" fill="#cfe6f5"/><rect y="205" width="400" height="55" fill="#a9a9a9"/>
   <rect x="10" y="50" width="120" height="155" fill="#e6c8a0"/><path d="M0 55 L70 10 L140 55Z" fill="#a0522d"/><rect x="55" y="130" width="34" height="75" fill="#7a4e24"/><rect x="25" y="75" width="26" height="26" fill="#fff" stroke="#7a4e24" stroke-width="3"/><rect x="90" y="75" width="26" height="26" fill="#fff" stroke="#7a4e24" stroke-width="3"/>
   ${person(72,205,{shirt:"#c8412b",long:true,hair:"#2b1d12",arm:"wave"})}<rect x="44" y="140" width="12" height="12" fill="#a0522d"/><circle cx="50" cy="133" r="10" fill="#4f8f3f"/>
   ${[[0,0],[1,0],[0,1]].map(([i,j])=>`<rect x="${140+i*36}" y="${170-j*34}" width="34" height="34" fill="#c99a5b" stroke="#8a5a2b" stroke-width="2"/>`).join("")}<text x="157" y="192" font-size="9" text-anchor="middle" font-family="sans-serif" fill="#4a3216">Küche</text>
   <rect x="275" y="90" width="110" height="105" rx="4" fill="#fafafa" stroke="#bbb" stroke-width="2"/><rect x="385" y="125" width="15" height="70" fill="#e8e8e8"/><circle cx="300" cy="200" r="13" fill="#333"/><circle cx="370" cy="200" r="13" fill="#333"/>
   
   ${person(205,232,{shirt:"#2c5d8f",skin:SKIN[1],arm:"carry",dir:1})}${person(265,232,{shirt:"#3f8a5a",arm:"carry",dir:-1,hair:"#c58b3a"})}
   <rect x="215" y="150" width="45" height="30" fill="#c99a5b" stroke="#8a5a2b" stroke-width="2"/>`,"Umzug")},
];

// ----- Новые картинки -----
const rain=()=>Array.from({length:60},(_,i)=>{const x=(i*53)%400,y=(i*37)%200;return `<line x1="${x}" y1="${y}" x2="${x-4}" y2="${y+12}" stroke="#7d8fa0" stroke-width="1.5"/>`;}).join("");
SCENES.push(
 {id:"bus",title:"An der Bushaltestelle",
  beschreibung:"Eine Bushaltestelle an einem regnerischen Tag. Der Himmel ist grau und es regnet. Links ist ein Wartehäuschen mit Dach und einer Bank. Auf der Bank sitzt eine ältere Frau mit grauen Haaren und einer Tasche. Neben ihr steht ein Mann unter dem Dach und telefoniert. Vor der Haltestelle steht ein Schild mit einem „H“. Eine junge Frau mit einem roten Regenschirm wartet draußen im Regen. Rechts kommt gerade ein gelber Bus mit der Nummer 5.",
  fragen:["Wie fahren Sie zur Arbeit oder zum Kurs?","Wie ist der öffentliche Verkehr in Ihrem Heimatland?","Was machen Sie, wenn der Bus Verspätung hat?"],
  words:["bus","haltestelle","regen","regnet","regenschirm","schirm","bank","frau","mann","telefoniert","handy","warten","wartet","schild","dach","gelb","tasche"],
  svg:()=>svgWrap(`<rect width="400" height="260" fill="#c3ccd3"/>${rain()}<rect y="205" width="400" height="55" fill="#8d8d8d"/><rect y="200" width="400" height="10" fill="#b3b3b3"/>
   <rect x="35" y="78" width="135" height="122" fill="#e4eef3" opacity=".6"/><rect x="25" y="68" width="155" height="10" fill="#2c5d8f"/><rect x="35" y="78" width="5" height="122" fill="#2c5d8f"/><rect x="165" y="78" width="5" height="122" fill="#2c5d8f"/>
   <rect x="50" y="165" width="80" height="7" fill="#7a4e24"/>
   ${seated(75,165,{shirt:"#7a5d8a",long:true,hair:"#d0d0d0"})}<rect x="100" y="150" width="18" height="15" rx="3" fill="#5a3b22"/>
   ${person(145,205,{shirt:"#4d6b3c",arm:"phone",hair:"#2b1d12",skin:SKIN[1]})}
   <line x1="195" y1="60" x2="195" y2="205" stroke="#666" stroke-width="4"/><circle cx="195" cy="55" r="15" fill="#f2c230" stroke="#2f7d4f" stroke-width="3"/><text x="195" y="61" font-size="16" text-anchor="middle" font-weight="700" font-family="sans-serif" fill="#2f7d4f">H</text>
   ${person(240,215,{shirt:"#3d6fb0",long:true,hair:"#6b3b1e",arm:"wave"})}<line x1="260" y1="100" x2="258" y2="62" stroke="#333" stroke-width="2.5"/><path d="M218 66 Q258 18 298 66 Z" fill="#c8412b"/>
   <rect x="290" y="105" width="130" height="92" rx="10" fill="#e3a92b"/><rect x="300" y="115" width="35" height="35" rx="3" fill="#cfe6f5"/><rect x="345" y="115" width="35" height="35" rx="3" fill="#cfe6f5"/><rect x="390" y="115" width="20" height="35" fill="#cfe6f5"/><rect x="296" y="160" width="20" height="30" fill="#b07a20"/>
   <rect x="300" y="96" width="40" height="12" rx="2" fill="#222"/><text x="320" y="106" font-size="10" text-anchor="middle" font-family="sans-serif" fill="#f6c443">5</text><circle cx="320" cy="198" r="13" fill="#333"/><circle cx="395" cy="198" r="13" fill="#333"/>`,"Bushaltestelle")},
 {id:"kasse",title:"An der Kasse im Supermarkt",
  beschreibung:"Ein Supermarkt an der Kasse. Im Hintergrund sieht man Regale mit vielen Produkten. Links steht eine Kassiererin mit Brille hinter der Kasse. Auf dem Kassenband liegen eine Milch, ein Brot und Äpfel. Ein Mann legt seine Einkäufe auf das Band. Rechts wartet eine Frau mit einem Einkaufswagen.",
  fragen:["Wo und wie oft kaufen Sie ein?","Bezahlen Sie lieber bar oder mit Karte? Warum?","Was ist beim Einkaufen in Deutschland anders als in Ihrem Heimatland?"],
  words:["supermarkt","kasse","kassiererin","regal","milch","brot","äpfel","apfel","band","einkaufswagen","wagen","mann","frau","bezahlen","einkaufen","warten","einkäufe"],
  svg:()=>svgWrap(`<rect width="400" height="260" fill="#eef0e6"/><rect y="205" width="400" height="55" fill="#d6d0c2"/>
   ${[30,62,94].map(y=>`<rect x="10" y="${y+24}" width="380" height="4" fill="#9a9a9a"/>`+Array.from({length:19},(_,i)=>`<rect x="${14+i*20}" y="${y}" width="14" height="24" fill="${["#c8412b","#2c5d8f","#e3a92b","#4f8f3f","#9a4f8a"][(i+y)%5]}"/>`).join("")).join("")}
   ${person(65,215,{shirt:"#c8412b",long:true,hair:"#c58b3a",arm:"down"})}<circle cx="60" cy="113" r="3.5" fill="none" stroke="#222" stroke-width="1.4"/><circle cx="70" cy="113" r="3.5" fill="none" stroke="#222" stroke-width="1.4"/>
   <rect x="40" y="150" width="240" height="55" fill="#6c7a89"/><rect x="40" y="144" width="240" height="8" fill="#333"/><rect x="85" y="118" width="40" height="28" rx="3" fill="#444"/><rect x="90" y="122" width="30" height="12" fill="#9fd3a8"/>
   <rect x="150" y="118" width="18" height="27" fill="#fff" stroke="#3a8fd8" stroke-width="3"/><ellipse cx="195" cy="137" rx="18" ry="9" fill="#c78a43"/><circle cx="225" cy="138" r="7" fill="#d7352a"/><circle cx="239" cy="138" r="7" fill="#7cb342"/>
   ${person(270,232,{shirt:"#2f7d4f",hair:"#111",skin:SKIN[2],arm:"point",dir:-1})}
   <path d="M300 140 L352 140 L346 180 L306 180 Z" fill="none" stroke="#777" stroke-width="3"/><path d="M302 152 L350 152 M304 166 L348 166" stroke="#777" stroke-width="2"/><line x1="352" y1="140" x2="362" y2="128" stroke="#777" stroke-width="3"/><circle cx="312" cy="200" r="6" fill="#444"/><circle cx="342" cy="200" r="6" fill="#444"/><line x1="306" y1="180" x2="312" y2="194" stroke="#777" stroke-width="3"/><line x1="346" y1="180" x2="342" y2="194" stroke="#777" stroke-width="3"/>
   ${person(375,232,{shirt:"#9a4f8a",long:true,hair:"#2b1d12",arm:"point",dir:-1})}`,"Supermarktkasse")},
 {id:"buero",title:"Im Büro",
  beschreibung:"Ein Büro. Links sitzt eine Frau mit langen Haaren am Schreibtisch und arbeitet am Computer. In der Mitte steht ein Mann im blauen Hemd und telefoniert mit dem Handy. Hinter ihm ist ein Fenster, draußen sieht man Häuser. Rechts ist ein zweiter Schreibtisch mit einem Computer und Papieren. An der Wand hängt eine Uhr, es ist drei Uhr. Vorne rechts steht eine Pflanze.",
  fragen:["Was sind Sie von Beruf, oder was möchten Sie in Deutschland arbeiten?","Wie sieht ein typischer Arbeitstag bei Ihnen aus?","Arbeiten Sie lieber allein oder im Team? Warum?"],
  words:["büro","schreibtisch","computer","frau","mann","telefoniert","handy","telefon","fenster","uhr","arbeitet","arbeiten","häuser","pflanze","papier"],
  svg:()=>svgWrap(`<rect width="400" height="260" fill="#ece6da"/><rect y="210" width="400" height="50" fill="#a99c86"/>
   <rect x="150" y="25" width="100" height="85" fill="#cfe6f5" stroke="#fff" stroke-width="5"/><rect x="160" y="65" width="20" height="45" fill="#9aa7b4"/><rect x="185" y="50" width="25" height="60" fill="#8193a3"/><rect x="215" y="70" width="25" height="40" fill="#9aa7b4"/>
   <circle cx="335" cy="45" r="18" fill="#fff" stroke="#333" stroke-width="3"/><line x1="335" y1="45" x2="335" y2="31" stroke="#333" stroke-width="2.5"/><line x1="335" y1="45" x2="346" y2="45" stroke="#333" stroke-width="3"/>
   <rect x="40" y="105" width="55" height="38" rx="3" fill="#2d2a26"/><rect x="44" y="109" width="47" height="30" fill="#5b8fc7"/><rect x="62" y="143" width="10" height="8" fill="#2d2a26"/>
   ${seated(130,180,{dir:-1,arm:"reach",long:true,shirt:"#c8412b",hair:"#2b1d12"})}
   <rect x="15" y="150" width="140" height="8" fill="#8a5a2b"/><rect x="22" y="158" width="7" height="55" fill="#7a4e24"/><rect x="140" y="158" width="7" height="55" fill="#7a4e24"/>
   ${person(205,225,{shirt:"#2c5d8f",arm:"phone",hair:"#6b3b1e"})}
   <rect x="270" y="150" width="120" height="8" fill="#8a5a2b"/><rect x="277" y="158" width="7" height="55" fill="#7a4e24"/><rect x="375" y="158" width="7" height="55" fill="#7a4e24"/>
   <rect x="310" y="105" width="55" height="38" rx="3" fill="#2d2a26"/><rect x="314" y="109" width="47" height="30" fill="#5b8fc7"/><rect x="332" y="143" width="10" height="8" fill="#2d2a26"/><rect x="278" y="140" width="22" height="9" fill="#fff" transform="rotate(-6 289 145)"/><rect x="280" y="136" width="22" height="9" fill="#f4f4f4" transform="rotate(4 291 140)"/>
   <rect x="360" y="225" width="24" height="26" fill="#a0522d"/><path d="M372 225 C352 195 345 205 362 182 C368 200 375 175 382 192 C392 180 398 205 372 225Z" fill="#4f8f3f"/>`,"Büro")},
 {id:"restaurant",title:"Im Restaurant",
  beschreibung:"Ein Restaurant am Abend. Ein Mann und eine Frau sitzen an einem runden Tisch. Auf dem Tisch stehen eine Kerze, zwei Teller und zwei Gläser. Die Frau liest die Speisekarte. Rechts steht ein Kellner in schwarzer Kleidung mit einer weißen Schürze; er hat einen Block in der Hand und nimmt die Bestellung auf. An der Wand hängt ein Bild mit Bergen.",
  fragen:["Gehen Sie gern ins Restaurant? Wohin und mit wem?","Was ist ein typisches Essen aus Ihrem Heimatland?","Kochen Sie lieber selbst oder essen Sie lieber im Restaurant? Warum?"],
  words:["restaurant","tisch","kerze","teller","glas","gläser","speisekarte","karte","kellner","bestellung","bestellen","mann","frau","bild","essen","abend","block"],
  svg:()=>svgWrap(`<rect width="400" height="260" fill="#f0dcc4"/><rect y="205" width="400" height="55" fill="#8a5a2b"/>
   <rect x="40" y="35" width="80" height="55" fill="#cfe6f5" stroke="#7a4e24" stroke-width="5"/><path d="M45 85 L65 55 L80 72 L95 50 L115 85Z" fill="#6aa84f"/><path d="M60 62 L65 55 L70 62Z" fill="#fff"/>
   <line x1="200" y1="0" x2="200" y2="30" stroke="#555" stroke-width="2"/><path d="M185 45 L215 45 L208 30 L192 30Z" fill="#c8412b"/>
   ${seated(130,180,{shirt:"#2c5d8f",arm:"reach",hair:"#2b1d12"})}${seated(270,180,{dir:-1,arm:"book",long:true,shirt:"#9a4f8a",hair:"#c58b3a"})}
   <ellipse cx="200" cy="152" rx="75" ry="10" fill="#fff"/><rect x="195" y="160" width="10" height="48" fill="#5a3b22"/><ellipse cx="200" cy="208" rx="25" ry="5" fill="#5a3b22"/>
   <ellipse cx="165" cy="149" rx="16" ry="4" fill="#ddd"/><ellipse cx="235" cy="149" rx="16" ry="4" fill="#ddd"/><rect x="197" y="128" width="6" height="18" fill="#fff6c4"/><path d="M200 120 Q204 126 200 128 Q196 126 200 120Z" fill="#e3a92b"/>
   <path d="M180 130 L188 130 L186 142 L182 142Z" fill="#cfe6f5"/><line x1="184" y1="142" x2="184" y2="148" stroke="#999"/><path d="M212 130 L220 130 L218 142 L214 142Z" fill="#cfe6f5"/><line x1="216" y1="142" x2="216" y2="148" stroke="#999"/>
   ${person(350,225,{shirt:"#222",pants:"#222",apron:true,arm:"carry",dir:-1,hair:"#111"})}<rect x="308" y="150" width="14" height="18" fill="#fff" stroke="#999"/>`,"Restaurant")},
 {id:"kurs",title:"Im Deutschkurs",
  beschreibung:"Ein Kursraum im Deutschkurs. Hinten hängt ein Whiteboard, darauf steht „Deutschkurs B1“ und „der · die · das“. Rechts steht die Lehrerin mit langen Haaren und zeigt auf das Whiteboard. Vorne im Bild sitzen drei Kursteilnehmer an Tischen. Der Mann in der Mitte meldet sich, er hebt die Hand. Auf den Tischen liegen Bücher.",
  fragen:["Wie lange lernen Sie schon Deutsch? Wie lernen Sie am liebsten?","Wie war die Schule in Ihrem Heimatland?","Was ist für Sie beim Deutschlernen schwer?"],
  words:["kurs","deutschkurs","kursraum","klasse","whiteboard","tafel","lehrerin","lehrer","teilnehmer","schüler","tisch","buch","bücher","hand","meldet","lernen"],
  svg:()=>svgWrap(`<rect width="400" height="260" fill="#eef1ea"/><rect y="205" width="400" height="55" fill="#b9b2a2"/>
   <rect x="40" y="22" width="230" height="95" fill="#fff" stroke="#6c7a89" stroke-width="5"/><text x="155" y="60" font-size="20" text-anchor="middle" font-family="sans-serif" fill="#2c5d8f" font-weight="700">Deutschkurs B1</text><text x="155" y="92" font-size="16" text-anchor="middle" font-family="sans-serif" fill="#c8412b">der · die · das</text>
   ${person(325,190,{shirt:"#2f7d4f",long:true,hair:"#6b3b1e",arm:"point",dir:-1})}
   ${seated(90,235,{shirt:"#e3a92b",long:true,hair:"#2b1d12",skin:SKIN[1]})}${seated(200,235,{shirt:"#2c5d8f",hair:"#111",skin:SKIN[2],arm:"raise"})}${seated(310,235,{shirt:"#c8412b",hair:"#c58b3a"})}
   ${[90,200,310].map(x=>`<rect x="${x-45}" y="205" width="90" height="8" fill="#8a5a2b"/><rect x="${x-40}" y="213" width="6" height="47" fill="#7a4e24"/><rect x="${x+34}" y="213" width="6" height="47" fill="#7a4e24"/><rect x="${x+12}" y="198" width="22" height="7" fill="#4f8f3f"/>`).join("")}`,"Deutschkurs")},
 {id:"grillen",title:"Grillen im Garten",
  beschreibung:"Ein Garten im Sommer, die Sonne scheint. Links steht ein Grill, ein Mann mit Schürze grillt Würstchen; aus dem Grill kommt Rauch. Rechts sitzen eine Frau und ein Mann an einem Tisch und unterhalten sich. Auf dem Tisch stehen eine Schüssel Salat und Getränke. Vorne in der Mitte spielt ein Kind mit einem Ball. Im Hintergrund sieht man einen Zaun und einen Baum.",
  fragen:["Was machen Sie gern im Sommer?","Wie feiern Sie mit Freunden oder mit der Familie?","Grillt man in Ihrem Heimatland auch? Was isst man dort gern?"],
  words:["garten","grill","grillen","grillt","würstchen","wurst","rauch","mann","frau","tisch","salat","getränke","kind","ball","zaun","baum","sommer","sonne"],
  svg:()=>svgWrap(`<rect width="400" height="260" fill="#cde9f6"/><circle cx="350" cy="35" r="20" fill="#f6c443"/>
   ${Array.from({length:27},(_,i)=>`<rect x="${i*15}" y="110" width="11" height="75" rx="3" fill="#d9c09a"/>`).join("")}<rect y="125" width="400" height="5" fill="#c4a87e"/>
   <rect x="22" y="80" width="12" height="100" fill="#7a4e24"/><circle cx="28" cy="70" r="35" fill="#6aa84f"/>
   <rect y="180" width="400" height="80" fill="#8fc46a"/>
   <path d="M60 100 Q50 85 62 72 Q74 60 64 45" stroke="#aaa" stroke-width="5" fill="none" opacity=".8"/><path d="M80 100 Q70 85 82 70" stroke="#bbb" stroke-width="4" fill="none" opacity=".7"/>
   <path d="M45 120 L105 120 Q100 145 75 145 Q50 145 45 120Z" fill="#333"/><line x1="55" y1="140" x2="45" y2="190" stroke="#333" stroke-width="4"/><line x1="95" y1="140" x2="105" y2="190" stroke="#333" stroke-width="4"/>
   ${[58,70,82].map(x=>`<rect x="${x}" y="113" width="12" height="6" rx="3" fill="#a0522d"/>`).join("")}
   ${person(140,210,{shirt:"#2c5d8f",apron:true,arm:"point",dir:-1,hair:"#6b3b1e"})}
   ${seated(250,180,{shirt:"#c8412b",long:true,hair:"#2b1d12",arm:"reach"})}${seated(345,180,{dir:-1,shirt:"#4d6b3c",hair:"#111",skin:SKIN[2],arm:"reach"})}
   <rect x="230" y="158" width="140" height="8" fill="#fff"/><rect x="240" y="166" width="6" height="40" fill="#7a4e24"/><rect x="355" y="166" width="6" height="40" fill="#7a4e24"/>
   <path d="M285 158 Q300 172 315 158Z" fill="#f2f2f2"/><circle cx="294" cy="155" r="4" fill="#6bbf59"/><circle cx="304" cy="154" r="4" fill="#d7352a"/><rect x="325" y="135" width="8" height="23" fill="#4f8f3f"/><rect x="270" y="142" width="7" height="16" fill="#e3a92b"/>
   ${person(200,250,{s:.6,shirt:"#e3a92b",arm:"up",hair:"#c58b3a"})}<circle cx="200" cy="165" r="10" fill="#fff" stroke="#c8412b" stroke-width="3"/>`,"Garten")},
);
