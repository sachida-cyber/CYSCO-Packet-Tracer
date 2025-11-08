/*


// UI elements
const searchInput = document.getElementById('search');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalTime = document.getElementById('modal-time');
const modalDiff = document.getElementById('modal-diff');
const startBtn = document.getElementById('start-lesson');
const markCompleteBtn = document.getElementById('mark-complete');
const modalClose = document.getElementById('modal-close');


let selectedNode = null;


function render(){
SVG.selectAll('*').remove();
const nodes = root.descendants().filter(d=>d.depth>0);


const g = SVG.append('g').attr('class','nodes').attr('transform', currentTransform);


const cell = g.selectAll('g.node').data(nodes, d=>d.data.id || d.data.title)
.join('g')
.attr('class','node')
.attr('transform', d=>`translate(${d.x0},${d.y0})`)
.on('click', (event,d)=>{ event.stopPropagation(); toggle(d); openModal(d); })
.on('dblclick', (event,d)=>{ zoomToNode(d); })
.attr('tabindex',0)
.on('keydown', (event,d)=>{ if(event.key==='Enter') { toggle(d); openModal(d);} });


cell.append('rect')
.attr('class','node-rect')
.attr('width', d=>Math.max(1, d.x1-d.x0))
.attr('height', d=>Math.max(1, d.y1-d.y0))
.attr('rx',8)
.attr('fill', d=> d.children ? colorFor(d.data.id) : colorFor(d.parent?.data?.id))
.style('filter','drop-shadow(0 6px 10px rgba(2,6,23,0.6))');


cell.append('text')
.attr('class','node-label')
.attr('x',8).attr('y',18)
.text(d=>d.data.title || d.data.name)
.each(function(d){
const rectW = d.x1-d.x0 - 12;
let text = d3.select(this).text();
if(text.length*7 > rectW){ d3.select(this).text(text.slice(0, Math.floor(rectW/7)-1)+'…'); }
});


// badges
cell.append('foreignObject')
.attr('x', d=>Math.max(4, d.x1-d.x0 - 62))
.attr('y', 6)
.attr('width',60).attr('height',22)
.append('xhtml:div')
.attr('class','badge')
.html(d=>`<div style="font-size:11px">${d.data.progress||0}%</div>`);


// tooltip
cell.append('title').text(d=>d.data.desc || d.data.title || '');


updateBreadcrumb();
renderLegend();
}


function toggle(d){
if(d.children){
d._children = d.children;
d.children = null;
} else if(d._children){
d.children = d._children;
d._children = null;
}
// recompute layout
treemapLayout(root);
saveState();
render();
}


function openModal(d){
selectedNode = d;
modalTitle.textContent = d.data.title || d.data.name;
modalDesc.textContent = d.data.desc || 'No description available.';
modalTime.textContent = d.data.time || '—';
modalDiff.textContent = d.data.difficulty || '—';
modal.setAttribute('aria-hidden','false');
}


modalClose.addEventListener('click', ()=>{ modal.setAttribute('aria-hidden','true'); });
window.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ modal.setAttribute('aria-hidden','true'); }});


markCompleteBtn.addEventListener('click', ()=>{
if(!selectedNode) return;
