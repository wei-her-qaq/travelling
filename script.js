(function(){
'use strict';
var nb=document.querySelector('.navbar'),scrolled=false;
window.addEventListener('scroll',function(){
  var s=window.scrollY>50;
  if(s!==scrolled){scrolled=s;nb.classList.toggle('scrolled',s);}
  document.getElementById('backToTop').classList.toggle('visible',window.scrollY>500);
});

var toggle=document.querySelector('.nav-toggle'),menu=document.querySelector('.nav-menu');
toggle.addEventListener('click',function(){menu.classList.toggle('active');});
menu.querySelectorAll('a').forEach(function(l){l.addEventListener('click',function(){menu.classList.remove('active');});});

(function(){
  var c=document.getElementById('particles'),n=50;
  for(var i=0;i<n;i++){
    var p=document.createElement('div');p.className='particle';
    var s=Math.random()*4+2;p.style.width=s+'px';p.style.height=s+'px';
    p.style.left=Math.random()*100+'%';
    p.style.animationDuration=Math.random()*10+6+'s';
    p.style.animationDelay=Math.random()*10+'s';
    p.style.background='rgba('+(Math.random()>.5?'201,160,255':'138,43,226')+','+(Math.random()*.4+.2)+')';
    c.appendChild(p);
  }
})();

(function(){
  var slides=document.querySelectorAll('.gallery-slide'),dotsC=document.getElementById('galleryDots');
  var cur=0,total=slides.length;
  for(var i=0;i<total;i++){
    var d=document.createElement('button');d.className='gallery-dot'+(i===0?' active':'');
    (function(idx){d.addEventListener('click',function(){go(idx);});})(i);
    dotsC.appendChild(d);
  }
  var dots=document.querySelectorAll('.gallery-dot');
  function go(i){slides[cur].classList.remove('active');dots[cur].classList.remove('active');cur=i;slides[cur].classList.add('active');dots[cur].classList.add('active');}
  function next(){go((cur+1)%total);}function prev(){go((cur-1+total)%total);}
  document.getElementById('nextBtn').addEventListener('click',next);
  document.getElementById('prevBtn').addEventListener('click',prev);
  var auto=setInterval(next,5000);
  var slider=document.getElementById('gallerySlider');
  slider.addEventListener('mouseenter',function(){clearInterval(auto);});
  slider.addEventListener('mouseleave',function(){auto=setInterval(next,5000);});
  document.addEventListener('keydown',function(e){if(e.key==='ArrowLeft')prev();if(e.key==='ArrowRight')next();});
})();

document.getElementById('backToTop').addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});

var observer=new IntersectionObserver(function(entries){
  entries.forEach(function(e){if(e.isIntersecting){e.target.style.opacity='1';e.target.style.transform='translateY(0)';}});
},{threshold:.1});
document.querySelectorAll('.story-card,.char-card,.tl-card,.wall-item,.book-item').forEach(function(el){
  el.style.opacity='0';el.style.transform='translateY(30px)';el.style.transition='opacity .6s,transform .6s';observer.observe(el);
});

window.openLightbox=function(src){document.getElementById('lbImg').src=src;document.getElementById('lightbox').classList.add('show');};
window.closeLightbox=function(){document.getElementById('lightbox').classList.remove('show');};
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeLightbox();});

