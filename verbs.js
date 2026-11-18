// ===== Движок спряжения немецких глаголов (работает без интернета) =====
// Сильные/смешанные глаголы: инфинитив|du (Präsens, "-" = по правилу)|er|Präteritum|Partizip II|вспом. (h/s)
const STRONG_RAW = `backen|-|-|backte|gebacken|h
beginnen|-|-|begann|begonnen|h
beißen|-|-|biss|gebissen|h
bieten|-|-|bot|geboten|h
binden|-|-|band|gebunden|h
bitten|-|-|bat|gebeten|h
blasen|bläst|bläst|blies|geblasen|h
bleiben|-|-|blieb|geblieben|s
braten|brätst|brät|briet|gebraten|h
brechen|brichst|bricht|brach|gebrochen|h
brennen|-|-|brannte|gebrannt|h
bringen|-|-|brachte|gebracht|h
denken|-|-|dachte|gedacht|h
empfehlen|empfiehlst|empfiehlt|empfahl|empfohlen|h
essen|isst|isst|aß|gegessen|h
fahren|fährst|fährt|fuhr|gefahren|s
fallen|fällst|fällt|fiel|gefallen|s
fangen|fängst|fängt|fing|gefangen|h
finden|-|-|fand|gefunden|h
fliegen|-|-|flog|geflogen|s
fliehen|-|-|floh|geflohen|s
fließen|-|-|floss|geflossen|s
frieren|-|-|fror|gefroren|h
geben|gibst|gibt|gab|gegeben|h
gehen|-|-|ging|gegangen|s
gelingen|-|-|gelang|gelungen|s
gelten|giltst|gilt|galt|gegolten|h
genießen|-|-|genoss|genossen|h
geschehen|geschiehst|geschieht|geschah|geschehen|s
gewinnen|-|-|gewann|gewonnen|h
gießen|-|-|goss|gegossen|h
graben|gräbst|gräbt|grub|gegraben|h
greifen|-|-|griff|gegriffen|h
halten|hältst|hält|hielt|gehalten|h
heben|-|-|hob|gehoben|h
heißen|-|-|hieß|geheißen|h
helfen|hilfst|hilft|half|geholfen|h
kennen|-|-|kannte|gekannt|h
klingen|-|-|klang|geklungen|h
kommen|-|-|kam|gekommen|s
laden|lädst|lädt|lud|geladen|h
lassen|lässt|lässt|ließ|gelassen|h
laufen|läufst|läuft|lief|gelaufen|s
leiden|-|-|litt|gelitten|h
leihen|-|-|lieh|geliehen|h
lesen|liest|liest|las|gelesen|h
liegen|-|-|lag|gelegen|h
lügen|-|-|log|gelogen|h
messen|misst|misst|maß|gemessen|h
nehmen|nimmst|nimmt|nahm|genommen|h
nennen|-|-|nannte|genannt|h
pfeifen|-|-|pfiff|gepfiffen|h
raten|rätst|rät|riet|geraten|h
reiben|-|-|rieb|gerieben|h
reißen|-|-|riss|gerissen|h
reiten|-|-|ritt|geritten|s
rennen|-|-|rannte|gerannt|s
riechen|-|-|roch|gerochen|h
rufen|-|-|rief|gerufen|h
scheiden|-|-|schied|geschieden|h
scheinen|-|-|schien|geschienen|h
schieben|-|-|schob|geschoben|h
schießen|-|-|schoss|geschossen|h
schlafen|schläfst|schläft|schlief|geschlafen|h
schlagen|schlägst|schlägt|schlug|geschlagen|h
schließen|-|-|schloss|geschlossen|h
schneiden|-|-|schnitt|geschnitten|h
schreiben|-|-|schrieb|geschrieben|h
schreien|-|-|schrie|geschrien|h
schweigen|-|-|schwieg|geschwiegen|h
schwimmen|-|-|schwamm|geschwommen|s
schwinden|-|-|schwand|geschwunden|s
sehen|siehst|sieht|sah|gesehen|h
singen|-|-|sang|gesungen|h
sinken|-|-|sank|gesunken|s
sitzen|-|-|saß|gesessen|h
sprechen|sprichst|spricht|sprach|gesprochen|h
springen|-|-|sprang|gesprungen|s
stechen|stichst|sticht|stach|gestochen|h
stehen|-|-|stand|gestanden|h
stehlen|stiehlst|stiehlt|stahl|gestohlen|h
steigen|-|-|stieg|gestiegen|s
sterben|stirbst|stirbt|starb|gestorben|s
streiten|-|-|stritt|gestritten|h
tragen|trägst|trägt|trug|getragen|h
treffen|triffst|trifft|traf|getroffen|h
treiben|-|-|trieb|getrieben|h
treten|trittst|tritt|trat|getreten|h
trinken|-|-|trank|getrunken|h
tun|-|-|tat|getan|h
vergessen|vergisst|vergisst|vergaß|vergessen|h
verlieren|-|-|verlor|verloren|h
verzeihen|-|-|verzieh|verziehen|h
wachsen|wächst|wächst|wuchs|gewachsen|s
waschen|wäschst|wäscht|wusch|gewaschen|h
weisen|-|-|wies|gewiesen|h
werben|wirbst|wirbt|warb|geworben|h
werfen|wirfst|wirft|warf|geworfen|h
wiegen|-|-|wog|gewogen|h
ziehen|-|-|zog|gezogen|h
zwingen|-|-|zwang|gezwungen|h`;

