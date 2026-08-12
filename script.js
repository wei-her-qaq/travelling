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

(function(){
  var main=[],spin=[],extra=[];
  function loadBooks(){
    fetch('/api/books').then(function(r){return r.json();}).then(function(data){
      (data||[]).forEach(function(b){
        if(b.cover&&b.cover.indexOf('cover_')>=0){b.cat='main'}
        else if(b.cover){b.cat='main'}
        if(b.title.indexOf('外传')>=0||b.title.indexOf('莉莉')>=0)spin.push(b);
        else if(b.title.indexOf('番外')>=0||b.title.indexOf('學園')>=0||b.title.indexOf('学园')>=0)extra.push(b);
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

var readerModal=null,readerChapters=[],readerCur=-1,readerBook='';

function openReader(fileName){
  if(!readerModal){
    readerModal=document.createElement('div');readerModal.className='reader-modal';
    readerModal.innerHTML='<div class="reader-header">'+
      '<button class="reader-close" id="readerClose">✕</button>'+
      '<button class="reader-close" id="readerToc">☰</button>'+
      '<h3 id="readerTitle">加载中...</h3>'+
      '<button class="reader-close" id="readerPrev">◀</button>'+
      '<button class="reader-close" id="readerNext">▶</button>'+
    '</div>'+
    '<div class="reader-main">'+
      '<div class="reader-toc" id="readerTocList"></div>'+
      '<div class="reader-content" id="readerContent">'+
        '<div class="reader-inner"><p style="text-align:center;color:#8a7faf;padding:3rem;">加载中...</p></div>'+
      '</div>'+
    '</div>';
    document.body.appendChild(readerModal);
    document.getElementById('readerClose').addEventListener('click',closeReader);
    document.getElementById('readerToc').addEventListener('click',function(){document.getElementById('readerTocList').classList.toggle('open');});
    document.getElementById('readerPrev').addEventListener('click',function(){loadReaderChapter(readerCur-1);});
    document.getElementById('readerNext').addEventListener('click',function(){loadReaderChapter(readerCur+1);});
    document.addEventListener('keydown',readerKeyHandler);
  }
  readerModal.classList.add('show');
  document.body.style.overflow='hidden';
  readerBook=fileName;
  document.getElementById('readerTitle').textContent='加载中...';
  setContent('<p style="text-align:center;color:#8a7faf;padding:3rem;">加载目录...</p>');
  document.getElementById('readerTocList').innerHTML='';
  document.getElementById('readerTocList').classList.remove('open');

  fetch('/api/book/'+encodeURIComponent(fileName)+'/chapters').then(function(r){return r.json();}).then(function(data){
    readerChapters=data.chapters||[];
    renderToc(readerChapters);
    if(readerChapters.length>0)loadReaderChapter(0);else setContent('<p style="text-align:center;color:#8a7faf;padding:3rem;">未能解析章节</p>');
  }).catch(function(err){
    setContent('<p style="text-align:center;color:#8a7faf;padding:3rem;">加载失败: '+err.message+'</p>');
  });
}

function renderToc(chapters){
  var toc=document.getElementById('readerTocList');toc.innerHTML='';
  chapters.forEach(function(ch,i){
    var btn=document.createElement('button');btn.className='reader-toc-item';
    btn.textContent=(i+1)+'. '+ch.title;
    btn.addEventListener('click',function(){loadReaderChapter(i);document.getElementById('readerTocList').classList.remove('open');});
    toc.appendChild(btn);
  });
}

function loadReaderChapter(index){
  if(index<0||index>=readerChapters.length)return;
  readerCur=index;
  document.getElementById('readerTitle').textContent=readerChapters[index].title;
  var items=document.querySelectorAll('.reader-toc-item');
  items.forEach(function(it,i){it.classList.toggle('active',i===index);});
  setContent('<p style="text-align:center;color:#8a7faf;padding:3rem;">加载中...</p>');

  fetch('/api/book/'+encodeURIComponent(readerBook)+'/chapter/'+index).then(function(r){return r.text();}).then(function(html){
    var body=html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    var inner=body?body[1]:html;
    inner=inner.replace(/<svg[\s\S]*?<\/svg>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'');
    var nav='<div class="reader-nav">'+
      '<button '+(readerCur<=0?'disabled':'')+' onclick="window._loadRd('+(readerCur-1)+')">← 上一章</button>'+
      '<span>'+(readerCur+1)+' / '+readerChapters.length+'</span>'+
      '<button '+(readerCur>=readerChapters.length-1?'disabled':'')+' onclick="window._loadRd('+(readerCur+1)+')">下一章 →</button>'+
    '</div>';
    setContent('<h1>'+readerChapters[index].title+'</h1>'+inner+nav);
    document.getElementById('readerContent').scrollTop=0;
  }).catch(function(err){setContent('<p style="text-align:center;color:#8a7faf;padding:3rem;">加载失败: '+err.message+'</p>');});
}
window._loadRd=function(idx){loadReaderChapter(idx);};

function setContent(html){document.getElementById('readerContent').innerHTML='<div class="reader-inner">'+html+'</div>';}

function readerKeyHandler(e){
  if(!readerModal||!readerModal.classList.contains('show'))return;
  if(e.key==='Escape'){closeReader();return;}
  if(e.key==='ArrowRight')loadReaderChapter(readerCur+1);
  if(e.key==='ArrowLeft')loadReaderChapter(readerCur-1);
}
function closeReader(){
  if(readerModal)readerModal.classList.remove('show');
  document.body.style.overflow='';
  document.getElementById('readerTocList').classList.remove('open');
}
})();