// ===== Character Carousel =====
(function(){
  var wrap=document.getElementById('charCarousel');
  if(!wrap)return;
  var track=document.getElementById('charTrack');
  var orbs=track.querySelectorAll('.char-orb');
  if(!orbs.length)return;
  var N=orbs.length;
  var current=0,raf=null,targetOffset=0,offset=0;
  var detailOpen=false;

  // Preload images as background
  for(var i=0;i<N;i++){
    var img=orbs[i].getAttribute('data-img');
    if(img)orbs[i].style.backgroundImage='url("'+img+'")';
  }

  function layout(){
    var trackH=track.offsetHeight||420;
    var centerY=trackH/2;
    var maxR=140; // max vertical offset from center in px
    var visible=5; // visible orbs (center + 2 on each side)
    var orbSize=80;

    for(var i=0;i<N;i++){
      var orb=orbs[i];
      var rel=i-current;
      // wrap-around distance
      if(rel>N/2)rel-=N;
      if(rel<-N/2)rel+=N;

      var absRel=Math.abs(rel);
      if(absRel>visible){
        orb.style.opacity='0';
        orb.style.transform='translate(-50%,-50%) scale(0.3)';
        orb.style.pointerEvents='none';
        continue;
      }

      // Arc layout: orbs curve along a vertical arc
      var t=rel; // -visible..visible
      var y=t*(trackH*0.13); // vertical spacing
      var arc=Math.abs(t)*8; // horizontal offset for arc effect
      var scale=absRel===0?1.6:Math.max(0.4,1-absRel*0.2);
      var opacity=absRel===0?1:Math.max(0.2,1-absRel*0.25);
      var zIndex=100-absRel;

      orb.style.transform='translate('+(arc*0+0)+'px,'+y+'px) translate(-50%,-50%) scale('+scale+')';
      orb.style.opacity=opacity;
      orb.style.zIndex=zIndex;
      orb.style.pointerEvents='auto';
      orb.style.left='50%';
      orb.style.top=centerY+'px';

      if(absRel===0)orb.classList.add('focused');
      else orb.classList.remove('focused');
    }
  }

  function updatePanel(){
    var orb=orbs[current];
    if(!orb)return;
    var img=orb.getAttribute('data-img');
    var name=orb.getAttribute('data-name');
    var title=orb.getAttribute('data-title');
    var desc=orb.getAttribute('data-desc');
    var detail=orb.getAttribute('data-detail');

    var panel=document.getElementById('charInfoPanel');
    panel.style.opacity='0.3';

    setTimeout(function(){
      document.getElementById('charInfoImg').style.backgroundImage='url("'+img+'")';
      document.getElementById('charInfoName').textContent=name;
      document.getElementById('charInfoTitleText').textContent=title;
      document.getElementById('charInfoDesc').textContent=desc;
      document.getElementById('charInfoDetail').textContent=detail;
      if(detailOpen){
        document.getElementById('charInfoDetail').classList.add('open');
        document.getElementById('charInfoToggle').textContent='收起 ▲';
      }else{
        document.getElementById('charInfoDetail').classList.remove('open');
        document.getElementById('charInfoToggle').textContent='展开详情 ▼';
      }
      panel.style.opacity='1';
    },150);
  }

  function rotate(dir){
    current=(current+dir+N)%N;
    layout();
    updatePanel();
  }

  function snapTo(idx){
    if(idx===current)return;
    var diff=idx-current;
    if(diff>N/2)diff-=N;
    if(diff<-N/2)diff+=N;
    current=(current+diff+N)%N;
    layout();
    updatePanel();
  }

  // Wheel control
  var wheelTimer=null;
  wrap.addEventListener('wheel',function(e){
    e.preventDefault();
    if(wheelTimer)return;
    var dir=e.deltaY>0?1:-1;
    rotate(dir);
    wheelTimer=setTimeout(function(){wheelTimer=null},120);
  },{passive:false});

  // Mouse Y-axis drag control
  var dragging=false,startY=0,startOffset=0;
  track.addEventListener('mousedown',function(e){
    dragging=true;startY=e.clientY;startOffset=current;
    track.style.cursor='grabbing';
  });
  document.addEventListener('mousemove',function(e){
    if(!dragging)return;
    var dy=e.clientY-startY;
    var step=Math.round(dy/40);
    var newIdx=(Math.round(startOffset)+step+N)%N;
    if(newIdx!==current)snapTo(newIdx);
  });
  document.addEventListener('mouseup',function(){dragging=false;track.style.cursor='default'});

  // Touch control
  var touchStartY=0,touchStartOffset=0;
  track.addEventListener('touchstart',function(e){
    touchStartY=e.touches[0].clientY;
    touchStartOffset=current;
  },{passive:true});
  track.addEventListener('touchmove',function(e){
    var dy=e.touches[0].clientY-touchStartY;
    var step=Math.round(dy/40);
    var newIdx=(Math.round(touchStartOffset)+step+N)%N;
    if(newIdx!==current)snapTo(newIdx);
  },{passive:true});

  // Click orb to focus
  orbs.forEach(function(orb){
    orb.addEventListener('click',function(){
      snapTo(parseInt(orb.getAttribute('data-i')));
    });
  });

  // Toggle detail
  document.getElementById('charInfoToggle').addEventListener('click',function(){
    detailOpen=!detailOpen;
    var detail=document.getElementById('charInfoDetail');
    var btn=document.getElementById('charInfoToggle');
    if(detailOpen){
      detail.classList.add('open');
      btn.textContent='收起 ▲';
    }else{
      detail.classList.remove('open');
      btn.textContent='展开详情 ▼';
    }
  });

  // Init
  layout();
  updatePanel();
  window.addEventListener('resize',layout);
})();
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeLightbox();});

(function(){
  var main=[],spin=[],extra=[];
  function loadBooks(){
    fetch('/api/books').then(function(r){return r.json();}).then(function(data){
      (data||[]).forEach(function(b){
        if(b.cat==='spin')spin.push(b);
        else if(b.cat==='extra')extra.push(b);
        else main.push(b);
      });
      main.sort(function(a,b){return a.title.localeCompare(b.title,'zh-Hans-CN',{numeric:true});});
      renderGrid('booksGrid',main);
      renderGrid('spinGrid',spin);
      renderGrid('extraGrid',extra);
    }).catch(function(){
      renderGrid('booksGrid',[{title:'请通过服务器访问',cover:'',file:''}]);
    });
  }
  function renderGrid(id,books){
    var g=document.getElementById(id);if(!g)return;
    g.innerHTML='';
    books.forEach(function(b){
      var item=document.createElement('div');item.className='book-item';
      var cover=document.createElement('div');cover.className='book-cover';
      if(b.cover)cover.style.backgroundImage='url("'+b.cover+'")';
      var info=document.createElement('div');info.className='book-info';
      var h4=document.createElement('h4');h4.textContent=b.title||'未知';h4.setAttribute('data-title',b.title||'未知');
      var btns=document.createElement('div');btns.className='book-btns';
      if(b.filename){
        var read=document.createElement('button');read.className='book-read';read.textContent='在线阅读';
        (function(f){read.addEventListener('click',function(){openReader(f);});})(b.filename);
        var dl=document.createElement('a');dl.className='book-dl';dl.textContent='下载';dl.href='books/'+encodeURIComponent(b.filename);
        btns.appendChild(read);btns.appendChild(dl);
      }
      info.appendChild(h4);info.appendChild(btns);
      item.appendChild(cover);item.appendChild(info);g.appendChild(item);
    });
  }
  loadBooks();
})();

function openReader(fileName){
  window.open('reader.html?book='+encodeURIComponent(fileName),'_blank');
}

})();