// Полностью неправильные
const SPECIAL = {
  sein:{pr:["bin","bist","ist","sind","seid","sind"],pt:["war","warst","war","waren","wart","waren"],p2:"gewesen",aux:"s",k2:["wäre","wärst","wäre","wären","wärt","wären"],imp:["sei","seid","seien Sie"]},
  haben:{pr:["habe","hast","hat","haben","habt","haben"],pt:["hatte","hattest","hatte","hatten","hattet","hatten"],p2:"gehabt",aux:"h",k2:"hätte",imp:["hab","habt","haben Sie"]},
  werden:{pr:["werde","wirst","wird","werden","werdet","werden"],pt:["wurde","wurdest","wurde","wurden","wurdet","wurden"],p2:"geworden",aux:"s",k2:"würde",imp:["werde","werdet","werden Sie"]},
  wissen:{pr:["weiß","weißt","weiß","wissen","wisst","wissen"],pt:"wusste",p2:"gewusst",aux:"h",k2:"wüsste",noimp:1},
  tun:{pr:["tue","tust","tut","tun","tut","tun"],pt:"tat",p2:"getan",aux:"h",imp:["tu","tut","tun Sie"]},
  können:{pr:["kann","kannst","kann","können","könnt","können"],pt:"konnte",p2:"gekonnt",aux:"h",k2:"könnte",modal:1},
  müssen:{pr:["muss","musst","muss","müssen","müsst","müssen"],pt:"musste",p2:"gemusst",aux:"h",k2:"müsste",modal:1},
  dürfen:{pr:["darf","darfst","darf","dürfen","dürft","dürfen"],pt:"durfte",p2:"gedurft",aux:"h",k2:"dürfte",modal:1},
  sollen:{pr:["soll","sollst","soll","sollen","sollt","sollen"],pt:"sollte",p2:"gesollt",aux:"h",k2:"sollte",modal:1},
  wollen:{pr:["will","willst","will","wollen","wollt","wollen"],pt:"wollte",p2:"gewollt",aux:"h",k2:"wollte",modal:1},
  mögen:{pr:["mag","magst","mag","mögen","mögt","mögen"],pt:"mochte",p2:"gemocht",aux:"h",k2:"möchte",modal:1},
};
// Особые формы Konjunktiv II у частых сильных глаголов
const K2_STRONG = {kommen:"käme",gehen:"ginge",geben:"gäbe",finden:"fände",bleiben:"bliebe",lassen:"ließe",stehen:"stünde",liegen:"läge",sitzen:"säße"};

// Частые слабые (правильные) глаголы
const REGULAR = `arbeiten machen wohnen kaufen spielen lernen fragen antworten sagen hören kochen suchen brauchen glauben holen zeigen leben lieben warten öffnen regnen reisen tanzen heiraten zahlen bezahlen besuchen erzählen erklären verdienen verkaufen telefonieren studieren reparieren informieren diskutieren putzen duschen feiern ändern sammeln lächeln wandern klingeln kosten dauern schmecken gehören passen danken gratulieren wünschen hoffen meinen stellen legen setzen packen schicken fehlen folgen führen mieten kündigen bestellen buchen planen üben wiederholen übersetzen melden bereiten freuen interessieren ärgern kümmern erinnern beschweren entschuldigen erholen wachen räumen füllen hören machen zahlen landen begegnen joggen klettern sparen rauchen lachen weinen träumen wecken baden malen zeichnen rechnen atmen enden fühlen teilen stören besorgen erledigen beantragen benutzen verwenden versuchen vermieten vereinbaren verabreden bedeuten berichten erreichen verpassen kontrollieren funktionieren organisieren passieren probieren`.split(/\s+/);

