(function(){
  const TOTAL_ENDOWMENT = 53.2e9;
  const DEFAULTS = { unresPct: 20, payoutPct: 5.5, returnPct: 7, inflPct: 3 };

  // Pots for Treemap 1 (illustrative shares). Edit to match report.
  const POTS = [
    { name: "Financial Aid & Fellowships", share: 25, desc: "Scholarships for undergrads and graduate fellowships." },
    { name: "Professorships & Faculty Support", share: 30, desc: "Faculty salaries, chaired professorships, academic programs." },
    { name: "Research (restricted)", share: 15, desc: "Donor-restricted research funds in specific fields." },
    { name: "Buildings, Libraries & Museums", share: 10, desc: "Facilities operations, renewals, preservation." },
    { name: "Academic Programs & Initiatives", share: 12, desc: "Centers, institutes, and programmatic funds." },
    { name: "Other Restricted", share: 8, desc: "Student life, community programs, and small-purpose funds." }
  ];

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  function bindSlider(id, labelId, fmt = (v)=>v){
    const inp = $(id), lbl = $(labelId);
    const set = ()=> lbl.textContent = fmt(inp.value);
    inp.addEventListener('input', set); set();
  }

  // slider labels
  bindSlider('#rngHouse','#lblHouse',v=>(+v).toFixed(0));
  bindSlider('#rngLabSF','#lblLabSF',v=>(+v).toFixed(0));
  bindSlider('#rngBeds','#lblBeds',v=>(+v).toFixed(0));
  bindSlider('#rngLibrary','#lblLibrary',v=>(+v).toFixed(0));
  bindSlider('#rngPhD','#lblPhD',v=>(+v).toFixed(0));
  bindSlider('#rngAid','#lblAid',v=>(+v).toFixed(0));
  bindSlider('#rngCyber','#lblCyber',v=>(+v).toFixed(0));
  bindSlider('#rngDecarbOps','#lblDecarbOps',v=>(+v).toFixed(0));
  bindSlider('#rngFacilities','#lblFacilities',v=>(+v).toFixed(0));

  const tip = d3.select('body').append('div').attr('class','tooltip').style('opacity',0);

  function assumptions(){
    return {
      payoutPct: +$('#inpPayout').value || DEFAULTS.payoutPct,
      returnPct: +$('#inpReturn').value || DEFAULTS.returnPct,
      inflPct:   +$('#inpInfl').value   || DEFAULTS.inflPct,
      unresPct:  +$('#inpUnres').value  || DEFAULTS.unresPct
    };
  }

  function selections(){
    const treasuryOneTime = $('#chkTreasury').checked;
    const fedOneTime      = $('#chkFedOneTime').checked;
    const fedPermanent    = $('#chkFedPermanent').checked;
    const useFedOneTime   = fedOneTime && !fedPermanent;

    const houseOn = $('#chkHouse').checked, houseM = +$('#rngHouse').value * 1e6;
    const labsOn  = $('#chkLabs').checked, labSFk = +$('#rngLabSF').value, labCost = labSFk*1000*1200;
    const grfOn   = $('#chkGRF').checked,  grfCost = 37e6;
    const ghOn    = $('#chkGradHousing').checked, beds = +$('#rngBeds').value, perBed=221000, ghCost=beds*perBed;
    const libOn   = $('#chkLibrary').checked, libM = +$('#rngLibrary').value*1e6;

    const phdOn   = $('#chkPhD').checked, phdInc = +$('#rngPhD').value, phdCount=4160, phdCost = phdInc*phdCount;
    const aidOn   = $('#chkAid').checked, aidPct = +$('#rngAid').value, aidBase=275e6, aidCost=aidBase*(aidPct/100);
    const cyberOn = $('#chkCyber').checked, cyberM = +$('#rngCyber').value*1e6;
    const decopsOn= $('#chkDecarbOps').checked, decopsM = +$('#rngDecarbOps').value*1e6;
    const facOn   = $('#chkFacilities').checked, facM = +$('#rngFacilities').value*1e6;

    return {
      policy: { treasuryOneTime, useFedOneTime, fedPermanent },
      oneTime: [
        houseOn ? {name:'House Renewal phase', amount:houseM}:null,
        labsOn  ? {name:`Modernize wet-labs (${labSFk}k SF)`, amount:labCost}:null,
        grfOn   ? {name:'Decarbonization fund top-up (GRF)', amount:grfCost}:null,
        ghOn    ? {name:`Graduate housing (+${beds} beds)`, amount:ghCost}:null,
        libOn   ? {name:'Library renovation (phase)', amount:libM}:null,
        treasuryOneTime ? {name:'One-time $500M Treasury payment', amount:500e6}:null,
        useFedOneTime ? {name:'One-time backfill federal research', amount:684e6}:null
      ].filter(Boolean),
      recurring: [
        phdOn   ? {name:`Raise all PhD stipends (+$${phdInc.toLocaleString()}/student)`, amount:phdCost}:null,
        aidOn   ? {name:`Increase undergrad financial aid (+${aidPct}%)`, amount:aidCost}:null,
        cyberOn ? {name:'Cybersecurity hardening & insurance', amount:cyberM}:null,
        decopsOn? {name:'Decarbonization operations', amount:decopsM}:null,
        facOn   ? {name:'Facilities renewal / deferred maintenance', amount:facM}:null
      ].filter(Boolean)
    };
  }

  function compute(){
    const { payoutPct, returnPct, inflPct, unresPct } = assumptions();
    const sel = selections();

    const U0 = TOTAL_ENDOWMENT * (unresPct/100);
    const payout = U0 * (payoutPct/100);

    const oneTimeSum   = sel.oneTime.reduce((s,x)=>s+x.amount,0);
    const recurringSum = sel.recurring.reduce((s,x)=>s+x.amount,0);
    const permFedY1    = sel.policy.fedPermanent ? 684e6 : 0;

    const plannedThisYear = oneTimeSum + recurringSum + permFedY1;
    const over = Math.max(0, plannedThisYear - payout);

    const r = returnPct/100;
    const U1 = Math.max(0, U0 + r*U0 - over);

    // Ten-year loop
    let U = U0, cumulativeDraw = 0;
    let permFed = permFedY1;
    const infl = 1 + inflPct/100;

    for (let year=1; year<=10; year++){
      const Pt = U * (payoutPct/100);
      const annualRecurring = recurringSum + (sel.policy.fedPermanent ? permFed : 0);
      const need = annualRecurring + (year===1 ? oneTimeSum : 0);
      const draw = Math.max(0, need - Pt);
      cumulativeDraw += draw;
      U = Math.max(0, U + r*U - draw);
      if (sel.policy.fedPermanent) permFed *= infl;
    }

    return { U0, payout, plannedThisYear, over, U1, U10: U, cumulativeDraw, components: {oneTime:sel.oneTime, recurring:sel.recurring, permFedY1} };
  }

  // --- Rendering ---
  const stockSVG = d3.select('#stock-treemap').append('svg')
    .attr('width','100%').attr('height','100%').attr('viewBox','0 0 600 360');

  function renderStock(){
    stockSVG.selectAll('*').remove();
    const A = assumptions();
    const data = POTS.map(d=>({name:d.name, value:d.share, desc:d.desc}));
    const root = d3.treemap().size([600,360]).padding(4)(d3.hierarchy({children:data}).sum(d=>d.value));

    const g = stockSVG.append('g');
    const nodes = g.selectAll('g.node').data(root.leaves()).enter().append('g').attr('class','node')
      .attr('transform',d=>`translate(${d.x0},${d.y0})`);

    nodes.append('rect')
      .attr('width',d=>d.x1-d.x0).attr('height',d=>d.y1-d.y0)
      .attr('fill','#1e293b').attr('rx',8).attr('ry',8);

    nodes.append('text').attr('x',6).attr('y',16).attr('class','label')
      .text(d=>d.data.name);

    const tip = d3.select('.tooltip');
    nodes.on('mousemove', (event,d)=>{
      tip.style('opacity',1)
        .style('left',(event.pageX+12)+'px')
        .style('top',(event.pageY+12)+'px')
        .html(`<strong>${d.data.name}</strong><br/>${d.data.desc}`);
    }).on('mouseout', ()=> tip.style('opacity',0));

    const unresW = 600 * (A.unresPct/100);
    stockSVG.append('rect')
      .attr('x', 600 - unresW).attr('y', 0).attr('width', unresW).attr('height', 360)
      .attr('fill','none').attr('stroke','#3b82f6').attr('stroke-width',3).attr('stroke-dasharray','6 4');
    stockSVG.append('text').attr('x', 600 - unresW + 8).attr('y', 20).attr('class','label')
      .text(`Unrestricted ≈ ${A.unresPct}%`);
  }

  const flowSVG = d3.select('#flow-treemap').append('svg')
    .attr('width','100%').attr('height','100%').attr('viewBox','0 0 800 560');

  const defs = flowSVG.append('defs');
  const pattern = defs.append('pattern')
    .attr('id','diagonalHatch').attr('patternUnits','userSpaceOnUse')
    .attr('width',6).attr('height',6).attr('patternTransform','rotate(45)');
  pattern.append('rect').attr('width',6).attr('height',6).attr('fill','#f87171');
  pattern.append('line').attr('x1',0).attr('y1',0).attr('x2',0).attr('y2',6)
    .attr('stroke','#0b142a').attr('stroke-width',2);

  function renderFlow(){
    flowSVG.selectAll('*:not(defs)').remove();
    const res = compute();
    $('#lblPayout').textContent = d3.format('$,.0f')(res.payout);
    $('#lblNeeds').textContent = d3.format('$,.0f')(res.plannedThisYear);

    const over = res.over;
    const lblOver = $('#lblOver');
    if (over > 0){
      lblOver.innerHTML = `&nbsp;|&nbsp;<span class="warning">Over by ${d3.format('$,.0f')(over)} (principal draw)</span>`;
    } else {
      lblOver.innerHTML = `&nbsp;|&nbsp;Uncommitted this year: ${d3.format('$,.0f')(res.payout - res.plannedThisYear)}`;
    }

    const items = [];
    res.components.oneTime.forEach(o=> items.push({name:o.name, value:o.amount, type:'one'}));
    res.components.recurring.forEach(o=> items.push({name:o.name, value:o.amount, type:'rec'}));
    if (res.components.permFedY1>0) items.push({name:'Permanent backfill (Year 1 slice)', value:res.components.permFedY1, type:'rec'});

    const width = 800, height = 560;
    const totalPlanned = items.reduce((s,it)=> s+it.value, 0);
    const x = d3.scaleLinear().domain([0, Math.max(res.payout, totalPlanned, res.payout+res.over)]).range([0, width]);

    let x0 = 0;
    const colorOne = '#f59e0b', colorRec = '#ef4444';
    const g = flowSVG.append('g');

    items.forEach(it=>{
      const w = x(it.value);
      g.append('rect').attr('x', x0).attr('y', 0).attr('width', w).attr('height', height)
        .attr('fill', it.type==='one'? colorOne : colorRec).attr('opacity', 0.9);
      g.append('text').attr('x', x0 + Math.max(40,w/2)).attr('y', 28).attr('text-anchor','middle')
        .attr('class','label').text(it.name + ' — ' + d3.format('$,.0f')(it.value));
      x0 += w;
    });

    if (over > 0){
      const overW = x(over);
      g.append('rect').attr('x', x(res.payout)).attr('y', 0).attr('width', overW).attr('height', height)
        .attr('class','hatched');
      g.append('text').attr('x', x(res.payout) + overW/2).attr('y', height/2).attr('text-anchor','middle')
        .attr('class','label').text('Over by ' + d3.format('$,.0f')(over) + ' (draws principal)');
    } else {
      const slackW = x(res.payout - totalPlanned);
      g.append('rect').attr('x', x(totalPlanned)).attr('y', 0).attr('width', slackW).attr('height', height)
        .attr('fill','#0ea5e9').attr('opacity',0.6);
      g.append('text').attr('x', x(totalPlanned) + slackW/2).attr('y', height/2).attr('text-anchor','middle')
        .attr('class','label').text('Uncommitted ' + d3.format('$,.0f')(res.payout - totalPlanned));
    }

    renderDonuts(res);
  }

  function renderDonuts(res){
    const drawDonut = (svgSel, centerSel, start, end, note) => {
      const svg = d3.select(svgSel); svg.selectAll('*').remove();
      const w = +svg.attr('width'), h = +svg.attr('height');
      const rOuter = Math.min(w,h)/2 - 8, rInner = rOuter - 22;
      const g = svg.append('g').attr('transform', `translate(${w/2},${h/2})`);
      const arc = d3.arc().innerRadius(rInner).outerRadius(rOuter);
      const pct = start>0 ? Math.max(0, Math.min(1, end/start)) : 0;
      const data = [{name:'Remaining', value:pct}, {name:'Lost', value:1-pct}];
      const pie = d3.pie().sort(null).value(d => d.value);
      g.selectAll('path').data(pie(data)).enter().append('path')
        .attr('d', arc).attr('fill',(d,i)=> i===0 ? '#3b82f6' : '#334155');

      const div = $(centerSel);
      const delta = end - start;
      div.innerHTML = `<div><strong>${d3.format('$,.0f')(end)}</strong></div>
                       <div class="muted">${delta>=0?'+':''}${d3.format('$.2s')(delta).replace('G','B')} vs start</div>
                       <div class="muted">${note||''}</div>`;
    };

    drawDonut('#donut1', '#donut1-metrics', res.U0, res.U1, `1-yr principal draw: ${d3.format('$,.0f')(res.over)}`);
    drawDonut('#donut10', '#donut10-metrics', res.U0, res.U10, `10-yr cumulative draw: ${d3.format('$,.0f')(res.cumulativeDraw)}`);
  }

  $$('#chkTreasury, #chkFedOneTime, #chkFedPermanent, #chkHouse, #rngHouse, #chkLabs, #rngLabSF, #chkGRF, #chkGradHousing, #rngBeds, #chkLibrary, #rngLibrary, #chkPhD, #rngPhD, #chkAid, #rngAid, #chkCyber, #rngCyber, #chkDecarbOps, #rngDecarbOps, #chkFacilities, #rngFacilities, #inpPayout, #inpReturn, #inpInfl, #inpUnres')
    .forEach(el => el.addEventListener('input', ()=> { renderStock(); renderFlow(); }));

  renderStock(); renderFlow();
})();