(function(){
'use strict';
var nb=document.querySelector('.navbar'),scrolled=false;
window.addEventListener('scroll',function(){
  var s=window.scrollY>50;
  if(s!==scrolled){scrolled=s;nb.classList.toggle('scrolled',s);}
  document.getElementById('backToTop').classList.toggle('visible',window.scrollY>500);
});

// mobile menu
var toggle=document.querySelector('.nav-toggle'),menu=document.querySelector('.nav-menu');
toggle.addEventListener('click',function(){menu.classList.toggle('active');});
menu.querySelectorAll('a').forEach(function(l){l.addEventListener('click',function(){menu.classList.remove('active');});});

// particles
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

// gallery carousel
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

// back to top
document.getElementById('backToTop').addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});

// scroll animations
var observer=new IntersectionObserver(function(entries){
  entries.forEach(function(e){if(e.isIntersecting){e.target.style.opacity='1';e.target.style.transform='translateY(0)';}});
},{threshold:.1});
document.querySelectorAll('.story-card,.char-card,.tl-card,.wall-item,.book-item').forEach(function(el){
  el.style.opacity='0';el.style.transform='translateY(30px)';el.style.transition='opacity .6s,transform .6s';observer.observe(el);
});

// lightbox
window.openLightbox=function(src){document.getElementById('lbImg').src=src;document.getElementById('lightbox').classList.add('show');};
window.closeLightbox=function(){document.getElementById('lightbox').classList.remove('show');};
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeLightbox();});

// books grid
(function(){
  var main=[],spin=[],extra=[];
  BOOKS.forEach(function(b){
    if(b.cat==='spin')spin.push(b);else if(b.cat==='extra')extra.push(b);else main.push(b);
  });
  renderGrid('booksGrid',main);
  renderGrid('spinGrid',spin);
  renderGrid('extraGrid',extra);

  function renderGrid(id,books){
    var g=document.getElementById(id);if(!g)return;
    books.forEach(function(b){
      var item=document.createElement('div');item.className='book-item';
      var cover=document.createElement('div');cover.className='book-cover';
      cover.style.backgroundImage='url('+b.cover+')';
      var info=document.createElement('div');info.className='book-info';
      var h4=document.createElement('h4');h4.textContent=b.title;
      var btns=document.createElement('div');btns.className='book-btns';
      var read=document.createElement('button');read.className='book-read';read.textContent='在线阅读';
      read.addEventListener('click',function(){openReader(b.file);});
      var dl=document.createElement('a');dl.className='book-dl';dl.textContent='下载';dl.href='books/'+encodeURIComponent(b.file);dl.download=b.file;
      btns.appendChild(read);btns.appendChild(dl);info.appendChild(h4);info.appendChild(btns);
      item.appendChild(cover);item.appendChild(info);g.appendChild(item);
    });
  }
})();

// EPUB reader
var readerModal=null,readerChapters=[],readerCur=-1,readerZip=null;
function openReader(filename){
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
        '<div class="reader-content-inner"><div class="reader-empty"><p>加载中...</p></div></div>'+
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
  document.getElementById('readerTitle').textContent='加载中...';
  document.getElementById('readerContent').querySelector('.reader-content-inner').innerHTML='<div class="reader-empty"><p>加载中...</p></div>';
  document.getElementById('readerTocList').innerHTML='';
  document.getElementById('readerTocList').classList.remove('open');

  loadEpub('books/'+filename);
}

function loadEpub(url){
  fetch(url).then(function(r){return r.arrayBuffer();}).then(function(data){
    return JSZip.loadAsync(data);
  }).then(function(zip){
    readerZip=zip;
    document.getElementById('readerTitle').textContent='解析中...';
    return parseEpub(zip);
  }).then(function(chapters){
    readerChapters=chapters;
    renderToc(chapters);
    if(chapters.length>0){loadReaderChapter(0);}
    else{document.getElementById('readerContent').querySelector('.reader-content-inner').innerHTML='<div class="reader-empty"><p>无法解析章节</p></div>';}
  }).catch(function(e){
    document.getElementById('readerContent').querySelector('.reader-content-inner').innerHTML='<div class="reader-empty"><p>加载失败: '+e.message+'</p></div>';
  });
}

