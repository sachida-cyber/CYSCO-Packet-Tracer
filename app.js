// app.js — SACHIDAX Packet Tracer Learning Map
// Keep modular & commented. This version fetches data.json from same folder.

async function loadData(){
  try {
    const res = await fetch('data.json');
    if(!res.ok) throw new Error('data.json not found');
    return await res.json();
  } catch(e){
    console.warn('Failed to load data.json — falling back to inline sample', e);
    return SAMPLE_DATA;
  }
}

// Simple sample as fallback
const SAMPLE_DATA = {
  "title":"Packet Tracer Learning",
  "id":"root",
  "children":[
    {"id":"routing","title":"Routing","color":"#2b7bd3","children":[{"id":"static","title":"Static Routing","desc":"Configure static routes","time":"20m","difficulty":"Beginner"},{"id":"rip","title":"RIP","desc":"RIPv1/RIPv2 basics","time":"45m","difficulty":"Beginner"},{"id":"ospf","title":"OSPF","desc":"Area, LSAs","time":"90m","difficulty":"Intermediate"}]},
    {"id":"switching","title":"Switching","color":"#8a5bd3","children":[{"id":"vlans","title":"VLANs","desc":"Access/trunk/Native VLAN","time":"40m","difficulty":"Beginner"},{"id":"stp","title":"STP","desc":"Spanning Tree basics","time":"50m","difficulty":"Intermediate"}]},
    {"id":"security","title":"Security","color":"#f97316","children":[{"id":"acl","title":"ACLs","desc":"Standard & Extended ACLs","time":"30m","difficulty":"Beginner"},{"id":"nat","title":"NAT","desc":"PAT & Static NAT","time":"45m","difficulty":"Intermediate"}]},
    {"id":"wireless","title":"Wireless","color":"#10b981","children":[{"id":"ssid","title":"SSID & Auth","desc":"WPA2/WPA3 basics","time":"30m","difficulty":"Beginner"}]},
    {"id":"troubleshoot","title":"Troubleshooting","color":"#7c3aed","children":[{"id":"ping","title":"Ping & ICMP","desc":"Connectivity checks","time":"15m","difficulty":"Beginner"},{"id":"capture","title":"Packet Capture","desc":"Capture & analyze with Wireshark","time":"60m","difficulty":"Intermediate"}]}
  ]
};

