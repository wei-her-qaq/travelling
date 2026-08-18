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

// ===== Concentric SVG Wheel =====
(function(){
  var SVG_NS='http://www.w3.org/2000/svg';
  var stage=document.getElementById('wheelStage');
  if(!stage)return;
  var svg=document.getElementById('wheelSvg');
  var defs=document.getElementById('wheelDefs');
  var rotateG=document.getElementById('wheelRotate');
  var bg=document.getElementById('wheelBg');
  var panel=document.getElementById('wheelInfoPanel');

  // Character data
  var CHARS=[
    {name:'伊蕾娜',title:'灰之魔女',img:'images/characters/elaina.jpg',detail:'银发琉璃色瞳孔的年轻魔女，15岁通过魔法师考试成为「史上最年轻的魔女」。怀揣儿时读过的《妮可冒险记》踏上旅途，以旁观者视角记录各国悲欢。自信而略带自恋。\n\n声优：本渡枫（日） / Megan Shipman（英）\n登场：全卷\nMAL: 151335'},
    {name:'维多利加',title:'妮可 · 执笔者',img:'images/characters/victorica.jpg',detail:'本名 Victorica，取自罗马神话胜利女神 Victoria。笔名妮可（Nike）取自希腊神话同名女神。\n她是伊蕾娜的母亲，也是芙兰与席拉的师傅——写下启发伊蕾娜成为魔女的《妮可冒险记》的人。\n\n声优：井上静（日） / Morgan Garrett（英）\n登场：Vol 1,9,10,15,17,19\nMAL: 190223'},
    {name:'芙兰',title:'星尘之魔女',img:'images/characters/flan.jpg',detail:'伊蕾娜的师傅，维多利加的弟子。银发紫眸，性格随性慵懒但魔法实力深不可测。Vol 9-10「星灰魔女的师徒之旅」是全系列最受瞩目的篇章。\n\n声优：花泽香菜（日）\n登场：Vol 1,2,3,5,8,9,10,14,15,16\nMAL: 174808'},
    {name:'沙耶',title:'炭之魔女',img:'images/characters/saya.jpg',detail:'黑发红瞳的东方少女，来自东洋之国。在魔法师之国与伊蕾娜相遇后产生强烈仰慕，后师从芙兰成为魔女。Vol 15 短篇集中出场最多。\n\n声优：黒沢ともよ（日） / Dani Chambers（英）\n登场：Vol 1,2,3,4,5,8,9,10,15,16\nMAL: 174809'},
    {name:'席拉',title:'暗夜之魔女',img:'images/characters/sheila.jpg',detail:'魔女协会成员，芙兰的旧识，维多利加的另一名弟子。性格冷静沉着，暗系魔法造诣极高。Vol 3「回溯过去的薰衣魔女」中首次登场，与艾丝黛尔有故事线交集。\n\n声优：日笠阳子（日）\n登场：Vol 3,5,8,9,15\nMAL: 184105'},
    {name:'艾姆妮西亚',title:'失忆少女',img:'images/characters/amnesia-01.jpg',detail:'白发少女，每当入睡就失去所有记忆——只靠一本日记维系与过去的联系。Vol 4 的全卷核心角色，单卷被提及 185 次，全系列单卷记录。\n\n登场：Vol 4,5,8,10,15,17\nMAL: 204725'},
    {name:'艾丝黛尔',title:'薰衣魔女',img:'images/characters/estelle-01.jpg',detail:'拥有回溯时间能力的魔法师。为追溯过去的真相踏上追凶之路，却发现自己也是悲剧的推手。Vol 3 核心角色。\n\n登场：Vol 3\nMAL: 189283'},
    {name:'米娜',title:'跨卷旅人',img:'images/characters/mina-01.jpg',detail:'在 Vol 1 魔法师之国登场（56 次提及），Vol 12 再次出现——全系列中跨越多卷反复登场的少数角色之一。\n\n登场：Vol 1,12\nMAL: 189253'},
    {name:'艾莉亚',title:'竞赛之城的少女',img:'images/characters/mirarose-01.jpg',detail:'伊蕾娜回到故乡竞赛之城时遇见的少女——以她为中心的「艾莉亚德妮的七天」是 Vol 6 最受瞩目的篇章。\n\n登场：Vol 6\nMAL: 189019'},
    {name:'师徒四人',title:'Vol 9 群像',img:'images/characters/monica-01.jpg',detail:'Vol 9「星与灰的师徒之旅」四人组：\n· 卡莲（Kallen）—— 静寂之国唯一的魔法师\n· 丽兹莱特（Lizwright）—— 灰姑娘式人物\n· 莫妮卡（Monica）—— 魔法统合协会代理人\n· 普莉希拉（Priscilla）—— 雪国少女魔法师\n\n登场：Vol 9'},
    {name:'莉莉缇娅',title:'碎石魔女',img:'images/characters/lilitia-01.jpg',detail:'出身和平国罗贝塔的魔女，认识伊蕾娜。Vol 13 的核心角色，以碎石魔法著称。\n\n登场：Vol 13'},
    {name:'露诺瓦',title:'旅馆店主',img:'images/characters/lunova-01.jpg',detail:'巨龙的背上经营一家移动旅馆的女店主。带着乐观与机智的口头禅：「交给我吧。我有个好主意。」\n\n登场：Vol 13'},
    {name:'莉塔',title:'旅行杀人鬼',img:'images/characters/rita-01.jpg',detail:'外表普通的女孩——被称作「旅行的杀人鬼」。在咖啡店与伊蕾娜搭话时讲述自己的故事，恐怖与日常的反差令人印象深刻。\n\n登场：Vol 16'}
  ];

  var N=CHARS.length;
  var RO_OUTER=100;  // outer radius
  var RO_INNER=45;   // inner radius of ring
  var SECTOR_ANGLE=360/N; // 27.69° per sector
  var VISIBLE=2;     // show focused ±2 sectors (max 4-5 visible)
  var current=0;     // current focused index
  var currentRot=0;  // current rotation in degrees
  var animating=false;

  // ---- Build SVG sectors ----
  var sectorGroups=[];

  // Preload patterns for image fills
  CHARS.forEach(function(ch,i){
    var pat=document.createElementNS(SVG_NS,'pattern');
    pat.setAttribute('id','imgpat'+i);
    pat.setAttribute('patternUnits','objectBoundingBox');
    pat.setAttribute('width',1);
    pat.setAttribute('height',1);
    var img=document.createElementNS(SVG_NS,'image');
    img.setAttribute('href',ch.img);
    img.setAttribute('x',0);
    img.setAttribute('y',0);
    img.setAttribute('width',1);
    img.setAttribute('height',1);
    img.setAttribute('preserveAspectRatio','xMidYMid slice');
    pat.appendChild(img);
    defs.appendChild(pat);
  });

  // Generate sector paths
  function sectorPath(i,rInner,rOuter){
    var a0=(i*SECTOR_ANGLE-SECTOR_ANGLE/2)*Math.PI/180;
    var a1=(i*SECTOR_ANGLE+SECTOR_ANGLE/2)*Math.PI/180;
    var x0i=rInner*Math.cos(a0),y0i=rInner*Math.sin(a0);
    var x0o=rOuter*Math.cos(a0),y0o=rOuter*Math.sin(a0);
    var x1o=rOuter*Math.cos(a1),y1o=rOuter*Math.sin(a1);
    var x1i=rInner*Math.cos(a1),y1i=rInner*Math.sin(a1);
    // Ring sector (donut slice)
    return 'M '+x0i+' '+y0i+' L '+x0o+' '+y0o+
           ' A '+rOuter+' '+rOuter+' 0 0 1 '+x1o+' '+y1o+
           ' L '+x1i+' '+y1i+
           ' A '+rInner+' '+rInner+' 0 0 0 '+x0i+' '+y0i+' Z';
  }

  function innerSectorPath(i,rInner){
    var a0=(i*SECTOR_ANGLE-SECTOR_ANGLE/2)*Math.PI/180;
    var a1=(i*SECTOR_ANGLE+SECTOR_ANGLE/2)*Math.PI/180;
    var x0=rInner*Math.cos(a0),y0=rInner*Math.sin(a0);
    var x1=rInner*Math.cos(a1),y1=rInner*Math.sin(a1);
    return 'M 0 0 L '+x0+' '+y0+' A '+rInner+' '+rInner+' 0 0 1 '+x1+' '+y1+' Z';
  }

  CHARS.forEach(function(ch,i){
    var g=document.createElementNS(SVG_NS,'g');
    g.setAttribute('class','wheel-sector-group hidden');
    g.setAttribute('data-i',i);

    // Ring (outer donut) — filled with character image pattern
    var ringPath=document.createElementNS(SVG_NS,'path');
    ringPath.setAttribute('class','wheel-sector-ring');
    ringPath.setAttribute('d',sectorPath(i,RO_INNER,RO_OUTER));
    ringPath.setAttribute('fill','url(#imgpat'+i+')');
    g.appendChild(ringPath);

    // Inner circle sector — dark fill for text
    var innerPath=document.createElementNS(SVG_NS,'path');
    innerPath.setAttribute('class','wheel-sector-inner');
    innerPath.setAttribute('d',innerSectorPath(i,RO_INNER));
    g.appendChild(innerPath);

    // Label — character name at mid-angle, mid-radius
    var midA=(i*SECTOR_ANGLE)*Math.PI/180;
    var midR=RO_INNER*0.62;
    var label=document.createElementNS(SVG_NS,'text');
    label.setAttribute('class','wheel-sector-label');
    label.setAttribute('x',midR*Math.cos(midA));
    label.setAttribute('y',midR*Math.sin(midA));
    label.textContent=ch.name;
    g.appendChild(label);

    // Click handler
    g.addEventListener('click',function(){snapTo(i)});

    rotateG.appendChild(g);
    sectorGroups.push(g);
  });

  // ---- Wheel rotation & visibility ----
  function update(){
    // Rotate so that current sector points to top (12 o'clock)
    var targetRot=-(current*SECTOR_ANGLE);
    rotateG.setAttribute('transform','rotate('+targetRot+')');

    // Show only ±VISIBLE sectors
    for(var i=0;i<N;i++){
      var rel=i-current;
      if(rel>N/2)rel-=N;
      if(rel<-N/2)rel+=N;
      var abs=Math.abs(rel);
      var g=sectorGroups[i];
      if(abs<=VISIBLE){
        g.classList.remove('hidden');
        g.classList.add('visible');
        g.classList.toggle('focused',abs===0);
        // Scale focused sector
        var scale=abs===0?1.08:1.0;
        g.style.transform='scale('+scale+')';
        g.style.transformOrigin='center';
        g.style.opacity=abs===0?1:abs===1?0.7:0.4;
      }else{
        g.classList.remove('visible','focused');
        g.classList.add('hidden');
        g.style.opacity=0;
      }
    }

    // Background image
    bg.style.backgroundImage='url('+CHARS[current].img+')';
    bg.classList.add('visible');
  }

  function updatePanel(){
    var ch=CHARS[current];
    document.getElementById('infoPortrait').style.backgroundImage='url('+ch.img+')';
    document.getElementById('infoName').textContent=ch.name;
    document.getElementById('infoTitle').textContent=ch.title;
    document.getElementById('infoContent').textContent=ch.detail;
    var toggle=document.getElementById('infoToggle');
    toggle.setAttribute('aria-expanded','false');
    document.getElementById('infoBody').style.maxHeight='0';
  }

  function snapTo(idx){
    if(animating)return;
    var diff=idx-current;
    if(diff>N/2)diff-=N;
    if(diff<-N/2)diff+=N;
    if(diff===0)return;
    animating=true;
    var start=current;
    var startTime=null;
    var duration=450;

    function anim(ts){
      if(!startTime)startTime=ts;
      var p=Math.min((ts-startTime)/duration,1);
      var eased=1-Math.pow(1-p,3);
      current=start+diff*eased;
      // Update rotation
      var targetRot=-(current*SECTOR_ANGLE);
      rotateG.setAttribute('transform','rotate('+targetRot+')');
      // Update visibility during animation
      var curIdx=Math.round(current)%N;
      if(curIdx<0)curIdx+=N;
      for(var i=0;i<N;i++){
        var rel=i-curIdx;
        if(rel>N/2)rel-=N;
        if(rel<-N/2)rel+=N;
        var abs=Math.abs(rel);
        var g=sectorGroups[i];
        if(abs<=VISIBLE){
          g.classList.remove('hidden');
          g.classList.add('visible');
          g.classList.toggle('focused',abs===0);
          g.style.opacity=abs===0?1:abs===1?0.7:0.4;
        }else{
          g.classList.remove('visible','focused');
          g.classList.add('hidden');
          g.style.opacity=0;
        }
      }
      if(p<1){
        requestAnimationFrame(anim);
      }else{
        current=((Math.round(current)%N)+N)%N;
        animating=false;
        update();
        updatePanel();
      }
    }
    requestAnimationFrame(anim);
  }

  function rotateBy(dir){
    snapTo(current+dir);
  }

  // ---- Controls ----
  var wheelTimer=null;
  stage.addEventListener('wheel',function(e){
    e.preventDefault();
    if(animating||wheelTimer)return;
    rotateBy(e.deltaY>0?1:-1);
    wheelTimer=setTimeout(function(){wheelTimer=null},300);
  },{passive:false});

  // Keyboard
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowLeft')rotateBy(-1);
    if(e.key==='ArrowRight')rotateBy(1);
  });

  // Touch — rotate based on horizontal swipe
  var touchX=null;
  stage.addEventListener('touchstart',function(e){touchX=e.touches[0].clientX},{passive:true});
  stage.addEventListener('touchmove',function(e){
    if(touchX===null)return;
    var dx=e.touches[0].clientX-touchX;
    if(Math.abs(dx)>40&&!animating){
      rotateBy(dx>0?-1:1);
      touchX=e.touches[0].clientX;
    }
  },{passive:true});
  stage.addEventListener('touchend',function(){touchX=null},{passive:true});

  // Toggle detail
  document.getElementById('infoToggle').addEventListener('click',function(){
    var t=this;
    var expanded=t.getAttribute('aria-expanded')==='true';
    if(expanded){
      t.setAttribute('aria-expanded','false');
      document.getElementById('infoBody').style.maxHeight='0';
    }else{
      t.setAttribute('aria-expanded','true');
      document.getElementById('infoBody').style.maxHeight='500px';
    }
  });

  // Init
  update();
  updatePanel();
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