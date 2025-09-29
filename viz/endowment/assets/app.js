(function(){
  // --------- constants / assumptions ----------
  const TOTAL_ENDOWMENT = 53.2e9;          // $
  const UNRESTRICTED_PCT = 30;             // fixed per your spec
  const DEFAULTS = {
    payoutPct: 5.5,
    returnPct: 7,
    inflPct: 3,
    committedPct: 90,   // % of payout already earmarked for existing operations
    taxPct: 8           // federal excise tax on endowment net investment income
  };

  // Top treemap pots EXACTLY as provided
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

  // Illustrative breakdown for reduced flexible payout (10-yr)
  const IMPACT_WEIGHTS = [
    { name:"Libraries & Museums",     w:0.20 },
    { name:"Student services",        w:0.30 },
    { name:"Academic programs",       w:0.20 },
    { name:"Facilities & operations", w:0.20 },
    { name:"Other central support",   w:0.10 }
  ];

  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const fmt = v => d3.format('$,.0f')(v);

  // ---------- slider label binders ----------
  function bindSlider(id, labelId, fmtv = v => v){
    const el = $(id), lbl = $(labelId);
    const set = () => { if (lbl && el) lbl.textContent = fmtv(el.value); };
    if (el && lbl){ el.addEventListener('input', set); set(); }
  }
  bindSlider('#rngHouse',     '#lblHouse',     v => (+v).toFixed(0));
  bindSlider('#rngLabSF',     '#lblLabSF',     v => (+v).toFixed(0));
  bindSlider('#rngBeds',      '#lblBeds',      v => (+v).toFixed(0));
  bindSlider('#rngLibrary',   '#lblLibrary',   v => (+v).toFixed(0));
  bindSlider('#rngPhD',       '#lblPhD',       v => (+v).toFixed(0));
  bindSlider('#rngAid',       '#lblAid',       v => (+v).toFixed(0));
  bindSlider('#rngCyber',     '#lblCyber',     v => (+v).toFixed(0));
  bindSlider('#rngDecarbOps', '#lblDecarbOps', v => (+v).toFixed(0));
  bindSlider('#rngFacilities','#lblFacilities',v => (+v).toFixed(0));

  // ---------- assumptions & selections ----------
  function assumptions(){
    return {
      payoutPct:     +$('#inpPayout')?.value    || DEFAULTS.payoutPct,
      returnPct:     +$('#inpReturn')?.value    || DEFAULTS.returnPct,
      inflPct:       +$('#inpInfl')?.value      || DEFAULTS.inflPct,
      committedPct:  +$('#inpCommitted')?.value || DEFAULTS.committedPct,
      taxPct:        +$('#inpTax')?.value       || DEFAULTS.taxPct,     // NEW
      unresPct:      UNRESTRICTED_PCT
    };
  }

  function selections(){
    const treasuryOneTime = $('#chkTreasury')?.checked;
    const fedOneTime      = $('#chkFedOneTime')?.checked;
    const fedPermanent    = $('#chkFedPermanent')?.checked;
    const useFedOneTime   = fedOneTime && !fedPermanent;

    const houseOn = $('#chkHouse')?.checked, houseM = +$('#rngHouse')?.value * 1e6;
    const labsOn  = $('#chkLabs')?.checked,  labSFk = +$('#rngLabSF')?.value, labCost = labSFk*1000*1200;
    const grfOn   = $('#chkGRF')?.checked,   grfCost = 37e6;
    const ghOn    = $('#chkGradHousing')?.checked, beds = +$('#rngBeds')?.value, perBed=221000, ghCost=beds*perBed;
    const libOn   = $('#chkLibrary')?.checked, libM = +$('#rngLibrary')?.value*1e6;

    const phdOn   = $('#chkPhD')?.checked, phdInc = +$('#rngPhD')?.value, phdCount=4160, phdCost = phdInc*phdCount;
    const aidOn   = $('#chkAid')?.checked, aidPct = +$('#rngAid')?.value, aidBase=275e6, aidCost=aidBase*(aidPct/100);
    const cyberOn = $('#chkCyber')?.checked,   cyberM   = +$('#rngCyber')?.value*1e6;
    const decopsOn= $('#chkDecarbOps')?.checked,decopsM = +$('#rngDecarbOps')?.value*1e6;
    const facOn   = $('#chkFacilities')?.checked, facM  = +$('#rngFacilities')?.value*1e6;

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
        phdOn   ? {name:`Raise all PhD stipends (+$${(phdInc||0).toLocaleString()}/student)`, amount:phdCost||0} : null,
        aidOn   ? {name:`Increase undergrad financial aid (+${aidPct||0}%)`, amount:aidCost||0} : null,
        cyberOn ? {name:'Cybersecurity hardening & insurance', amount:cyberM||0} : null,
        decopsOn? {name:'Decarbonization operations', amount:decopsM||0} : null,
        facOn   ? {name:'Facilities renewal / deferred maintenance', amount:facM||0} : null
      ].filter(Boolean)
    };
  }

  // ---------- compute 1-yr and 10-yr ----------
  function compute(){
    const { payoutPct, returnPct, inflPct, unresPct, committedPct, taxPct } = assumptions();
    const sel = selections();

    const U0 = TOTAL_ENDOWMENT * (unresPct/100);     // unrestricted principal
    const payoutY0 = U0 * (payoutPct/100);           // this year's payout capacity
    const baselineCommitted = committedPct/100;      // share of payout earmarked for existing ops

    const oneTimeSum   = sel.oneTime.reduce((s,x)=>s + x.amount, 0);
    const recurringSum = sel.recurring.reduce((s,x)=>s + x.amount, 0);
    const permFedY1    = sel.policy.fedPermanent ? 684e6 : 0;

    // Year 0 needs include “business as usual” claims on payout
    const baselineNeedY0 = baselineCommitted * payoutY0;
    const plannedThisYear = baselineNeedY0 + oneTimeSum + recurringSum + permFedY1;
    const drawY0 = Math.max(0, plannedThisYear - payoutY0); // principal draw this year

    // Effective after-tax return on net investment income
    const r_gross = returnPct/100;
    const r = r_gross * (taxPct >= 0 ? (1 - taxPct/100) : 1); // clamp-ish behavior

    // 1-yr end principal (end of current year)
    const U1 = Math.max(0, U0 + r*U0 - drawY0);

    // ----- 10-yr baseline (no draws) -----
    let U_base = U0;
    let cumPayoutBase = 0;

    // ----- 10-yr scenario (with draws) -----
    let U = U0;
    let cumulativeDraw = 0;
    let permFed = permFedY1;
    const infl = 1 + inflPct/100;
    let cumPayoutScenario = 0;

    for (let year = 1; year <= 10; year++) {
      // Baseline payout this year (no draws ever)
      const P_base = U_base * (payoutPct/100);
      cumPayoutBase += P_base;
      U_base = U_base + r * U_base; // grow baseline principal after-tax

      // Scenario payout this year
      const Pt = U * (payoutPct/100);
      cumPayoutScenario += Pt;

      const baselineNeed = baselineCommitted * Pt; // existing ops eat most of payout
      const annualRecurring = recurringSum + (sel.policy.fedPermanent ? permFed : 0);
      const need = baselineNeed + annualRecurring + (year === 1 ? oneTimeSum : 0);

      const draw = Math.max(0, need - Pt);
      cumulativeDraw += draw;

      // End-of-year principal after draw and after-tax return
      U = Math.max(0, U + r * U - draw);

      if (sel.policy.fedPermanent) permFed *= infl; // grow permanent gap for next year
    }

    return {
      U0,                   // starting unrestricted principal
      U1,                   // end of year 1 principal
      U10: U,               // end of year 10 principal
      payoutY0,             // this year's payout capacity
      drawY0,               // principal draw this year
      cumulativeDraw,       // 10-yr total principal drawn

      // 10-year payout comparison (baseline vs scenario)
      cumPayoutBase,        // cumulative payout over 10 yrs with NO draws
      cumPayoutScenario,    // cumulative payout over 10 yrs with your scenario (draws allowed)
      cumPayoutDelta: cumPayoutScenario - cumPayoutBase, // negative if scenario pays out less

      components: {
        oneTime: sel.oneTime,
        recurring: sel.recurring,
        permFedY1
      }
    };
  }

  // ---------- Treemap 1 (stock) ----------
  const stockSVG = d3.select('#stock-treemap').append('svg')
    .attr('width','100%').attr('height','100%').attr('viewBox','0 0 900 420');

  const tip = d3.select('body').append('div').attr('class','tooltip').style('opacity',0);

  function renderStock(){
    stockSVG.selectAll('*').remove();
    const data = POTS.map(d => ({ ...d, unrestricted: d.key === 'unr' }));
    const root = d3.treemap().size([900,420]).padding(4)(
      d3.hierarchy({children:data}).sum(d=>d.share)
    );

    const g = stockSVG.append('g');
    const nodes = g.selectAll('g.node').data(root.leaves()).enter().append('g').attr('class','node')
      .attr('transform',d=>`translate(${d.x0},${d.y0})`);

    nodes.append('rect')
      .attr('width',d=>d.x1-d.x0).attr('height',d=>d.y1-d.y0)
      .attr('fill',d=> d.data.unrestricted ? '#3b82f6' : '#1e293b')
      .attr('rx',10).attr('ry',10);

    // hover only (no crowded labels)
    nodes.on('mousemove', (event,d)=>{
      tip.style('opacity',1)
        .style('left',(event.pageX+12)+'px')
        .style('top',(event.pageY+12)+'px')
        .html(`<strong>${d.data.name}</strong><br/>Share: ${d3.format('.1f')(d.data.share)}%<br/>${d.data.desc}`);
    }).on('mouseout', ()=> tip.style('opacity',0));
  }

  // ---------- Donuts (gray -> blue as loss grows) ----------
  function renderDonuts(res){
    drawDonut('#donut1',  '#donut1-metrics',  res.U0, res.U1,  `1-yr principal draw: ${fmt(res.drawY0)}`);
    drawDonut('#donut10', '#donut10-metrics', res.U0, res.U10, `10-yr cumulative draw: ${fmt(res.cumulativeDraw)}`);
  }

  function drawDonut(svgSel, centerSel, start, end, note){
    const svg = d3.select(svgSel);
    svg.selectAll('*').remove();
    const w = +svg.attr('width'), h = +svg.attr('height');
    const rOuter = Math.min(w,h)/2 - 8, rInner = rOuter - 22;
    const g = svg.append('g').attr('transform', `translate(${w/2},${h/2})`);
    const arc = d3.arc().innerRadius(rInner).outerRadius(rOuter);

    // Start fully gray; the "Lost" portion turns blue as principal is eaten
    const remaining = Math.max(0, Math.min(end, start));
    const lost = Math.max(0, start - end);
    const total = Math.max(1, start); // avoid div-by-zero

    const pie = d3.pie().sort(null).value(d => d.value);
    const data = [
      {name:'Remaining', value: remaining/total}, // gray
      {name:'Lost',      value: lost/total}       // blue
    ];

    g.selectAll('path').data(pie(data)).enter().append('path')
      .attr('d', arc)
      .attr('fill', (d,i)=> i===0 ? '#334155' : '#3b82f6');

    const delta = end - start;
    $(centerSel).innerHTML = `<div><strong>${fmt(end)}</strong></div>
                              <div class="muted">${delta>=0?'+':''}${d3.format('$.2s')(delta).replace('G','B')} vs start</div>
                              <div class="muted">${note||''}</div>`;
  }

  // ---------- Impact (10-yr payout shortfall allocated to areas) ----------
  function renderImpact(res){
    $('#lblPayoutBase').textContent = fmt(res.cumPayoutBase);
    $('#lblPayoutNew').textContent  = fmt(res.cumPayoutScenario);
    $('#lblPayoutDelta').textContent= (res.cumPayoutDelta>=0?'+':'') + fmt(res.cumPayoutDelta);

    const list = $('#impactList');
    list.innerHTML = '';

    // Only allocate if scenario pays out less than baseline
    const shortfall = Math.abs(Math.min(0, res.cumPayoutDelta));
    IMPACT_WEIGHTS.forEach(({name,w})=>{
      const amt = shortfall * w;
      const li = document.createElement('li');
      li.innerHTML = `<span>${name}</span><span>${fmt(amt)}</span>`;
      list.appendChild(li);
    });
  }

  // ---------- wire events & initial render ----------
  function recomputeAndRender(){
    const res = compute();
    renderDonuts(res);
    renderImpact(res);
  }

  $$('#chkTreasury, #chkFedOneTime, #chkFedPermanent, #chkHouse, #rngHouse, #chkLabs, #rngLabSF, #chkGRF, #chkGradHousing, #rngBeds, #chkLibrary, #rngLibrary, #chkPhD, #rngPhD, #chkAid, #rngAid, #chkCyber, #rngCyber, #chkDecarbOps, #rngDecarbOps, #chkFacilities, #rngFacilities, #inpPayout, #inpReturn, #inpInfl, #inpCommitted, #inpTax')
    .forEach(el => el && el.addEventListener('input', recomputeAndRender));

  renderStock();
  recomputeAndRender();
})();
