(function(){
'use strict';

var readerChapters=[],readerCur=-1,readerBook='',readerLoaded=false;

function getParam(name){
  var m=new RegExp('[?&]'+name+'=([^&]*)').exec(location.search);
  return m?decodeURIComponent(m[1].replace(/\+/g,' ')):null;
}

var bookParam=getParam('book');
var chParam=null,pgParam=null;
(function(){
  var m=location.hash.match(/^#ch(\d+)(?:\.pg(\d+))?/);
  if(m){chParam=parseInt(m[1],10);pgParam=m[2]?parseInt(m[2],10):null;}
})();

function updateHash(ch,pg){
  var h='#ch'+ch;
  if(pg>0)h+='.pg'+pg;
  history.replaceState(null,'',location.pathname+location.search+h);
}

document.getElementById('readerClose').addEventListener('click',function(){window.close();});
document.getElementById('readerToc').addEventListener('click',function(){document.getElementById('readerTocList').classList.toggle('open');});
document.getElementById('readerPrev').addEventListener('click',function(){loadReaderChapter(readerCur-1);});
document.getElementById('readerNext').addEventListener('click',function(){loadReaderChapter(readerCur+1);});
document.addEventListener('keydown',function(e){
  if(e.key==='ArrowRight')loadReaderChapter(readerCur+1);
  if(e.key==='ArrowLeft')loadReaderChapter(readerCur-1);
});

function init(){
  if(!bookParam)return;
  readerBook=bookParam;
  document.getElementById('readerTitle').textContent='加载中...';
  setContent('<p style="text-align:center;color:#8a7faf;padding:3rem;">加载目录...</p>');
  fetch('/api/book/'+encodeURIComponent(bookParam)+'/chapters').then(function(r){return r.json();}).then(function(data){
    readerChapters=data.chapters||[];
    renderToc(readerChapters);
    var start=chParam||0;
    if(start>=readerChapters.length)start=0;
    loadReaderChapter(start);
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
    inner=inner.replace(/<svg[\s\S]*?<\/svg>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<h1[\s\S]*?<\/h1>/i,'');
    var nav='<div class="reader-nav">'+
      '<button '+(readerCur<=0?'disabled':'')+' onclick="window._loadRd('+(readerCur-1)+')">← 上一章</button>'+
      '<span>'+(readerCur+1)+' / '+readerChapters.length+'</span>'+
      '<button '+(readerCur>=readerChapters.length-1?'disabled':'')+' onclick="window._loadRd('+(readerCur+1)+')">下一章 →</button>'+
    '</div>';
    setContent('<h1>'+readerChapters[index].title+'</h1>'+inner+nav);
    var contentEl=document.getElementById('readerContent');
    contentEl.scrollTop=0;
    updateHash(index,0);
    scrollToPg();
  }).catch(function(err){setContent('<p style="text-align:center;color:#8a7faf;padding:3rem;">加载失败: '+err.message+'</p>');});
}
window._loadRd=function(idx){loadReaderChapter(idx);};

function setContent(html){document.getElementById('readerContent').innerHTML='<div class="reader-inner">'+html+'</div>';}

function scrollToPg(){
  if(!pgParam)return;
  var el=document.getElementById('pg-'+pgParam);
  if(el)el.scrollIntoView({behavior:'auto',block:'start'});
}

// Track scroll position and update URL hash
var scrollTimer=null;
document.getElementById('readerContent').addEventListener('scroll',function(){
  if(scrollTimer)clearTimeout(scrollTimer);
  scrollTimer=setTimeout(function(){
    var contentEl=document.getElementById('readerContent');
    var inner=contentEl.querySelector('.reader-inner');
    if(!inner)return;
    var paragraphs=inner.querySelectorAll('p[id^="pg-"]');
    var viewTop=contentEl.scrollTop+contentEl.clientHeight*0.3;
    var bestPg=0;
    paragraphs.forEach(function(p){
      var offset=p.offsetTop-inner.offsetTop;
      if(offset<=viewTop)bestPg=parseInt(p.id.replace('pg-',''),10);
    });
    if(bestPg>0)updateHash(readerCur,bestPg);
  },300);
});

init();
})();