(async function init(){
  const data = await loadData();

  // DOM refs
  const container = d3.select('#tree-wrap');
  const infoEl = document.getElementById('info');
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalClose = document.getElementById('modal-close');
  const exportBtn = document.getElementById('export-png');

  // view dims
  const width = Math.max(1000, container.node().clientWidth || 1200);
  const height = Math.max(700, container.node().clientHeight || 900);

  const svg = container.append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('width','100%').attr('height','100%');
  const g = svg.append('g').attr('transform','translate(60,40)');

  const root = d3.hierarchy(data);
  root.x0 = 0; root.y0 = 0;

  // collapse helper — start collapsed for deeper levels
  function collapse(d){ if(d.children){ d._children = d.children; d._children.forEach(collapse); d.children = null; } }
  if(root.children) root.children.forEach(collapse);

  const tree = d3.tree().nodeSize([110, 220]);

  function update(source){
    const treedata = tree(root);
    const nodes = treedata.descendants();
    const links = treedata.links();

    nodes.forEach(d => d.y = d.depth * 220);

    // nodes
    const node = g.selectAll('g.node').data(nodes, d=> (d.data.id || d.data.title) + '|' + d.depth);

    const nodeEnter = node.enter().append('g').attr('class','node')
      .attr('transform', d=>`translate(${source.y0||0},${source.x0||0})`)
      .style('cursor','pointer')
      .on('click', (event,d)=>{ toggle(d); update(d); showInfo(d); })
      .on('dblclick', (event,d)=> centerNode(d))
      .on('mouseover', (event,d)=> { d3.select(event.currentTarget).classed('node-hover', true); })
      .on('mouseout', (event,d)=> { d3.select(event.currentTarget).classed('node-hover', false); });

    nodeEnter.append('circle').attr('r',12).attr('fill', d => d.data.color || '#1f6feb').attr('stroke','#021428').attr('stroke-width',1.2);

    nodeEnter.append('text').attr('dy',4).attr('x',20).style('fill','#e6eef8').style('font-size','12px').text(d=>d.data.title).call(wrap,160);

    const nodeUpdate = nodeEnter.merge(node);
    nodeUpdate.transition().duration(300).attr('transform', d=>`translate(${d.y},${d.x})`);

    const nodeExit = node.exit().transition().duration(200).attr('transform', d=>`translate(${source.y||0},${source.x||0})`).remove();
    nodeExit.select('circle').attr('r',0);

    // links
    const link = g.selectAll('path.link').data(links, d => (d.target.data.id || d.target.data.title) + '|' + d.target.depth);
    const linkEnter = link.enter().insert('path','g').attr('class','link')
      .attr('d', d => diagonal({source:{x: source.x0||0, y: source.y0||0}, target:{x: source.x0||0, y: source.y0||0}}))
      .attr('fill','none').attr('stroke','#60a5fa').attr('stroke-width',1.4).attr('opacity',0.9);

    linkEnter.merge(link).transition().duration(300).attr('d', d=>diagonal(d));
    link.exit().transition().duration(200).attr('d', d=> diagonal({source:{x:source.x||0,y:source.y||0},target:{x:source.x||0,y:source.y||0}})).remove();

    nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });

    // update legend & progress
    renderLegend();
    renderProgress();
    saveState();
  }

  function diagonal(d){
    return `M ${d.source.y} ${d.source.x} C ${(d.source.y + d.target.y)/2} ${d.source.x}, ${(d.source.y + d.target.y)/2} ${d.target.x}, ${d.target.y} ${d.target.x}`;
  }

  function toggle(d){ if(d.children){ d._children = d.children; d.children = null; } else { d.children = d._children; d._children = null; } }

  function showInfo(d){
    modalTitle.textContent = d.data.title || d.data.name || 'Lesson';
    let html = `<div style="font-weight:700">${d.data.title || d.data.name}</div>`;
    if(d.data.desc) html += `<p>${d.data.desc}</p>`;
    if(d.data.time) html += `<p>Estimated time: <strong>${d.data.time}</strong></p>`;
    if(d.data.difficulty) html += `<p>Difficulty: ${d.data.difficulty}</p>`;
    if(d.data.prereq) html += `<p>Prerequisites: ${d.data.prereq}</p>`;
    html += `<p style="margin-top:12px"><button id="modal-open-lesson">Open Packet Tracer Lab</button></p>`;
    modalBody.innerHTML = html;
    modal.classList.remove('hidden');

    // attach mark complete action
    document.getElementById('modal-open-lesson').addEventListener('click', ()=> {
      alert('Open Packet Tracer lab — (in the real app: link to .pkt file or embedded viewer).');
    });
  }

  // text wrap helper for node labels
  function wrap(text, width) {
    text.each(function() {
      const textEl = d3.select(this);
      const words = textEl.text().split(/\s+/).reverse();
      let word;
      let line = [];
      let lineNumber = 0;
      const lineHeight = 1.1;
      const y = textEl.attr('y') || 0;
      const dy = parseFloat(textEl.attr('dy')) || 0;
      let tspan = textEl.text(null).append('tspan').attr('x',20).attr('y',y).attr('dy',dy + 'em');
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(' '));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(' '));
          line = [word];
          tspan = textEl.append('tspan').attr('x',20).attr('y',y).attr('dy',++lineNumber * lineHeight + dy + 'em').text(word);
        }
      }
    });
  }

  // zoom
  const zoom = d3.zoom().scaleExtent([0.35,2.6]).on('zoom', (e) => g.attr('transform', e.transform));
  svg.call(zoom);

  document.getElementById('zoom-in').addEventListener('click', ()=> svg.transition().call(zoom.scaleBy, 1.2));
  document.getElementById('zoom-out').addEventListener('click', ()=> svg.transition().call(zoom.scaleBy, 1/1.2));
  document.getElementById('fit').addEventListener('click', ()=> svg.transition().call(zoom.transform, d3.zoomIdentity));

  // center node into view
  function centerNode(d){
    const svgNode = svg.node();
    const transform = d3.zoomTransform(svgNode);
    const x = d.y, y = d.x;
    const cx = (svgNode.clientWidth/2 - transform.x)/transform.k;
    const cy = (svgNode.clientHeight/2 - transform.y)/transform.k;
    const dx = cx - x;
    const dy = cy - y;
    const newTransform = d3.zoomIdentity.translate(transform.x + dx*transform.k, transform.y + dy*transform.k).scale(transform.k);
    svg.transition().duration(600).call(zoom.transform, newTransform);
  }

  // expand/collapse all
  document.getElementById('expand-all').addEventListener('click', ()=> { expandAll(root); update(root); });
  document.getElementById('collapse-all').addEventListener('click', ()=> { if(root.children) root.children.forEach(collapse); update(root); });
  function expandAll(d){ if(d._children){ d.children = d._children; d._children = null; } if(d.children) d.children.forEach(expandAll); }

  // search -> center first match + open
  document.getElementById('search').addEventListener('input', function(){
    const q = this.value.trim().toLowerCase();
    if(!q) return;
    let found = null;
    root.each(d => { if(!found && (d.data.title || d.data.name || '').toLowerCase().includes(q)) found = d; });
    if(found){
      let p = found.parent;
      while(p){ p.children = p.children || p._children; p._children = null; p = p.parent; }
      update(root);
      centerNode(found);
      showInfo(found);
    }
  });

  // modal close
  modalClose.addEventListener('click', ()=> modal.classList.add('hidden'));
  window.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') modal.classList.add('hidden');
    if(e.key === 'Enter') {
      // future: open focused node
    }
  });

  // export PNG (requires html2canvas)
  exportBtn.addEventListener('click', async ()=> {
    if(window.html2canvas){
      try {
        const node = document.querySelector('#tree-wrap');
        const canvas = await html2canvas(node, {backgroundColor: null, scale: 2});
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sachidax-map.png';
        a.click();
      } catch(err){
        alert('Export failed: ' + err.message);
      }
    } else {
      alert('html2canvas not loaded — include html2canvas to enable export.');
    }
  });

  // basic legend render
  function renderLegend(){
    const legendEl = document.getElementById('legend');
    legendEl.innerHTML = '';
    const used = {};
    root.each(d => {
      if(d.data.color) used[d.data.title || d.data.id || 'group'] = d.data.color;
    });
    // fall back to parents
    root.children && root.children.forEach(p => {
      const div = document.createElement('div');
      div.style.display = 'inline-block';
      div.style.padding = '6px 8px';
      div.style.marginRight = '6px';
      div.style.borderRadius = '999px';
      div.style.background = 'rgba(255,255,255,0.03)';
      div.style.fontSize = '12px';
      div.textContent = p.data.title;
      if(p.data.color) div.style.borderLeft = `8px solid ${p.data.color}`;
      legendEl.appendChild(div);
    });
  }

  // progress (simple count of nodes marked completed in localStorage)
  function renderProgress(){
    const completed = JSON.parse(localStorage.getItem('sachidax_completed') || '[]');
    const total = root.descendants().filter(n => !n.children || n.children.length === 0).length;
    const done = completed.length;
    const percent = total ? Math.round(done/total*100) : 0;
    document.getElementById('overall-progress').textContent = percent + '%';
  }

  // simple state persistence hook (placeholder)
  function saveState(){
    // TODO: persist expanded node ids and zoom transform
  }

  // initial render
  update(root);

  // responsive: update viewBox when resized
  window.addEventListener('resize', ()=> {
    const w = Math.max(1000, container.node().clientWidth || 1200);
    const h = Math.max(700, container.node().clientHeight || 900);
    svg.attr('viewBox', `0 0 ${w} ${h}`);
  });

})();
