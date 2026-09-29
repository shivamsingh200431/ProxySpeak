import { useEffect, useRef } from "react";
import { WORLD_WIDTH,WORLD_HEIGHT,AUDIO_RADIUS,THEME } from "../constants/world";

export default function WorldCanvas({position,playerName="You",remotePlayers=[],showProximityZone=true}){
  const canvasRef=useRef(null);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");if(!ctx)return;
    const dpr=window.devicePixelRatio||1;
    canvas.width=WORLD_WIDTH*dpr;canvas.height=WORLD_HEIGHT*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    const bg=ctx.createLinearGradient(0,0,WORLD_WIDTH,WORLD_HEIGHT);bg.addColorStop(0,"#171613");bg.addColorStop(.5,"#24221d");bg.addColorStop(1,"#0e0e0d");ctx.fillStyle=bg;ctx.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    ctx.fillStyle="#27241f";ctx.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    for(let y=0;y<WORLD_HEIGHT;y+=52){ctx.strokeStyle="rgba(255,255,255,.045)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD_WIDTH,y);ctx.stroke()}
    for(let x=0;x<WORLD_WIDTH;x+=52){ctx.strokeStyle="rgba(255,255,255,.035)";ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD_HEIGHT);ctx.stroke()}
    room(ctx,45,48,250,150,"LOUNGE");room(ctx,330,38,255,135,"FOCUS");room(ctx,635,45,215,160,"MEETING");room(ctx,70,330,250,125,"SOCIAL");room(ctx,625,325,205,135,"QUIET");
    wall(ctx,295,30,2,445);wall(ctx,620,30,2,445);wall(ctx,40,235,820,2);wall(ctx,350,38,2,135);wall(ctx,545,38,2,135);
    sofa(ctx,105,116,105,30);sofa(ctx,685,385,100,30);sofa(ctx,190,360,95,28);
    table(ctx,180,96,48,28);table(ctx,420,95,70,32);table(ctx,710,115,72,32);table(ctx,445,365,105,40);
    plant(ctx,65,75);plant(ctx,270,82);plant(ctx,590,84);plant(ctx,825,85);plant(ctx,600,375);plant(ctx,350,405);plant(ctx,835,400);
    board(ctx,335,66,185,72,"IDEAS / PEOPLE / PROXIMITY");pool(ctx,760,250,72,42);
    if(showProximityZone){const g=ctx.createRadialGradient(position.x,position.y,12,position.x,position.y,AUDIO_RADIUS);g.addColorStop(0,"rgba(255,48,47,.18)");g.addColorStop(.65,"rgba(255,48,47,.07)");g.addColorStop(1,"rgba(255,48,47,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(position.x,position.y,AUDIO_RADIUS,0,Math.PI*2);ctx.fill();ctx.setLineDash([8,6]);ctx.lineWidth=1.5;ctx.strokeStyle=THEME.proximity.stroke;ctx.beginPath();ctx.arc(position.x,position.y,AUDIO_RADIUS,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
    remotePlayers.forEach(player=>{const dx=player.x-position.x,dy=player.y-position.y,dist=Math.hypot(dx,dy),near=dist<=AUDIO_RADIUS;if(near){ctx.setLineDash([4,6]);ctx.strokeStyle="rgba(53,208,127,.25)";ctx.beginPath();ctx.moveTo(position.x,position.y);ctx.lineTo(player.x,player.y);ctx.stroke();ctx.setLineDash([])}drawAvatar(ctx,player.x,player.y,player.name,THEME.remotePlayer.core,THEME.remotePlayer.ring,false,near?Math.round(dist)+"u nearby":Math.round(dist)+"u")});
    drawAvatar(ctx,position.x,position.y,playerName,THEME.player.core,THEME.player.ring,true,"YOU");
  },[position,playerName,remotePlayers,showProximityZone]);
  return <div className="canvas-container"><canvas ref={canvasRef} className="world-canvas" style={{width:"100%",height:"100%"}}/></div>;
}
function room(ctx,x,y,w,h,label){ctx.fillStyle="rgba(11,11,10,.28)";ctx.fillRect(x,y,w,h);ctx.strokeStyle="rgba(255,255,255,.10)";ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);ctx.fillStyle="rgba(255,255,255,.36)";ctx.font="700 8px sans-serif";ctx.fillText(label,x+12,y+17)}
function wall(ctx,x,y,w,h){ctx.fillStyle="rgba(255,255,255,.10)";ctx.fillRect(x,y,w,h)}
function sofa(ctx,x,y,w,h){ctx.fillStyle="#76201f";ctx.fillRect(x,y,w,h);ctx.fillStyle="#9b2c29";ctx.fillRect(x,y,w,7);ctx.fillStyle="#3a1917";ctx.fillRect(x+5,y+h,w-10,8)}
function table(ctx,x,y,w,h){ctx.fillStyle="#171512";ctx.fillRect(x,y,w,h);ctx.strokeStyle="rgba(255,255,255,.13)";ctx.strokeRect(x,y,w,h);ctx.fillStyle="rgba(255,200,61,.25)";ctx.beginPath();ctx.arc(x+w/2,y+h/2,4,0,Math.PI*2);ctx.fill()}
function plant(ctx,x,y){ctx.fillStyle="#273a29";ctx.fillRect(x-5,y+14,10,10);for(let i=0;i<5;i++){ctx.fillStyle=i%2?"#3e6b45":"#567f4b";ctx.beginPath();ctx.ellipse(x+(i-2)*5,y+5-Math.abs(i-2)*2,5,12,(i-2)*.3,0,Math.PI*2);ctx.fill()}}
function board(ctx,x,y,w,h,text){ctx.fillStyle="#ddd9ca";ctx.fillRect(x,y,w,h);ctx.fillStyle="#161513";ctx.font="700 11px sans-serif";text.split(" / ").forEach((line,i)=>ctx.fillText(line,x+12,y+25+i*15))}
function pool(ctx,x,y,w,h){ctx.fillStyle="#193b3c";ctx.fillRect(x,y,w,h);ctx.strokeStyle="rgba(110,220,214,.28)";ctx.strokeRect(x,y,w,h)}
function drawAvatar(ctx,x,y,name,body,ring,local,sub){ctx.save();ctx.shadowColor=local?"rgba(255,48,47,.55)":"rgba(53,208,127,.35)";ctx.shadowBlur=local?18:12;ctx.strokeStyle=ring;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x,y,18,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;ctx.globalAlpha=.18;ctx.fillStyle=body;ctx.beginPath();ctx.arc(x,y,27,0,Math.PI*2);ctx.fill();ctx.filter=local?"blur(1.4px)":"blur(.7px)";ctx.fillStyle="#161616";ctx.beginPath();ctx.arc(x,y-9,7,0,Math.PI*2);ctx.fill();ctx.fillStyle=body;ctx.beginPath();ctx.roundRect(x-7,y-3,14,20,6);ctx.fill();ctx.fillStyle="#ddd8cc";ctx.beginPath();ctx.ellipse(x-5,y+17,4,2.5,0,0,Math.PI*2);ctx.ellipse(x+5,y+17,4,2.5,0,0,Math.PI*2);ctx.fill();ctx.restore();label(ctx,x,y-31,name,sub,local)}
function label(ctx,x,y,name,sub,local){ctx.font="700 11px sans-serif";const nw=ctx.measureText(name).width;ctx.font="9px sans-serif";const sw=ctx.measureText(sub).width;const w=Math.max(nw,sw)+22;ctx.fillStyle="rgba(8,8,7,.84)";ctx.beginPath();ctx.roundRect(x-w/2,y-22,w,34,8);ctx.fill();ctx.strokeStyle=local?"rgba(255,48,47,.4)":"rgba(255,255,255,.12)";ctx.stroke();ctx.textAlign="center";ctx.fillStyle="#f5f4ef";ctx.font="700 11px sans-serif";ctx.fillText(name,x,y-8);ctx.fillStyle=local?"#ff7775":"#8d8d86";ctx.font="9px sans-serif";ctx.fillText(sub,x,y+8)}