// Отделяемые и неотделяемые приставки
const SEP = ["zurück","zusammen","weiter","kennen","statt","teil","fern","fest","heim","hin","her","los","nach","vor","weg","mit","bei","auf","aus","ein","ab","an","zu","um"];
const INSEP = ["miss","emp","ent","ver","zer","be","er","ge","über","unter","hinter","wieder"];
// Глаголы, у которых вспомогательный глагол отличается от «базового»
const AUX_OVERRIDE = {umziehen:"s",einziehen:"s",ausziehen:"s",anziehen:"h",aufstehen:"s",entstehen:"s",einschlafen:"s",aufwachen:"s",bekommen:"h",erfahren:"h",gefallen:"h",zunehmen:"h",abnehmen:"h",reisen:"s",wandern:"s",passieren:"s",folgen:"s",landen:"s",begegnen:"s",joggen:"s",klettern:"s",verschwinden:"s",einsteigen:"s",aussteigen:"s",umsteigen:"s",zurückkommen:"s",mitkommen:"s",ankommen:"s",abfahren:"s",losfahren:"s",wegfahren:"s",vorbeikommen:"s",verbringen:"h",gelingen:"s",empfangen:"h",verlassen:"h",fernsehen:"h"};

const STRONG = {};
STRONG_RAW.split("\n").forEach(l=>{const [inf,du,er,pt,p2,aux]=l.trim().split("|");STRONG[inf]={du:du==="-"?null:du,er:er==="-"?null:er,pt,p2,aux};});
const REGSET = new Set(REGULAR);
const isKnown = w => !!(SPECIAL[w]||STRONG[w]||REGSET.has(w));

// Разбор: приставка + основа
function analyze(raw){
  let w=String(raw).trim().toLowerCase().replace(/^sich\s+/,"");
  const refl=/^sich\s/i.test(String(raw).trim());
  if(!/^[a-zäöüß]+n$/.test(w)) return null;
  if(isKnown(w)) return {inf:w,base:w,sep:"",insep:"",known:true,refl};
  for(const p of SEP){ if(w.startsWith(p)&&w.length>p.length+2){const rest=w.slice(p.length);const r=analyze(rest);if(r&&r.known&&!r.sep)return {...r,inf:w,sep:p,refl};}}
  for(const p of INSEP){ if(w.startsWith(p)&&w.length>p.length+2){const rest=w.slice(p.length);if(isKnown(rest))return {inf:w,base:rest,sep:"",insep:p,known:true,refl};}}
  for(const p of ["miss","emp","ent","ver","zer","be","er"]){ if(w.startsWith(p)&&w.length>=p.length+4) return {inf:w,base:w,sep:"",insep:"",known:false,refl,guessInsep:true};}
  return {inf:w,base:w,sep:"",insep:"",known:false,refl};
}

function stemOf(inf){ if(/(el|er)n$/.test(inf)||!/en$/.test(inf)) return inf.slice(0,-1); return inf.slice(0,-2); }
const needsE = st => /[td]$/.test(st) || /(chn|[^aeiouäöülrhmn][mn])$/.test(st);
const sibilant = st => /(s|ß|z|x)$/.test(st);

function regPraesens(inf){
  const st=stemOf(inf), wir=/en$/.test(inf)&&!/(el|er)n$/.test(inf)?inf:inf;
  let ich=st+"e"; if(/eln$/.test(inf)) ich=st.slice(0,-2)+"le";
  const e=needsE(st)?"e":"";
  const du=sibilant(st)?st+e+"t":st+e+"st";
  return [ich,du,st+e+"t",wir,st+e+"t",wir];
}
function ptForms(stem,weak){ // weak: stem+te…; strong: ablaut stem
  if(weak){const b=stem;return [b+"e",b+"est",b+"e",b+"en",b+"et",b+"en"];}
  const e2=/[td]$/.test(stem)||sibilant(stem)?"e":"";
  const pl=/e$/.test(stem)?stem+"n":stem+"en";
  return [stem,stem+e2+"st",stem,pl,stem+(/[td]$/.test(stem)?"et":"t"),pl];
}

