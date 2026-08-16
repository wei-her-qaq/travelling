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

// ===== Dynamic pointer-scale for character cards =====
(function(){
  var row=document.getElementById('charsRow');
  if(!row)return;
  var cards=row.querySelectorAll('.char-card');
  if(!cards.length)return;
  var mouseX=0,mouseY=0,active=false,raf=null;
  var R=400; // decay radius in px

  function update(){
    var best=null,bestDist=Infinity;
    cards.forEach(function(card,i){
      var rect=card.getBoundingClientRect();
      var cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
      var dx=mouseX-cx,dy=mouseY-cy;
      var dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<bestDist){bestDist=dist;best=card}
      var tier=parseFloat(card.getAttribute('data-tier')==='S'?'1.18':card.getAttribute('data-tier')==='A'?'1.15':'1.12');
      var s=dist<R?tier:1;
      var b=dist<R?0.18+0.82*(1-dist/R):0.18;
      card.style.transform='scale('+s+')';
      card.style.filter='brightness('+b.toFixed(2)+')';
      card.style.borderColor='rgba(138,43,226,'+(dist<R?0.5:0.15)+')';
      card.style.boxShadow=dist<R?'0 12px 40px rgba(138,43,226,'+(0.3*(1-dist/R)).toFixed(2)+')':'none';
      card.style.zIndex=dist<R?10:1;
    });
    raf=null;
  }

  row.addEventListener('mousemove',function(e){
    mouseX=e.clientX;mouseY=e.clientY;
    if(!active){active=true;row.style.pointerEvents='auto'}
    if(!raf)raf=requestAnimationFrame(update);
  });
  row.addEventListener('mouseleave',function(){
    active=false;
    cards.forEach(function(card){
      card.style.transform='scale(1)';
      card.style.filter='brightness(0.35)';
      card.style.borderColor='rgba(138,43,226,.15)';
      card.style.boxShadow='none';
      card.style.zIndex=1;
    });
  });

  // Touch fallback: tap to focus
  cards.forEach(function(card){
    card.addEventListener('touchstart',function(e){
      e.preventDefault();
      cards.forEach(function(c){c.style.transform='scale(1)';c.style.filter='brightness(0.35)';c.style.borderColor='rgba(138,43,226,.15)';c.style.boxShadow='none';c.style.zIndex=1});
      var tier=parseFloat(card.getAttribute('data-tier')==='S'?'1.18':card.getAttribute('data-tier')==='A'?'1.15':'1.12');
      card.style.transform='scale('+tier+')';
      card.style.filter='brightness(0.85)';
      card.style.borderColor='rgba(138,43,226,.5)';
      card.style.boxShadow='0 12px 40px rgba(138,43,226,.3)';
      card.style.zIndex=10;
      setTimeout(function(){card.style.transform='scale(1)';card.style.filter='brightness(0.35)';card.style.borderColor='rgba(138,43,226,.15)';card.style.boxShadow='none';card.style.zIndex=1},3000);
    });
  });
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