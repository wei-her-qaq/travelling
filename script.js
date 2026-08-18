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

// ===== 指南针轮盘 (Compass Wheel) =====
(function(){
  var wrap=document.getElementById('charWheel');
  if(!wrap)return;
  var ring=document.getElementById('wheelRing');
  var sectors=ring.querySelectorAll('.wheel-sector');
  if(!sectors.length)return;
  
  var N=sectors.length;
  var ANGLE=360/N; // 30° per sector
  var currentIdx=0;
  var currentAngle=0;
  var targetAngle=0;
  var animating=false;

  function updateWheel(){
    ring.style.transform='translate(-50%,-50%) rotate('+(-currentAngle)+'deg)';
    
    for(var i=0;i<N;i++){
      var rel=(i-currentIdx+N)%N;
      var fromTop=Math.min(rel,N-rel);
      var scale=fromTop===0?1.15:fromTop===1?0.85:0.7;
      var brightness=fromTop===0?1:fromTop===1?0.7:0.4;
      sectors[i].style.transform='scale('+scale+')';
      sectors[i].style.filter='brightness('+brightness+')';
    }
    
    updateInfo(currentIdx);
  }

  function rotateWheel(delta){
    if(animating)return;
    animating=true;
    var target=currentIdx+delta;
    target=((target%N)+N)%N;
    var angleDelta=delta*ANGLE;
    var startAngle=currentAngle;
    var endAngle=currentAngle+angleDelta;
    var startTime=null;
    var duration=500;

    function animate(ts){
      if(!startTime)startTime=ts;
      var elapsed=ts-startTime;
      var progress=Math.min(elapsed/duration,1);
      var eased=progress<0.5
        ? 4*progress*progress*progress
        : 1-Math.pow(-2*progress+2,3)/2;
      currentAngle=startAngle+(endAngle-startAngle)*eased;
      var t=startAngle+(endAngle-startAngle)*eased;
      ring.style.transform='translate(-50%,-50%) rotate('+(-t)+'deg)';
      
      var rel=(Math.round((currentIdx+delta*eased)%N+N)%N);
      for(var i=0;i<N;i++){
        var diff=(i-rel+N)%N;
        var fromTop=Math.min(diff,N-diff);
        var scale=fromTop===0?1.15:fromTop===1?0.85:0.7;
        var brightness=fromTop===0?1:fromTop===1?0.7:0.4;
        sectors[i].style.transform='scale('+scale+')';
        sectors[i].style.filter='brightness('+brightness+')';
      }
      
      if(progress<1){
        requestAnimationFrame(animate);
      }else{
        currentIdx=target;
        currentAngle=endAngle;
        animating=false;
        updateWheel();
      }
    }
    requestAnimationFrame(animate);
  }

  // 滚轮控制（120ms节流）
  var wheelTimer=null;
  wrap.addEventListener('wheel',function(e){
    e.preventDefault();
    if(animating||wheelTimer)return;
    var dir=e.deltaY>0?1:-1;
    rotateWheel(dir);
    wheelTimer=setTimeout(function(){wheelTimer=null},120);
  },{passive:false});

  // 点击扇区
  sectors.forEach(function(s,i){
    s.addEventListener('click',function(){
      if(animating)return;
      var diff=((i-currentIdx+N)%N);
      if(diff>N/2)diff=diff-N;
      if(diff!==0)rotateWheel(diff);
    });
  });

  function updateInfo(idx){
    var s=sectors[idx];
    document.getElementById('infoPortrait').style.backgroundImage='url('+s.getAttribute('data-img')+')';
    document.getElementById('infoName').textContent=s.getAttribute('data-name');
    document.getElementById('infoTitle').textContent=s.getAttribute('data-title');
    document.getElementById('infoDetail').textContent=s.getAttribute('data-desc');
  }

  // 详情展开
  var toggle=document.querySelector('.info-toggle');
  var detail=document.getElementById('infoDetail');
  toggle.addEventListener('click',function(){
    var expanded=toggle.getAttribute('aria-expanded')==='true';
    toggle.setAttribute('aria-expanded',expanded?'false':'true');
    detail.setAttribute('aria-expanded',expanded?'false':'true');
  });

  // 键盘控制
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowLeft')rotateWheel(-1);
    if(e.key==='ArrowRight')rotateWheel(1);
  });

  // 触摸控制
  var touchStart=null;
  wrap.addEventListener('touchstart',function(e){touchStart=e.touches[0].clientX},{passive:true});
  wrap.addEventListener('touchmove',function(e){
    if(touchStart===null)return;
    var dx=e.touches[0].clientX-touchStart;
    if(Math.abs(dx)>40){
      if(!animating)rotateWheel(dx>0?-1:1);
      touchStart=e.touches[0].clientX;
    }
  },{passive:true});
  wrap.addEventListener('touchend',function(){touchStart=null},{passive:true});

  // 初始化
  currentAngle=0;
  currentIdx=0;
  updateWheel();
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