// Make errors visible (don’t hide them in catches)
(function(){
  function $(s){ return document.querySelector(s); }
  function $all(s){ return Array.prototype.slice.call(document.querySelectorAll(s)||[]); }
  function money(v){ return "$" + Math.round(+v||0).toLocaleString(); }
  function delta(v){
    const sign = v<0?"-":v>0?"+":"";
    const n = Math.abs(v);
    const u = n>=1e12?["T",1e12]:n>=1e9?["B",1e9]:n>=1e6?["M",1e6]:n>=1e3?["k",1e3]:["",1];
    return sign + "$" + (n/u[1]).toFixed(2).replace(/\.00$/,"") + u[0];
  }

  // If D3 failed to load, say so and stop early.
  if (typeof d3 === "undefined"){
    const host = $('#stock-treemap');
    if (host){
      host.innerHTML = '<div style="padding:10px;background:#2b2b2b;color:#fff;border-radius:8px;border:1px solid #444">'
                     + 'ERROR: D3 failed to load. Check your network or CDN. </div>';
    }
    window.__VIZ_OK__ = false;
    return;
  }

  // --------- constants ----------
  const TOTAL_ENDOWMENT = 53.2e9;
  const UNRESTRICTED_PCT = 30;
  const DEFAULTS = { payoutPct:5.5, returnPct:7, inflPct:3, committedPct:90, taxPct:8 };

  const POTS = [
    { key:"unr",  name:"Unrestricted",                  share:30, desc:"Donor-unrestricted endowment." },
    { key:"con",  name:"Construction",                  share:1,  desc:"Capital construction funds." },
    { key:"fac",  name:"Faculty & Teaching",            share:3,  desc:"Instructional support and teaching." },
    { key:"lib",  name:"Library & Museums",             share:3,  desc:"Libraries, museums, preservation." },
    { key:"oth",  name:"Other",                         share:8,  desc:"Other restricted purposes." },
    { key:"prof", name:"Professorships",                share:24, desc:"Endowed professorships and chairs." },
    { key:"prog", name:"Program Support",               share:5,  desc:"Centers, initiatives, programmatic funds." },
    { key:"res",  name:"Research",                      share:6,  desc:"Restricted research support." },
    { key:"sch",  name:"Scholarship & Student Support", share:20, desc:"Financial aid & student support." }
  ];

  const IMPACT_WEIGHTS = [
    { name:"Libraries & Museums",     w:0.20 },
    { name:"Student services",        w:0.30 },
    { name:"Academic programs",       w:0.20 },
    { name:"Facilities & operations", w:0.20 },
    { name:"Other central support",   w:0.10 }
  ];

  // --------- initialization heartbeat ---------
  (function heartbeat(){
    const box = d3.select('#stock-treemap');
    if (!box.empty()){
      box.append('div')
        .attr('id','viz-heartbeat')
        .style('position','absolute')
        .style('top','8px')
        .style('left','8px')
        .style('background','#111827')
        .style('border','1px solid #374151')
        .style('color','#e5e7eb')
        .style('border-radius','6px')
        .style('padding','4px 6px')
        .style('font','12px system-ui')
        .style('opacity','0.9')
        .text('viz js running…');
      setTimeout(()=> d3.select('#viz-heartbeat').remove(), 1500);
    }
  })();

  // --------- inputs ----------
  function nval(sel, def){ const el=$(sel); const v=el?+el.value:NaN; return isFinite(v)?v:def; }
  function bval(sel){ const el=$(sel); return !!(el && el.checked); }

  function assumptions(){
    return {
      payoutPct:    nval('#inpPayout',    DEFAULTS.payoutPct),
      returnPct:    nval('#inpReturn',    DEFAULTS.returnPct),
      inflPct:      nval('#inpInfl',      DEFAULTS.inflPct),
      committedPct: nval('#inpCommitted', DEFAULTS.committedPct),
      taxPct:       nval('#inpTax',       DEFAULTS.taxPct),
      unresPct:     UNRESTRICTED_PCT
    };
  }

  function selections(){
    const treasuryOneTime = bval('#chkTreasury');
    const fedOneTime      = bval('#chkFedOneTime');
    const fedPermanent    = bval('#chkFedPermanent');
    const useFedOneTime   = fedOneTime && !fedPermanent;

    const houseOn = bval('#chkHouse'),     houseM = nval('#rngHouse',400)*1e6;
    const labsOn  = bval('#chkLabs'),      labSFk = nval('#rngLabSF',200), labCost = labSFk*1000*1200;
    const grfOn   = bval('#chkGRF'),       grfCost = 37e6;
    const ghOn    = bval('#chkGradHousing'),beds = nval('#rngBeds',600), perBed=221000, ghCost=beds*perBed;
    const libOn   = bval('#chkLibrary'),   libM = nval('#rngLibrary',150)*1e6;

    const phdOn   = bval('#chkPhD'),   phdInc = nval('#rngPhD',5000), phdCount=4160, phdCost = phdInc*phdCount;
    const aidOn   = bval('#chkAid'),   aidPct = nval('#rngAid',0),    aidBase=275e6, aidCost=aidBase*(aidPct/100);
    const cyberOn = bval('#chkCyber'), cyberM = nval('#rngCyber',7)*1e6;
    const decopsOn= bval('#chkDecarbOps'), decopsM = nval('#rngDecarbOps',15)*1e6;
    const facOn   = bval('#chkFacilities'),facM = nval('#rngFacilities',75)*1e6;

    return {
      policy: { treasuryOneTime, useFedOneTime, fedPermanent },
      oneTime: [
        houseOn ? {name:'House Renewal phase', amount:houseM} : null,
        labsOn  ? {name:`Modernize wet-labs (${labSFk}k SF)`, amount:labCost} : null,
        grfOn   ? {name:'Decarbonization fund top-up (GRF)', amount:grfCost} : null,
        ghOn    ? {name:`Graduate housing (+${beds} beds)`, amount:ghCost} : null,
        libOn   ? {name:'Library renovation (phase)', amount:libM} : null,
        treasuryOneTime ? {name:'One-time $500M Treasury payment', amount:500e6} : null,
        useFedOneTime   ? {name:'One-time backfill federal research', amount:684e6} : null
      ].filter(Boolean),
      recurring: [
        phdOn   ? {name:`Raise all PhD stipends (+$${phdInc.toLocaleString()}/student)`, amount:phdCost} : null,
        aidOn   ? {name:`Increase undergrad financial aid (+${aidPct}%)`, amount:aidCost} : null,
        cyberOn ? {name:'Cybersecurity hardening & insurance', amount:cyberM} : null,
        decopsOn? {name:'Decarbonization operations', amount:decopsM} : null,
        facOn   ? {name:'Facilities renewal / deferred maintenance', amount:facM} : null
      ].filter(Boolean)
    };
  }

  // --------- compute (Option A: incremental-only, REAL) ----------
  function compute(){
    const { payoutPct, returnPct, inflPct, committedPct, taxPct, unresPct } = assumptions();
    const sel = selections();

    const U0 = TOTAL_ENDOWMENT * (unresPct/100);

    const r_nom = (returnPct/100) * (1 - (taxPct/100));
    const r     = (1 + r_nom) / (1 + inflPct/100) - 1; // REAL

    const payoutY0       = U0 * (payoutPct/100);
    const baselineNeedY0 = (committedPct/100) * payoutY0;
    const slackPayout0   = Math.max(0, payoutY0 - baselineNeedY0);

    const oneTimeSum   = selections().oneTime.reduce((s,x)=>s + x.amount, 0);
    const recurringSum = selections().recurring.reduce((s,x)=>s + x.amount, 0);
    const permFedY1    = sel.policy.fedPermanent ? 684e6 : 0;
    const extraY1      = oneTimeSum + recurringSum + permFedY1;

    const retY0_real = r * U0;
    const capacityY1 = retY0_real + slackPayout0;

    const principalConsumedY1 = Math.max(0, extraY1 - capacityY1);
    const drawY0 = Math.max(0, (baselineNeedY0 + extraY1) - payoutY0);

    let U_base = U0, U_scn = U0;
    let cumPayoutBase = 0, cumPayoutScenario = 0;
    let principalConsumed10 = 0, cumulativeDraw = 0;
    let permFed = permFedY1;
    const infl = 1 + inflPct/100;

    for (let year=1; year<=10; year++){
      // baseline (no extras)
      const P_base = U_base * (payoutPct/100);
      const baselineNeed_base = (committedPct/100) * P_base;
      cumPayoutBase += P_base;
      U_base = Math.max(0, U_base + r*U_base - baselineNeed_base);

      // scenario (with extras)
      const Pt = U_scn * (payoutPct/100);
      const baselineNeed = (committedPct/100) * Pt;
      const slackPayout  = Math.max(0, Pt - baselineNeed);
      const extra = recurringSum + (sel.policy.fedPermanent ? permFed : 0) + (year===1 ? oneTimeSum : 0);
      const retReal = r * U_scn;

      const capacity = retReal + slackPayout;
      const consumedThisYear = Math.max(0, extra - capacity);
      principalConsumed10 += consumedThisYear;

      const draw = Math.max(0, (baselineNeed + extra) - Pt);
      cumulativeDraw += draw;

      U_scn = Math.max(0, U_scn + retReal - (baselineNeed + extra));
      cumPayoutScenario += Pt;

      if (sel.policy.fedPermanent) permFed *= infl;
    }

    return {
      U0,
      U1: Math.max(0, U0 - principalConsumedY1),
      U10: Math.max(0, U0 - principalConsumed10),
      payoutY0,
      drawY0,
      cumulativeDraw,
      principalConsumedY1,
      principalConsumed10,
      cumPayoutBase,
      cumPayoutScenario,
      cumPayoutDelta: cumPayoutScenario - cumPayoutBase
    };
  }

  // --------- render: treemap ----------
  function renderStock(){
    const host = d3.select('#stock-treemap');
    host.selectAll('svg').remove();

    const svg = host.append('svg')
      .attr('width','100%').attr('height','100%')
      .attr('viewBox','0 0 900 420');

    const data = POTS.map(d => Object.assign({}, d, {unrestricted: d.key === 'unr'}));
    const root = d3.treemap().size([900,420]).padding(4)(
      d3.hierarchy({children:data}).sum(d=>d.share)
    );

    const g = svg.append('g');
    const tip = d3.select('body').append('div').attr('class','tooltip').style('opacity',0);

    const nodes = g.selectAll('g.node').data(root.leaves()).enter()
      .append('g').attr('class','node')
      .attr('transform',d=>`translate(${d.x0},${d.y0})`);

    nodes.append('rect')
      .attr('width',d=>d.x1-d.x0).attr('height',d=>d.y1-d.y0)
      .attr('fill',d=> d.data.unrestricted ? '#3b82f6' : '#1e293b')
      .attr('rx',10).attr('ry',10);

    nodes.on('mousemove', (event,d)=>{
      tip.style('opacity',1)
        .style('left',(event.pageX+12)+'px')
        .style('top',(event.pageY+12)+'px')
        .html(`<strong>${d.data.name}</strong><br/>Share: ${d3.format('.1f')(d.data.share)}%<br/>${d.data.desc}`);
    }).on('mouseout', ()=> tip.style('opacity',0));
  }

  // --------- render: donuts ----------
  function drawDonut(svgSel, centerSel, start, consumed, note){
    const svg = d3.select(svgSel);
    svg.selectAll('*').remove();
    const w = +svg.attr('width')||220, h = +svg.attr('height')||220;

    const rOuter = Math.min(w,h)/2 - 8, rInner = rOuter - 22;
    const g = svg.append('g').attr('transform', `translate(${w/2},${h/2})`);
    const arc = d3.arc().innerRadius(rInner).outerRadius(rOuter);

    const loss = Math.max(0, Math.min(consumed, start));
    const remaining = Math.max(0, start - loss);

    const pie = d3.pie().sort(null).value(d=>d.value);
    const data = [{name:'Remaining', value: remaining}, {name:'Consumed', value: loss}];

    g.selectAll('path').data(pie(data)).enter().append('path')
      .attr('d', arc)
      .attr('fill', (d,i)=> i===0 ? '#334155' : '#3b82f6');

    const end = start - loss;
    const center = $(centerSel);
    if (center){
      center.innerHTML = `<div><strong>${money(end)}</strong></div>
                          <div class="muted">${delta(end - start)} vs start</div>
                          <div class="muted">${note||''}</div>`;
    }
  }

  function renderDonuts(res){
    drawDonut('#donut1',  '#donut1-metrics',  res.U0, res.principalConsumedY1,
      `Y1 real principal consumed (extras only): ${money(res.principalConsumedY1)}`);
    drawDonut('#donut10', '#donut10-metrics', res.U0, res.principalConsumed10,
      `10-yr real principal consumed (extras only): ${money(res.principalConsumed10)}`);
  }

  // --------- impact ----------
  function renderImpact(res){
    const b = $('#lblPayoutBase'), n = $('#lblPayoutNew'), d = $('#lblPayoutDelta');
    if (b) b.textContent = money(res.cumPayoutBase);
    if (n) n.textContent = money(res.cumPayoutScenario);
    if (d) d.textContent = (res.cumPayoutDelta>=0?'+':'') + money(res.cumPayoutDelta);

    const list = $('#impactList');
    if (!list) return;
    list.innerHTML = '';
    const shortfall = Math.abs(Math.min(0, res.cumPayoutDelta));
    IMPACT_WEIGHTS.forEach(x=>{
      const li = document.createElement('li');
      li.innerHTML = `<span>${x.name}</span><span>${money(shortfall * x.w)}</span>`;
      list.appendChild(li);
    });
  }

  // --------- wire + boot ---------
  function recomputeAndRender(){
    const res = compute();
    renderStock();
    renderDonuts(res);
    renderImpact(res);
  }

  $all('#chkTreasury, #chkFedOneTime, #chkFedPermanent, #chkHouse, #rngHouse, #chkLabs, #rngLabSF, #chkGRF, #chkGradHousing, #rngBeds, #chkLibrary, #rngLibrary, #chkPhD, #rngPhD, #chkAid, #rngAid, #chkCyber, #rngCyber, #chkDecarbOps, #rngDecarbOps, #chkFacilities, #rngFacilities, #inpPayout, #inpReturn, #inpInfl, #inpCommitted, #inpTax')
    .forEach(el => el && el.addEventListener('input', recomputeAndRender));

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', recomputeAndRender);
  } else {
    recomputeAndRender();
  }

  // Signal to the outer debug badge
  window.__VIZ_OK__ = true;
})();