function conjugate(raw){
  const a=analyze(raw); if(!a) return null;
  const b=a.base, S=SPECIAL[b], G=STRONG[b];
  let pr,pt,p2,aux,k2,imp,note="";
  if(S){
    pr=[...S.pr];
    pt=Array.isArray(S.pt)?[...S.pt]:ptForms(S.pt.slice(0,-1),true);
    if(S.pt==="tat") pt=ptForms("tat",false);
    p2=S.p2;aux=S.aux;
    if(S.k2) k2=Array.isArray(S.k2)?[...S.k2]:[S.k2,S.k2+"st",S.k2,S.k2+"n",S.k2+"t",S.k2+"n"];
    imp=S.imp?[...S.imp]:null;
  } else if(G){
    pr=regPraesens(b); if(G.du){pr[1]=G.du;pr[2]=G.er;}
    pt=/te$/.test(G.pt)?ptForms(G.pt.slice(0,-1),true):ptForms(G.pt,false);
    p2=G.p2;aux=G.aux;
    if(K2_STRONG[b]){const k=K2_STRONG[b];k2=[k,k+"st",k,k+"n",k+"t",k+"n"];}
  } else {
    pr=regPraesens(b);
    const st=stemOf(b); const tst=st+(needsE(st)?"e":"")+"t";
    pt=ptForms(tst,true);
    const noGe=/ieren$/.test(b)||a.guessInsep||/^(be|ver|er|ent|emp|zer|miss|ge|über|unter|hinter|wieder)/.test(b)&&b.length>6;
    p2=(noGe?"":"ge")+tst; aux="h";
    if(!a.known) note="Этого глагола нет в словаре — формы построены по правилам слабых глаголов. Если глагол сильный (с изменением корня), формы могут быть неверными.";
  }
  // приставки
  const P=a.insep||"";
  if(P){pr=pr.map(f=>P+f);pt=pt.map(f=>P+f);p2=P+p2.replace(/^ge/,"");if(k2)k2=k2.map(f=>P+f);}
  if(a.sep){p2=a.sep+p2;}
  aux=AUX_OVERRIDE[a.inf]||aux;
  const auxPr=aux==="s"?SPECIAL.sein.pr:SPECIAL.haben.pr;
  const sp=a.sep?" "+a.sep:"";
  const refl=["mich","dich","sich","uns","euch","sich"];
  const R=i=>a.refl?" "+refl[i]:"";
  const out={inf:a.inf,refl:a.refl,sep:a.sep,known:a.known,note,aux,p2,
    praesens:pr.map((f,i)=>f+R(i)+sp),
    praeteritum:pt.map((f,i)=>f+R(i)+sp),
    perfekt:auxPr.map((f,i)=>f+R(i)+" "+p2),
    konj2:k2?k2.map((f,i)=>f+R(i)+sp):null,
    wuerde:["würde","würdest","würde","würden","würdet","würden"].map((f,i)=>f+R(i)+" "+a.inf),
    nebensatz:pr.map((f,i)=>(a.sep?a.sep+f:f)),
  };
  // Imperativ
  if(!imp&&!(S&&(S.modal||S.noimp))){
    const st=stemOf(b); let du;
    if(G&&G.du&&/i/.test(G.du)&&!/i/.test(st)) du=sibilant(st)?G.du.slice(0,-1):G.du.slice(0,-2);
    else if(/eln$/.test(b)) du=st.slice(0,-2)+"le";
    else if(/ern$/.test(b)||needsE(st)) du=st+"e";
    else du=st;
    imp=[P+du,pr[4],pr[5]+" Sie"];
  }
  const rI=["dich","euch","sich"];
  if((S&&(S.modal||S.noimp))) imp=null;
  out.imperativ=!imp?null:imp.map((f,i)=>f+(a.refl?" "+rI[i]:"")+(a.sep?" "+a.sep:"")+"!");
  return out;
}
const TENSES=[["praesens","Präsens"],["praeteritum","Präteritum"],["perfekt","Perfekt"],["konj2","Konjunktiv II"],["wuerde","würde + Infinitiv"]];
// Все известные глаголы для тренажёра
const ALL_VERBS=[...new Set([...Object.keys(SPECIAL),...Object.keys(STRONG),...REGULAR,
  "anrufen","ankommen","abfahren","aufstehen","einkaufen","aufräumen","abholen","anmelden","ausfüllen","aufhören","zumachen","aufmachen","einladen","mitbringen","mitkommen","fernsehen","teilnehmen","stattfinden","zurückgeben","vorbereiten","aussehen","ausgehen","einschlafen","umziehen","anziehen","aufwachen","umsteigen","einsteigen","aussteigen","anfangen","vorschlagen","verstehen","bekommen","vergessen","verlassen","gefallen","beschreiben","unterschreiben","empfehlen","verbringen","bestehen","erfahren","abschließen","zunehmen","abnehmen","aufpassen","vorstellen","zuhören","nachdenken","ausgeben","weggehen"])];