function parseEpub(zip){
  var chapters=[];
  var tocFile=null;
  zip.forEach(function(path,entry){
    if(path.match(/toc\.ncx$/i))tocFile=path;
  });
  if(tocFile){
    var file=zip.file(tocFile);
    if(file)return file.async('string').then(function(xmlStr){
      var parser=new DOMParser();var doc=parser.parseFromString(xmlStr,'text/xml');
      var nps=doc.getElementsByTagName('navPoint');
      for(var i=0;i<nps.length;i++){
        var np=nps[i];
        var labelEl=np.getElementsByTagName('text')[0]||np.getElementsByTagName('navLabel')[0];
        var label=labelEl?labelEl.textContent:'章节 '+(i+1);
        var contentEl=np.getElementsByTagName('content')[0];
        var src=contentEl?contentEl.getAttribute('src'):'';
        chapters.push({title:label,src:src});
      }
      return chapters;
    });
  }
  // fallback: spine
  var opfFile=null;
  zip.forEach(function(path,entry){if(path.match(/\.opf$/i)&&!path.match(/META-INF/i))opfFile=path;});
  if(!opfFile){
    var container=zip.file('META-INF/container.xml');
    if(container)return container.async('string').then(function(cStr){
      var p=new DOMParser();var d=p.parseFromString(cStr,'text/xml');
      var rf=d.getElementsByTagName('rootfile')[0];
      if(rf){opfFile=rf.getAttribute('full-path');}
      return parseOpfSpine(zip,opfFile);
    });
  }
  return parseOpfSpine(zip,opfFile);
}

function parseOpfSpine(zip,opfFile){
  if(!opfFile)return Promise.resolve([]);
  return zip.file(opfFile).async('string').then(function(opfStr){
    var chapters=[];
    var p=new DOMParser();var d=p.parseFromString(opfStr,'text/xml');
    var items=d.getElementsByTagName('item');var im={};
    for(var i=0;i<items.length;i++){var it=items[i];im[it.getAttribute('id')]=it.getAttribute('href');}
    var spine=d.getElementsByTagName('itemref');
    var base=opfFile.replace(/\/[^\/]+$/,'')+'/';
    for(var j=0;j<spine.length;j++){
      var href=im[spine[j].getAttribute('idref')];
      if(href){chapters.push({title:'第'+(j+1)+'章',src:base+href});}
    }
    return chapters;
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
  var content=document.getElementById('readerContent').querySelector('.reader-content-inner');
  content.innerHTML='<div class="reader-empty"><p>加载中...</p></div>';

  var ch=readerChapters[index];
  var file=readerZip.file(ch.src);
  if(!file){
    // try partial match
    var found=false;
    readerZip.forEach(function(path,entry){
      if(!found&&path.indexOf(ch.src.replace(/^.*\//,''))>=0){found=true;file=readerZip.file(path);}
    });
  }
  if(!file){content.innerHTML='<div class="reader-empty"><p>找不到章节: '+ch.src+'</p></div>';return;}

  file.async('string').then(function(html){
    // fix image paths
    var base=ch.src.replace(/\/[^\/]+$/,'')+'/';
    html=html.replace(/src="([^"]+)"/g,function(m,p1){
      if(p1.match(/^(https?:|data:)/))return m;
      var resolved=base+p1;resolved=resolved.replace(/\/\.\//g,'/');
      while(resolved.indexOf('/../')>=0){resolved=resolved.replace(/\/[^\/]+\/\.\.\//g,'/');}
      var imgFile=readerZip.file(resolved);
      if(!imgFile){
        readerZip.forEach(function(path,entry){if(!imgFile&&path.indexOf(resolved.replace(/^.*\//,''))>=0)imgFile=readerZip.file(path);});
      }
      if(imgFile){return 'src="'+URL.createObjectURL(new Blob([imgFile.asArrayBuffer()]))+'"';}
      return m;
    });
    html=html.replace(/<svg[\s\S]*?<\/svg>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'');
    var body=html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    var inner=body?body[1]:html;
    var navHtml='<div class="reader-nav">'+
      '<button '+(readerCur<=0?'disabled':'')+' onclick="loadReaderChapter('+(readerCur-1)+')">← 上一章</button>'+
      '<span>'+(readerCur+1)+' / '+readerChapters.length+'</span>'+
      '<button '+(readerCur>=readerChapters.length-1?'disabled':'')+' onclick="loadReaderChapter('+(readerCur+1)+')">下一章 →</button>'+
    '</div>';
    content.innerHTML='<h1>'+ch.title+'</h1>'+inner+navHtml;
    document.getElementById('readerContent').scrollTop=0;
  }).catch(function(e){
    content.innerHTML='<div class="reader-empty"><p>加载失败: '+e.message+'</p></div>';
  });
}
window.loadReaderChapter=function(idx){loadReaderChapter(idx);};

function readerKeyHandler(e){
  if(!readerModal||!readerModal.classList.contains('show'))return;
  if(e.key==='Escape'){closeReader();return;}
  if(e.key==='ArrowRight'){loadReaderChapter(readerCur+1);}
  if(e.key==='ArrowLeft'){loadReaderChapter(readerCur-1);}
}

function closeReader(){
  if(readerModal){readerModal.classList.remove('show');}
  document.body.style.overflow='';
  document.getElementById('readerTocList').classList.remove('open');
}

})();