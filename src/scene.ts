import type { Obstacle, Runner } from './physics';
export interface Particle { x:number; y:number; vx:number; vy:number; life:number; max:number; size:number }
export interface SceneState { runner:Runner; obstacles:Obstacle[]; distance:number; time:number; status:string; crashTime:number; particles:Particle[] }
const TAU=Math.PI*2;
const noise=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export class Scene {
  ctx:CanvasRenderingContext2D; w=1280; h=800; ground=620; playerX=280; dpr=1;
  constructor(public canvas:HTMLCanvasElement) { this.ctx=canvas.getContext('2d')!; this.resize(); }
  resize() {
    const width=this.canvas.clientWidth, height=this.canvas.clientHeight;
    this.w=Math.max(760,width); this.h=height*this.w/width;
    this.dpr=Math.min(devicePixelRatio || 1,2); this.canvas.width=Math.round(width*this.dpr); this.canvas.height=Math.round(height*this.dpr);
    this.ground=this.h*.79; this.playerX=this.w*(width<600 ? .21 : .25);
  }
  path(points:number[][],fill:string,stroke?:string) { const c=this.ctx; c.beginPath(); points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.closePath(); c.fillStyle=fill;c.fill(); if(stroke){c.strokeStyle=stroke;c.stroke();} }
  ellipse(x:number,y:number,rx:number,ry:number,color:string) { const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill(); }
  render(s:SceneState) {
    const c=this.ctx,w=this.w,h=this.h,g=this.ground;
    c.setTransform(this.canvas.width/w,0,0,this.canvas.height/h,0,0);
    const sky=c.createLinearGradient(0,0,0,g);sky.addColorStop(0,'#84758e');sky.addColorStop(.38,'#d2a0a1');sky.addColorStop(.75,'#f4ba99');sky.addColorStop(1,'#ffd4a3');c.fillStyle=sky;c.fillRect(0,0,w,h);
    const sunX=w*.73,sunY=g*.36,r=Math.min(w*.086,112);
    const halo=c.createRadialGradient(sunX,sunY,r*.2,sunX,sunY,r*2.9);halo.addColorStop(0,'#ffdab64d');halo.addColorStop(1,'#ffdab600');c.fillStyle=halo;c.fillRect(sunX-r*3,sunY-r*3,r*6,r*6);this.ellipse(sunX,sunY,r,r,'#ffe0b1');
    for(let i=0;i<8;i++){const cx=((noise(i+3)*w+s.time*(2+i%3))%(w+420))-160, cy=g*(.11+noise(i+40)*.39);this.cloud(cx,cy,80+noise(i+20)*170,i%2?'#efd1be33':'#fae1cc40');}
    this.mountains(s.distance*.065,g*.46,g*.51,'#ab8ba5',1);
    this.mountains(s.distance*.12,g*.6,g*.44,'#8d7697',5);
    this.mountains(s.distance*.2,g*.75,g*.32,'#71617f',8);
    // Valley fog separates the forest from the distant stone ridges.
    const mist=c.createLinearGradient(0,g*.68,0,g);mist.addColorStop(0,'#f8bbad00');mist.addColorStop(.55,'#f8bbad38');mist.addColorStop(1,'#be92a200');c.fillStyle=mist;c.fillRect(0,g*.62,w,g*.38);
    this.forest(s.distance*.29,g-36,'#695670',.68,140);
    this.forest(s.distance*.48,g-14,'#51445f',.91,270);
    for(let i=0;i<20;i++){const x=((i*183+noise(i)*90-s.distance*.62)%(w+240)+(w+240))%(w+240)-120;this.bush(x,g+3,38+noise(i+4)*36,'#44384f');}
    // Fine, warm edge makes the actual running surface unambiguous.
    c.fillStyle='#463245';c.fillRect(0,g,w,h-g);
    const soil=c.createLinearGradient(0,g,0,h);soil.addColorStop(0,'#795054');soil.addColorStop(.13,'#513749');soil.addColorStop(1,'#302739');c.fillStyle=soil;c.fillRect(0,g+3,w,h-g);
    c.fillStyle='#e4a474';c.fillRect(0,g,w,3);c.fillStyle='#ad7165';c.fillRect(0,g+3,w,5);
    for(let i=0;i<64;i++){const x=((i*51-s.distance)%(w+80)+(w+80))%(w+80)-40;const y=g+13+noise(i+73)*(h-g)*.74;this.ellipse(x,y,2+noise(i)*5,1,'#be887038');}
    // Small grasses hug the edge; collision objects have a brighter, solid silhouette.
    for(let i=0;i<30;i++){const x=((i*93-s.distance)%(w+140)+(w+140))%(w+140)-70;this.grass(x,g,7+noise(i)*12,'#bc8164',i);}
    s.obstacles.forEach(o=>this.obstacle(o));
    this.dinosaur(this.playerX,g-s.runner.y,s);
    for(const p of s.particles){c.globalAlpha=p.life/p.max*.6;this.ellipse(p.x,p.y,p.size*(1.6-p.life/p.max),p.size*.65,'#e9ba8c');}c.globalAlpha=1;
    for(let i=0;i<22;i++){const x=((noise(i+600)*w-s.distance*.18+s.time*(4+noise(i)*4))%w+w)%w;const y=g-30-noise(i+81)*g*.52+Math.sin(s.time*.55+i)*18;const a=(.25+Math.sin(s.time*1.4+i)*.2);c.globalAlpha=a;this.ellipse(x,y,1.3+noise(i+42),1.3+noise(i+42),'#ffe0a1');}c.globalAlpha=1;
    // Foreground foliage frames, but never covers the running lane.
    for(let i=0;i<9;i++){const x=((i*227-s.distance*.84)%(w+300)+(w+300))%(w+300)-150;this.fern(x,h+18,80+noise(i)*60,'#282536',i);}
    const vignette=c.createRadialGradient(w*.5,h*.45,h*.2,w*.5,h*.45,Math.max(w,h)*.8);vignette.addColorStop(0,'#241f3200');vignette.addColorStop(1,'#241f3240');c.fillStyle=vignette;c.fillRect(0,0,w,h);
  }
  cloud(x:number,y:number,width:number,color:string) { const c=this.ctx;c.fillStyle=color;c.beginPath();c.moveTo(x-width*.5,y);c.bezierCurveTo(x-width*.4,y-8,x-width*.25,y-7,x-width*.2,y-8);c.bezierCurveTo(x-width*.17,y-26,x+width*.04,y-27,x+width*.12,y-12);c.bezierCurveTo(x+width*.33,y-16,x+width*.38,y-4,x+width*.5,y);c.closePath();c.fill(); }
  mountains(offset:number,base:number,height:number,color:string,seed:number) {
    const c=this.ctx,span=600,shift=offset%span, first=Math.floor(offset/span);
    for(let j=-1;j<Math.ceil(this.w/span)+1;j++) { const x=j*span-shift, id=j+first+seed*41, peak=base-height*(.55+noise(id)*.42), tip=x+200+noise(id+1)*130;
      c.beginPath();c.moveTo(x-120,this.ground);c.lineTo(x-80,base+40);c.bezierCurveTo(x+70,base-25,tip-92,peak+90,tip-15,peak+10);c.quadraticCurveTo(tip,peak-7,tip+18,peak+15);c.lineTo(tip+64,peak+69);c.lineTo(tip+97,peak+61);c.bezierCurveTo(tip+220,base+25,x+460,base-10,x+650,this.ground);c.closePath();c.fillStyle=color;c.fill();
      this.path([[tip,peak+3],[tip+18,peak+15],[tip+64,peak+69],[tip+97,peak+61],[tip+200,base+80],[tip+53,base+32],[tip+31,peak+80]],'#efb5af18');
      c.beginPath();c.moveTo(tip-20,peak+30);c.lineTo(tip-50,peak+125);c.lineTo(tip-28,peak+155);c.lineTo(tip-70,base+70);c.strokeStyle='#493d6318';c.lineWidth=2;c.stroke();
    }
  }
  forest(offset:number,base:number,color:string,scale:number,seed:number) {
    const step=95, shift=offset%step,first=Math.floor(offset/step);
    for(let i=-1;i<this.w/step+2;i++){const n=i+first+seed,x=i*step-shift,h=(55+noise(n)*95)*scale;this.tree(x,base,h,color,n);}
  }
  tree(x:number,y:number,h:number,color:string,seed:number) { const c=this.ctx;c.strokeStyle=color;c.lineCap='round';c.lineWidth=7;c.beginPath();c.moveTo(x,y+3);c.quadraticCurveTo(x+8,y-h*.4,x-3,y-h*.9);c.stroke();c.lineWidth=3;c.beginPath();c.moveTo(x+2,y-h*.35);c.lineTo(x-22,y-h*.64);c.moveTo(x+2,y-h*.5);c.lineTo(x+25,y-h*.77);c.stroke();
    for(let k=0;k<5;k++)this.ellipse(x+(noise(seed+k)*2-1)*h*.24,y-h*(.57+noise(seed+k+6)*.38),h*(.23+noise(seed+k+8)*.1),h*.16,color);
  }
  bush(x:number,y:number,r:number,color:string) {this.ellipse(x,y,r,r*.32,color);this.ellipse(x-r*.37,y-r*.13,r*.46,r*.31,color);this.ellipse(x+r*.3,y-r*.2,r*.46,r*.36,color);}
  grass(x:number,y:number,h:number,color:string,seed:number) {const c=this.ctx;c.strokeStyle=color;c.lineWidth=1.4;c.beginPath();for(let k=0;k<3;k++){c.moveTo(x,y);c.quadraticCurveTo(x+(k-1)*6,y-h*.7,x+(k-1)*11,y-h*(.6+noise(seed+k)*.5));}c.stroke();}
  fern(x:number,y:number,h:number,color:string,seed:number) { const c=this.ctx;c.strokeStyle=color;c.lineWidth=3;for(let i=-2;i<=2;i++){const dx=i*h*.29,dy=-h*(1-Math.abs(i)*.18);c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+dx*.5,y+dy*.8,x+dx,y+dy);c.stroke();for(let k=2;k<8;k++){const t=k/9,px=x+dx*t,py=y+dy*t;this.path([[px,py],[px-h*.15*(1-t),py-h*.16],[px+dx*.06,py-9]],color);this.path([[px,py],[px+h*.17*(1-t),py-h*.12],[px+dx*.06,py-10]],color);}}void seed; }
  obstacle(o:Obstacle) {const c=this.ctx,x=o.x,y=this.ground,w=o.width,h=o.height;this.ellipse(x+w*.5,y+3,w*.62,6,'#2c253b55');
    if(o.kind==='rock'){
      this.path([[x,y],[x+3,y-h*.52],[x+w*.27,y-h*.88],[x+w*.61,y-h],[x+w*.9,y-h*.62],[x+w,y]],'#9b8293');
      this.path([[x+3,y-h*.52],[x+w*.27,y-h*.88],[x+w*.61,y-h],[x+w*.57,y-h*.48],[x+w*.2,y-h*.37]],'#c4a5ac');
      this.path([[x+w*.57,y-h*.48],[x+w*.61,y-h],[x+w*.9,y-h*.62],[x+w,y],[x+w*.7,y-h*.1]],'#786780');c.strokeStyle='#e9bfa7';c.lineWidth=2;c.beginPath();c.moveTo(x+5,y-h*.54);c.lineTo(x+w*.27,y-h*.88);c.lineTo(x+w*.61,y-h);c.stroke();
    }else if(o.kind==='stump'){
      this.path([[x,y],[x+7,y-h*.23],[x+10,y-h],[x+w-10,y-h],[x+w-7,y-h*.23],[x+w,y]],'#976452');
      this.path([[x+14,y-h+2],[x+23,y-h*.95],[x+20,y-5],[x+10,y]],'#bf8761');this.path([[x+w-17,y-h],[x+w-10,y-h],[x+w-7,y-h*.23],[x+w,y],[x+w-21,y-4]],'#6d494b');
      this.ellipse(x+w*.5,y-h,w*.5-9,7,'#e1af7a');this.ellipse(x+w*.5,y-h,w*.24,3,'#ab7658');c.strokeStyle='#68474b';c.lineWidth=2;c.beginPath();c.moveTo(x+w*.51,y-h+13);c.lineTo(x+w*.46,y-14);c.moveTo(x+w*.7,y-30);c.lineTo(x+w*.65,y-8);c.stroke();this.grass(x+4,y,9,'#d0a16c',4);
    }else{
      this.path([[x+3,y],[x,y-h*.45],[x+9,y-h*.68],[x+24,y-h*.35],[x+22,y]],'#d58e78');
      this.path([[x+14,y],[x+12,y-h*.76],[x+w*.53,y-h],[x+w*.79,y-h*.69],[x+w*.69,y]],'#ebad7e');
      this.path([[x+w*.53,y-h],[x+w*.51,y-4],[x+w*.69,y],[x+w*.79,y-h*.69]],'#b57579');
      this.path([[x+12,y-h*.76],[x+w*.53,y-h],[x+w*.44,y-h*.57],[x+20,y-4]],'#ffdbab');
      this.path([[x+w*.62,y],[x+w*.72,y-h*.39],[x+w*.95,y-h*.58],[x+w,y-h*.19],[x+w*.92,y]],'#e3a494');c.strokeStyle='#ffe4b7';c.lineWidth=1.5;c.beginPath();c.moveTo(x+12,y-h*.76);c.lineTo(x+w*.53,y-h);c.lineTo(x+w*.79,y-h*.69);c.stroke();
    }
  }
  dinosaur(x:number,y:number,s:SceneState) {
    const c=this.ctx,r=s.runner,running=s.status==='running'||s.status==='start', air=r.y>1,phase=s.time*(running?18:3), bob=air?0:Math.sin(phase*2)*1.7;
    this.ellipse(x+2,this.ground+2,Math.max(15,39-r.y*.08),6,'#2b253a40');
    c.save();c.translate(x,y-2+bob);if(s.status==='crashed'){const t=Math.min(1,s.crashTime*4);c.translate(-t*10,-Math.sin(t*Math.PI)*20);c.rotate(-t*.33);}
    const compression=r.land*.19+r.squash*.12;c.scale(1+compression*.5,1-compression);
    // Back plates, tail and the rear leg give the little runner its signature silhouette.
    this.path([[-18,-37],[-40,-45],[-58,-48],[-50,-37],[-33,-23],[-15,-19]],'#cf8948');
    this.path([[-25,-39],[-31,-53],[-19,-48],[-20,-58],[-9,-52],[-9,-67],[2,-59],[4,-76],[15,-65]],'#995b51');
    const stride=air?-.3:Math.sin(phase);this.leg(-7,-18,-stride*13,air?6:0,'#bf793e');
    const body=c.createLinearGradient(-12,-75,20,-10);body.addColorStop(0,'#f5c477');body.addColorStop(.55,'#e6a24f');body.addColorStop(1,'#d68d40');
    c.beginPath();c.moveTo(-29,-32);c.bezierCurveTo(-24,-46,-9,-49,-4,-57);c.bezierCurveTo(-3,-67,-3,-79,10,-82);c.bezierCurveTo(25,-87,43,-83,46,-70);c.quadraticCurveTo(50,-64,55,-62);c.quadraticCurveTo(61,-55,55,-49);c.quadraticCurveTo(48,-43,31,-46);c.quadraticCurveTo(27,-42,28,-31);c.bezierCurveTo(25,-11,-3,-10,-19,-20);c.quadraticCurveTo(-29,-24,-29,-32);c.fillStyle=body;c.fill();
    this.ellipse(14,-28,11,12,'#f8cd825e');this.leg(10,-16,stride*13,air?9:Math.max(0,-Math.cos(phase))*5,'#e7a451');
    c.strokeStyle='#c18143';c.lineWidth=6;c.lineCap='round';c.beginPath();c.moveTo(22,-38);c.quadraticCurveTo(30,-32,35,-37);c.stroke();
    this.ellipse(32,-65,6.5,8,'#fff0ca');this.ellipse(34,-65,3,4.5,'#34303e');this.ellipse(35,-67,1.1,1.4,'#ffffff');this.ellipse(50,-57,1.4,1.1,'#79533f');this.ellipse(37,-53,4.6,2.7,'#dc886278');
    c.strokeStyle='#a46a3d';c.lineWidth=1.3;c.beginPath();c.moveTo(41,-48);c.quadraticCurveTo(48,-47,52,-49);c.stroke();
    if(s.status==='crashed'){c.strokeStyle='#513e42';c.lineWidth=2;c.beginPath();c.moveTo(30,-68);c.lineTo(36,-62);c.moveTo(36,-68);c.lineTo(30,-62);c.stroke();}
    this.ellipse(8,-70,3,2,'#ffdea96e');c.restore();
  }
  leg(x:number,y:number,stride:number,lift:number,color:string) {const c=this.ctx;c.strokeStyle=color;c.lineWidth=10;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(x+stride*.5,y+8-lift);c.lineTo(x+stride,y+15-lift);c.lineTo(x+stride+7,y+15-lift);c.stroke();}
}
