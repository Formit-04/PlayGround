const canvas=document.getElementById('ocean'),ctx=canvas.getContext('2d');
const species=[
 {name:'Sunscale',emoji:'🐠',rarity:'COMMON',color:'#f9a84a',value:18,xp:14,size:1.0},
 {name:'Silverfin',emoji:'🐟',rarity:'COMMON',color:'#d2e8e2',value:22,xp:16,size:1.08},
 {name:'Moon Jelly',emoji:'🪼',rarity:'UNCOMMON',color:'#a9a4ff',value:48,xp:28,size:1.12},
 {name:'Reef Runner',emoji:'🐠',rarity:'UNCOMMON',color:'#ff6e78',value:55,xp:32,size:1.2},
 {name:'Blue Marlin',emoji:'🐟',rarity:'RARE',color:'#33d1d1',value:145,xp:76,size:1.6},
 {name:'Mako Shark',emoji:'🦈',rarity:'RARE',color:'#90b9cc',value:220,xp:105,size:1.65},
 {name:'Ghost Ray',emoji:'🦈',rarity:'EPIC',color:'#a9c8d8',value:450,xp:180,size:1.8},
 {name:'Abyssal Angler',emoji:'🐡',rarity:'EPIC',color:'#93e4bd',value:620,xp:230,size:1.6},
 {name:'Great White',emoji:'🦈',rarity:'LEGENDARY',color:'#e4eee6',value:1300,xp:440,size:2.2},
 {name:'Blue Whale',emoji:'🐋',rarity:'LEGENDARY',color:'#4ba8c7',value:2200,xp:650,size:2.7},
 {name:'Golden Koi',emoji:'🐠',rarity:'LEGENDARY',color:'#ffd369',value:1800,xp:520,size:1.65},
 {name:'Leviathan',emoji:'🐉',rarity:'MYTHIC',color:'#c196ef',value:5000,xp:1200,size:3}
];
let W=0,H=0,dpr=1,time=0,state='idle',timer=0,biteAt=0,reelProgress=0,tension=40,last=performance.now(),coins=240,caught=0,xp=0,level=1,log=new Set(),activeFish=null,toastTimer=0,hookY=0,fishX=0,fishY=0;
const $=id=>document.getElementById(id);const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}window.addEventListener('resize',resize);resize();
function rand(a,b){return a+Math.random()*(b-a)}
function poly(points,fill,stroke=null,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function drawFish(x,y,size,color,dir=1,kind='fish',alpha=1){ctx.save();ctx.translate(x,y);ctx.scale(dir*size,size);ctx.globalAlpha=alpha;ctx.shadowColor=color;ctx.shadowBlur=14*size;
 if(kind==='whale'){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,0,50,24,0,0,Math.PI*2);ctx.fill();poly([[-39,-3],[-66,-23],[-57,0],[-66,20],[-37,9]],color);poly([[-1,-17],[13,-32],[22,-15]],color);poly([[-12,17],[-1,27],[9,17]],color);ctx.beginPath();ctx.ellipse(40,-3,9,8,0,0,Math.PI*2);ctx.fillStyle='rgba(225,249,242,.12)';ctx.fill();ctx.fillStyle='#061d2a';ctx.beginPath();ctx.arc(39,-7,2.1,0,7);ctx.fill();ctx.strokeStyle='rgba(215,246,236,.36)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(20,7);ctx.quadraticCurveTo(35,10,42,6);ctx.stroke();
 }else if(kind==='shark'){poly([[-34,0],[-55,-19],[-49,0],[-56,18],[-33,8]],color);ctx.beginPath();ctx.ellipse(-1,0,39,15,-.02,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();poly([[-9,-12],[4,-34],[13,-12]],color);poly([[9,10],[22,25],[27,10]],color);poly([[-22,8],[-36,20],[-10,13]],color);ctx.fillStyle='rgba(228,245,236,.67)';ctx.beginPath();ctx.moveTo(20,5);ctx.lineTo(36,7);ctx.lineTo(25,11);ctx.fill();ctx.fillStyle='#071c29';ctx.beginPath();ctx.arc(27,-5,2,0,7);ctx.fill();
 }else{poly([[-21,0],[-42,-18],[-37,0],[-43,16],[-20,8]],color);ctx.beginPath();ctx.ellipse(0,0,29,13,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();poly([[-5,-10],[3,-25],[12,-9]],color);poly([[2,8],[9,21],[14,8]],color);poly([[-10,-5],[2,0],[-8,4]],'rgba(255,255,255,.25)');ctx.fillStyle='rgba(248,250,231,.75)';ctx.beginPath();ctx.arc(19,-4,2.1,0,7);ctx.fill();ctx.fillStyle='#092332';ctx.beginPath();ctx.arc(20,-4,1,0,7);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.38)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(25,3);ctx.lineTo(29,4);ctx.stroke();}
 ctx.restore()}
function pathWave(y,amp,phase,color,width){ctx.beginPath();ctx.moveTo(0,y);for(let x=0;x<=W;x+=12)ctx.lineTo(x,y+Math.sin(x*.009+phase)*amp+Math.sin(x*.021+phase*1.8)*amp*.28);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function drawBackground(dt){let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#83d0d0');g.addColorStop(.24,'#398fa0');g.addColorStop(.54,'#125d76');g.addColorStop(1,'#06283e');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // hazy sun and long glimmer
 let sun=ctx.createRadialGradient(W*.66,H*.19,2,W*.66,H*.19,H*.4);sun.addColorStop(0,'rgba(250,248,203,.28)');sun.addColorStop(.35,'rgba(190,237,221,.09)');sun.addColorStop(1,'rgba(138,222,215,0)');ctx.fillStyle=sun;ctx.fillRect(0,0,W,H*.7);
 for(let i=0;i<8;i++){let x=W*(.51+i*.038)+Math.sin(time*.2+i)*13;ctx.beginPath();ctx.moveTo(x,H*.17);ctx.lineTo(x+rand(2,7),H*.58);ctx.strokeStyle=`rgba(210,248,225,${.014+Math.sin(time+i)*.006})`;ctx.lineWidth=rand(8,28);ctx.stroke()}
 // horizon ripples
 for(let i=0;i<14;i++){let y=H*(.24+i*.012);pathWave(y,1.8+i*.2,time*.4+i,'rgba(231,255,239,.12)',1)}
 // underwater caustic streaks
 for(let i=0;i<17;i++){let x=(i*137+time*8)%(W+160)-80,y=H*(.48+(i%6)*.075);ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+24,y+9,x+68,y+Math.sin(time+i)*7);ctx.strokeStyle=`rgba(142,222,211,${.045+(i%3)*.016})`;ctx.lineWidth=1;ctx.stroke()}
 // far seabirds
 ctx.strokeStyle='rgba(15,57,65,.48)';ctx.lineWidth=1.5;for(let i=0;i<3;i++){let x=W*(.65+i*.035)+Math.sin(time*.3+i)*8,y=H*.12+i*7;ctx.beginPath();ctx.moveTo(x-5,y+2);ctx.quadraticCurveTo(x,y-3,x+4,y+2);ctx.stroke()}
}
function drawBubbles(){for(let i=0;i<22;i++){let x=(i*113+Math.sin(time*.3+i)*26)%W,y=(H-((time*18+i*97)%(H*.65+70)));ctx.beginPath();ctx.arc(x,y,1+(i%3),0,Math.PI*2);ctx.fillStyle='rgba(190,237,227,.2)';ctx.fill()}}
function drawFishAmbient(){for(let i=0;i<7;i++){let x=(W*(.18+i*.105)+Math.sin(time*.35+i*2)*60);let y=H*(.39+(i%4)*.1)+Math.sin(time*.7+i)*16;let sz=(.3+(i%3)*.11)*(H/800);drawFish(x,y,sz,'#a4d5d0',Math.sin(time*.3+i)>0?1:-1,'fish',.28)}}
function drawOceanSurface(){let y=H*.28;let g=ctx.createLinearGradient(0,y-18,0,y+21);g.addColorStop(0,'rgba(227,247,228,.06)');g.addColorStop(.48,'rgba(215,247,231,.45)');g.addColorStop(1,'rgba(141,222,217,.05)');ctx.fillStyle=g;ctx.fillRect(0,y-16,W,36);for(let i=0;i<8;i++)pathWave(y+(i-4)*3.5,2.8,time*.65+i*.7,'rgba(224,251,235,.44)',1.3)}
function drawBoat(){const cx=W*.5, base=H*.83;let deckY=H*.9;
 // hull silhouette, perspective
 let hull=ctx.createLinearGradient(0,base,0,H);hull.addColorStop(0,'#233c42');hull.addColorStop(.5,'#132b35');hull.addColorStop(1,'#081a25');poly([[cx-W*.29,base],[cx+W*.29,base],[cx+W*.22,H],[cx-W*.19,H]],hull,'rgba(199,226,210,.17)',1);
 poly([[cx-W*.29,base],[cx+W*.29,base],[cx+W*.21,base+14],[cx-W*.21,base+14]],'#b9ab84');poly([[cx-W*.27,base+4],[cx+W*.27,base+4],[cx+W*.2,base+18],[cx-W*.2,base+18]],'#34484a');
 // plank lines on boat
 for(let i=0;i<8;i++){let y=base+22+i*12;ctx.beginPath();ctx.moveTo(cx-W*(.21-i*.011),y);ctx.lineTo(cx+W*(.21-i*.011),y);ctx.strokeStyle='rgba(182,185,151,.19)';ctx.lineWidth=1;ctx.stroke()}
 // fishing rod in right hand; cast line changes
 let rodX=cx+W*.22,rodY=H*.79;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(rodX,rodY);ctx.quadraticCurveTo(rodX+W*.04,rodY-H*.12,rodX+W*.13,rodY-H*.24);ctx.strokeStyle='#594b34';ctx.lineWidth=4;ctx.stroke();ctx.beginPath();ctx.moveTo(rodX,rodY);ctx.quadraticCurveTo(rodX+W*.04,rodY-H*.12,rodX+W*.13,rodY-H*.24);ctx.strokeStyle='#d5bc83';ctx.lineWidth=1.2;ctx.stroke();
 let tipX=rodX+W*.13,tipY=rodY-H*.24;let lineEndX=state==='idle'?tipX+W*.02:W*.58;let lineEndY=state==='idle'?H*.43:state==='casting'?H*(.31+Math.sin(time*3)*.08):state==='waiting'?H*.49:state==='bite'?H*.53:H*.51;
 ctx.beginPath();ctx.moveTo(tipX,tipY);ctx.quadraticCurveTo(tipX+W*.07,(tipY+lineEndY)*.45,lineEndX,lineEndY);ctx.strokeStyle='rgba(230,250,228,.72)';ctx.lineWidth=1;ctx.stroke();
 if(state!=='idle'&&state!=='casting'){ctx.fillStyle='#f0db8d';ctx.beginPath();ctx.arc(lineEndX,lineEndY,3,0,7);ctx.fill()}
 // buoy / edge details
 ctx.fillStyle='#d1c59c';ctx.fillRect(cx-W*.25,base+2,W*.5,2);ctx.fillStyle='#182a2d';ctx.fillRect(cx-W*.18,H*.86,W*.36,3);
}
function drawActionFish(){if(!activeFish||state==='idle'||state==='casting')return;let depth=state==='waiting'?0:Math.min(1,reelProgress/100);let x=W*.58+Math.sin(time*1.6)*Math.max(3,25-depth*17),y=H*(.56-depth*.09)+Math.sin(time*2.2)*7;let size=activeFish.size*(.35+depth*.65)*(H/800);drawFish(x,y,size,activeFish.color,Math.sin(time*1.25)>0?1:-1,activeFish.name.includes('Whale')?'whale':activeFish.name.includes('Shark')?'shark':'fish',.68+depth*.3);if(state==='bite'){for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x,y+10+i*5,18+i*9,3+i,0,0,Math.PI*2);ctx.strokeStyle=`rgba(214,247,227,${.26-i*.06})`;ctx.lineWidth=1;ctx.stroke()}}}
function render(now){let dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;drawBackground(dt);drawFishAmbient();drawBubbles();drawOceanSurface();drawActionFish();drawBoat();
 // tiny glints
 for(let i=0;i<12;i++){let x=(i*211+time*12)%W,y=H*(.3+(i%5)*.11)+Math.sin(time+i)*4;ctx.fillStyle=`rgba(223,250,230,${.12+Math.sin(time*2+i)*.07})`;ctx.fillRect(x,y,rand(2,7),1)}
 if(state==='waiting'){timer-=dt;if(timer<=0){bite()}}else if(state==='bite'){timer-=dt;if(timer<=0){missFish()}}else if(state==='reeling'){reelProgress+=dt*rand(14,24);tension+=dt*(Math.random()-.45)*45;tension=clamp(tension,8,94);$('tensionFill').style.width=tension+'%';$('tensionMarker').style.left=tension+'%';$('tensionText').textContent=tension>75?'DANGER':tension<27?'SLACK':'STEADY';$('tensionText').style.color=tension>75?'#ff9b86':tension<27?'#ffe394':'#eaf6e8';if(tension>78){tension-=dt*48;tension=clamp(tension,8,90);$('tensionFill').style.width=tension+'%';$('tensionMarker').style.left=tension+'%'}if(tension<22){tension+=dt*28;tension=clamp(tension,8,90);$('tensionFill').style.width=tension+'%';$('tensionMarker').style.left=tension+'%'}if(reelProgress>=100){landFish()}}
 requestAnimationFrame(render)}requestAnimationFrame(render);
