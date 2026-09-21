export class Soundscape {
  context?: AudioContext; master?: GainNode; enabled = true; private ambient?: GainNode;
  async unlock() {
    if (!this.enabled) return;
    try {
      if (!this.context) {
        this.context = new AudioContext(); this.master=this.context.createGain(); this.master.gain.value=.35; this.master.connect(this.context.destination);
        this.ambient=this.context.createGain(); this.ambient.gain.value=.022; this.ambient.connect(this.master);
        [130.81,196,261.63,329.63].forEach((f,i)=> { const o=this.context!.createOscillator(); o.type='sine'; o.frequency.value=f; o.detune.value=i%2 ? -4 : 4; o.connect(this.ambient!); o.start(); });
      }
      await this.context.resume();
    } catch { /* The game remains playable when audio is unavailable. */ }
  }
  setActive(active: boolean) { if(this.context && this.master) this.master.gain.setTargetAtTime(active && this.enabled ? .35 : 0, this.context.currentTime, .15); }
  toggle() { this.enabled=!this.enabled; if(this.enabled) void this.unlock(); this.setActive(true); }
  tone(from:number,to:number,duration:number,volume:number,type:OscillatorType='sine') {
    const c=this.context; if(!c || !this.master || !this.enabled || c.state!=='running') return;
    const o=c.createOscillator(), g=c.createGain(); o.type=type; o.frequency.setValueAtTime(from,c.currentTime); o.frequency.exponentialRampToValueAtTime(to,c.currentTime+duration); g.gain.setValueAtTime(0,c.currentTime); g.gain.linearRampToValueAtTime(volume,c.currentTime+.008); g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration); o.connect(g);g.connect(this.master);o.start();o.stop(c.currentTime+duration);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  jump() { this.tone(340,680,.17,.22,'sine'); }
  land() { this.tone(145,60,.1,.14,'triangle'); }
  hit() { this.tone(230,55,.28,.25,'triangle'); }
}
