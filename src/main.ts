import './style.css';
import { Runner, speedAt, safeGap, collides, readBest, saveBest, type Obstacle } from './physics';
import { Scene, type Particle } from './scene';
import { Soundscape } from './audio';
const icons={play:'<path d="m9 5 11 7-11 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',sound:'<path d="m11 5-6 5H2v4h3l6 5zM16 8q6 4 0 8M19 4q10 8 0 16"/>',muted:'<path d="m11 5-6 5H2v4h3l6 5zM16 9l6 6M22 9l-6 6"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',restart:'<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',gem:'<path d="m12 2 7 8-7 12L5 10zM5 10h14M12 2v20"/>'};
const svg=(key:keyof typeof icons)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key]}</svg>`;
document.querySelector('#app')!.innerHTML=`<main class="game" aria-label="Amber Run — игра"><canvas id="world" aria-label="Динозаврик бежит по долине. Прыгайте пробелом, стрелкой вверх или касанием."></canvas><header class="topbar"><a class="wordmark" href="#" aria-label="Amber Run, на главный экран">${svg('gem')}<span>AMBER RUN</span></a><div class="hud" hidden><div class="stat"><span>ДИСТАНЦИЯ</span><strong id="score">00000</strong></div><div class="stat record"><span>РЕКОРД</span><strong id="best">00000</strong></div></div><div class="controls"><button id="pause" class="icon-button" aria-label="Пауза" title="Пауза · Esc" hidden>${svg('pause')}</button><button id="sound" class="icon-button" aria-label="Выключить звук" aria-pressed="true" title="Звук">${svg('sound')}</button></div></header><section class="intro" id="intro"><div class="eyebrow"><i></i> ДОЛИНА ВЕЧНОГО ЗАКАТА</div><h1>Amber<span>Run<span class="title-spark">✦</span></span></h1><p>Маленький беглец.<br>Большое приключение.</p><button id="play" class="primary">Играть ${svg('arrow')}</button><div class="start-record">Личный рекорд <span id="start-best">0</span> м</div></section><section id="panel" class="panel" hidden aria-labelledby="panel-title"><div class="panel-gem">${svg('gem')}</div><div id="panel-kicker" class="eyebrow">МОМЕНТ ПЕРЕДЫШКИ</div><h2 id="panel-title">Пауза</h2><p id="panel-copy">Долина подождёт.</p><div id="results" class="results" hidden><div><span>ДИСТАНЦИЯ</span><strong id="final-score">0 <small>м</small></strong></div><div><span>ЛИЧНЫЙ РЕКОРД</span><strong id="final-best">0 <small>м</small></strong></div></div><button id="resume" class="primary">Продолжить ${svg('play')}</button><button id="home" class="text-button">На главный экран</button></section><div class="bottom-help" id="help"><div><kbd>ПРОБЕЛ</kbd><span class="or">/</span><span>нажми, чтобы прыгнуть</span></div><span class="hold-hint">Удерживай — прыгнешь выше</span></div><div class="world-caption"><span class="caption-line"></span> НАВСТРЕЧУ ЗАКАТУ</div><div class="live-message" aria-live="polite" id="announcement"></div></main>`;
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=el<HTMLCanvasElement>('world'), scene=new Scene(canvas),runner=new Runner(),audio=new Soundscape();
let status='start', distance=0, elapsed=0, visualTime=0, best=0, crashTime=0, spawnAt=0, obstacles:Obstacle[]=[],particles:Particle[]=[],last=performance.now(),accumulator=0, newBest=false;
try{best=readBest(localStorage);audio.enabled=localStorage.getItem('amber-run-sound')!=='off';}catch{}
function updateSound(){el('sound').innerHTML=svg(audio.enabled?'sound':'muted');el('sound').setAttribute('aria-label',audio.enabled?'Выключить звук':'Включить звук');el('sound').setAttribute('aria-pressed',String(audio.enabled));}
function updateBest(){el('best').textContent=String(best).padStart(5,'0');el('start-best').textContent=String(best);}
updateBest();updateSound();
function announce(text:string){el('announcement').textContent=text;}
function updateUI(){
  el('intro').hidden=status!=='start';el('panel').hidden=status!=='paused'&&status!=='over';document.querySelector<HTMLElement>('.hud')!.hidden=status==='start';el('pause').hidden=status!=='running';el('help').hidden=status==='over'||status==='paused';document.querySelector<HTMLElement>('.world-caption')!.hidden=status!=='start';
  el('help').classList.toggle('playing',status!=='start');
  if(status==='paused'||status==='over'){
    const over=status==='over';el('panel-title').textContent=over?'Ещё один закат?':'Пауза';el('panel-kicker').textContent=over?(newBest?'НОВЫЙ ЛИЧНЫЙ РЕКОРД':'ХОРОШИЙ БЫЛ ЗАБЕГ'):'МОМЕНТ ПЕРЕДЫШКИ';el('panel-copy').textContent=over?'У каждого приключения есть продолжение.':'Долина подождёт.';el('results').hidden=!over;el('resume').innerHTML=(over?'Ещё раз':'Продолжить')+svg(over?'restart':'play');el('final-score').innerHTML=`${Math.floor(distance/10)} <small>м</small>`;el('final-best').innerHTML=`${best} <small>м</small>`;el('resume').focus({preventScroll:true});
  }
}
function start(){status='running';distance=0;elapsed=0;runner.reset();obstacles=[];particles=[];spawnAt=scene.w*.72;crashTime=0;newBest=false;accumulator=0;void audio.unlock();audio.setActive(true);updateUI();announce('Забег начался');el('play').blur();el('resume').blur();}
function pause(){if(status!=='running')return;status='paused';runner.release();runner.buffered=0;audio.setActive(false);updateUI();announce('Пауза');}
function resume(){if(status==='over'){start();return;}if(status!=='paused')return;status='running';last=performance.now();accumulator=0;void audio.unlock();audio.setActive(true);updateUI();el('resume').blur();}
function home(){status='start';runner.reset();obstacles=[];particles=[];updateUI();el('play').focus({preventScroll:true});audio.setActive(true);}
function dust(count:number,impact=false){for(let i=0;i<count;i++){const life=.25+Math.random()*.3;particles.push({x:scene.playerX-9+(Math.random()-.5)*24,y:scene.ground-3,vx:-30-Math.random()*100,vy:-15-Math.random()*(impact?90:35),life,max:life,size:2+Math.random()*5});}}
function crash(){status='crashed';crashTime=0;runner.release();runner.buffered=0;audio.hit();dust(15,true);const score=Math.floor(distance/10);newBest=score>best;if(newBest){best=score;try{saveBest(best,localStorage);}catch{}updateBest();}el('pause').hidden=true;}
function press(){if(status==='running'){runner.press();void audio.unlock();}}
function release(){runner.release();}
el('play').addEventListener('click',start);el('pause').addEventListener('click',pause);el('resume').addEventListener('click',resume);el('home').addEventListener('click',home);
document.querySelector('.wordmark')!.addEventListener('click',e=>{e.preventDefault();if(status==='running')pause();else if(status!=='crashed')home();});
el('sound').addEventListener('click',()=>{audio.toggle();if(status==='paused')audio.setActive(false);updateSound();el('sound').blur();try{localStorage.setItem('amber-run-sound',audio.enabled?'on':'off');}catch{}});
window.addEventListener('keydown',e=>{
  if(e.code==='Space'||e.code==='ArrowUp'){
    if((e.target as HTMLElement).closest('button,a'))return;e.preventDefault();if(e.repeat)return;
    if(status==='start'){start();press();}else if(status==='over')start();else if(status==='paused')resume();else press();
  }
  if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if(e.repeat)return;if(status==='running')pause();else if(status==='paused')resume();}
});
window.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();release();}});
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);press();});canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
window.addEventListener('blur',()=>{pause();audio.setActive(false);});window.addEventListener('focus',()=>{if(status==='start')audio.setActive(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();audio.setActive(false);}});
window.addEventListener('resize',()=>{if(status==='running')pause();scene.resize();particles=[];});
function fixedUpdate(dt:number){
  if(status==='running'){
    elapsed+=dt;const speed=speedAt(elapsed);distance+=speed*dt;
    const event=runner.step(dt);if(event==='jump')audio.jump();if(event==='land'){audio.land();dust(8);}
    if(distance>=spawnAt){const kind=(['rock','stump','crystal'] as const)[Math.floor(Math.random()*3)], height=kind==='crystal'?66:kind==='stump'?49:38+Math.random()*13,width=kind==='rock'?58:kind==='stump'?53:49;
      obstacles.push({x:scene.w+60,width,height,kind,variant:Math.random()});spawnAt=distance+safeGap(speed,Math.random());}
    for(const obstacle of obstacles){obstacle.x-=speed*dt;if(collides(runner,scene.playerX,obstacle)){crash();break;}}
    obstacles=obstacles.filter(o=>o.x+o.width>-20);el('score').textContent=String(Math.floor(distance/10)).padStart(5,'0');
  } else if(status==='crashed'){crashTime+=dt;if(crashTime>.48){status='over';updateUI();announce(`Забег окончен. ${Math.floor(distance/10)} метров. Рекорд ${best}.`);}}
  else if(status==='start')distance+=32*dt;
  if(status!=='paused')for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;}particles=particles.filter(p=>p.life>0);
}
function frame(now:number){const dt=Math.min((now-last)/1000,.08);last=now;if(!document.hidden){if(status!=='paused')visualTime+=dt;accumulator+=dt;while(accumulator>=1/120){fixedUpdate(1/120);accumulator-=1/120;}scene.render({runner,obstacles,distance,time:visualTime,status,crashTime,particles});}requestAnimationFrame(frame);}
updateUI();requestAnimationFrame(frame);
// Read-only inspection surface for repeatable browser QA; it cannot alter a run.
if(import.meta.env.DEV)Object.defineProperty(window,'amberRunState',{get:()=>({status,distance,score:Math.floor(distance/10),best,speed:speedAt(elapsed),y:runner.y,velocity:runner.velocity,playerX:scene.playerX,width:scene.w,height:scene.h,obstacles:obstacles.map(o=>({...o})),sound:audio.enabled})});

const modelContext=(document as Document & {modelContext?:{registerTool(tool:unknown,options?:{signal:AbortSignal}):void|Promise<void>}}).modelContext;
if(modelContext?.registerTool){
  const lifecycle=new AbortController();
  const register=(tool:unknown)=>{try{void Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'read_run_state',title:'Состояние Amber Run',description:'Прочитать состояние забега, дистанцию, рекорд и высоту прыжка.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:(input:unknown)=>{if(!input||typeof input!=='object'||Object.keys(input).length)throw Error('Ожидается пустой объект');return {status,score:Math.floor(distance/10),best,jumpHeight:Math.round(runner.y),speed:Math.round(speedAt(elapsed)),sound:audio.enabled};}});
  register({name:'pause_run',title:'Поставить забег на паузу',description:'Остановить активный забег Amber Run с помощью обычной игровой паузы.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:(input:unknown)=>{if(!input||typeof input!=='object'||Object.keys(input).length)throw Error('Ожидается пустой объект');if(status!=='running')throw Error('Нет активного забега');pause();return {status};}});
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