function setStatus(text){$('statusText').textContent=text;$('castStatus').style.display=state==='idle'?'none':'flex'}
function cast(){if(state==='idle'){state='casting';$('castStatus').style.display='flex';$('intro').style.opacity='.22';$('fishLabel').classList.add('visible');$('spottedName').textContent='Something is out there';$('castButton').classList.add('busy');$('buttonText').textContent='LINE IN THE WATER';$('castCaption').textContent='Waiting for a bite…';setStatus('LINE OUT — WATCH THE WATER');timer=1.25;setTimeout(()=>{if(state==='casting'){state='waiting';timer=rand(2.4,6.2);setStatus('WAITING FOR A BITE');}},1250)}else if(state==='bite'){state='reeling';reelProgress=5;tension=42;$('tensionBox').classList.add('active');$('buttonText').textContent='REEL IT IN!';$('castCaption').textContent='Keep the tension in the green zone';setStatus('FISH ON! — REEL IT IN');$('castButton').style.background='#f0d892'}else if(state==='reeling'){reelProgress+=8;tension=clamp(tension+(Math.random()-.5)*16,10,90)}}
function chooseFish(){let r=Math.random();let tier=r<.52?0:r<.78?1:r<.92?2:r<.985?3:.995;let pool=tier===0?species.slice(0,2):tier===1?species.slice(2,4):tier===2?species.slice(4,6):tier===3?species.slice(6,8):species.slice(8);return pool[Math.floor(Math.random()*pool.length)]}
function bite(){state='bite';activeFish=chooseFish();timer=1.8;setStatus('BITE! — PRESS SPACE NOW');$('buttonText').textContent='HOOK IT!';$('castCaption').textContent='Quick! Press SPACE to set the hook';$('castButton').style.background='#f2da91';$('fishLabel').classList.add('visible');$('spottedName').textContent=activeFish.name;toast('SOMETHING TOOK THE BAIT!')}
function missFish(){state='idle';activeFish=null;resetButton();setStatus('THE FISH GOT AWAY');$('castCaption').textContent='No worries. The ocean is full of them.';$('fishLabel').classList.remove('visible');toast('THE FISH GOT AWAY — TRY AGAIN')}
function breakLine(){state='idle';activeFish=null;resetButton();$('tensionBox').classList.remove('active');setStatus('SNAP! THE LINE BROKE');$('castCaption').textContent='Easy does it. Keep tension in the green.';$('fishLabel').classList.remove('visible');toast('LINE SNAPPED — TRY A GENTLER REEL')}
function landFish(){state='idle';const f=activeFish;activeFish=null;resetButton();$('tensionBox').classList.remove('active');$('fishLabel').classList.remove('visible');caught++;coins+=f.value;xp+=f.xp;while(xp>=level*100){xp-=level*100;level++}updateHUD();$('catchName').textContent=f.name;$('catchArt').textContent=f.emoji;$('catchRarity').textContent=f.rarity;$('catchRarity').className='catch-rarity '+f.rarity.toLowerCase();$('catchWeight').textContent=(rand(.6,14)*f.size).toFixed(1)+' kg';$('catchValue').textContent='+'+f.value+' ✦';$('catchCard').classList.add('open');$('castCaption').textContent='A beautiful catch. Ready for another?';setStatus('NICE CATCH — THE OCEAN RUNS DEEP');log.add(f.name);updateLog()}
function resetButton(){$('buttonText').textContent='CAST YOUR LINE';$('castCaption').textContent='A whole ocean. Anything could bite.';$('castButton').classList.remove('busy');$('castButton').style.background='';$('intro').style.opacity='';}
function updateHUD(){$('coins').textContent=coins.toLocaleString();$('caughtCount').textContent=caught;$('level').textContent=String(level).padStart(2,'0');$('xpFill').style.width=(xp/(level*100)*100)+'%';$('xpLabel').textContent=`${xp} / ${level*100} XP`}
function updateLog(){let list=$('speciesList');list.innerHTML='';species.slice(0,5).forEach(f=>{let got=log.has(f.name),row=document.createElement('div');row.className='species-row'+(got?' discovered':'');row.innerHTML=`<span class="species-info"><span class="species-emoji">${got?f.emoji:'◌'}</span><span>${got?f.name:'Unknown species'}</span></span><span class="unknown">${got?f.rarity:'???'}</span>`;list.appendChild(row)});$('speciesCount').textContent=log.size}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2100)}
$('castButton').addEventListener('click',cast);window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();cast()}if(e.code==='Escape')$('catchCard').classList.remove('open')});$('closeCatch').onclick=()=>$('catchCard').classList.remove('open');$('keepButton').onclick=()=>{$('catchCard').classList.remove('open');toast('CATCH ADDED TO YOUR LOGBOOK')};$('viewAll').onclick=()=>toast(log.size===12?'YOU FOUND EVERY SPECIES!':'KEEP CASTING TO DISCOVER ALL 12 SPECIES');
// Accessible tap cue on water and gentle weather variation
setInterval(()=>{$('weather').textContent=Math.random()>.7?'SEA BREEZE':'CLEAR SKIES';$('depth').textContent=String(Math.floor(38+Math.sin(time*.4)*11+Math.random()*5)).padStart(3,'0')},2200);updateLog();
