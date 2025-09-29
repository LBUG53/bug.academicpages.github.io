// Simple, dependency-light viz using D3 v7
(function(){
  // --- constants / defaults ---
  const TOTAL_ENDOWMENT = 53.2e9;         // $
  const DEFAULT_UNRES_PCT = 20;           // % of total
  const DEFAULT_PAYOUT_PCT = 5.5;         // %
  const DEFAULT_RETURN_PCT = 7;           // % nominal
  const DEFAULT_INFL_PCT = 3;             // % (permanent backfill growth)

  // DOM helpers
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // Wire labels for sliders
  function bindSlider(id, labelId, fmt = (v)=>v){
    const inp = $(id), lbl = $(labelId);
    const set = ()=> lbl.textContent = fmt(inp.value);
    inp.addEventListener('input', set);
    set();
  }

  // Bind initial labels
  bindSlider('#rngHouse', '#lblHouse', v => (+v).toFixed(0));
  bindSlider('#rngLabSF', '#lblLabSF', v => (+v).toFixed(0));
  bindSlider('#rngBeds',  '#lblBeds',  v => (+v).toFixed(0));
  bindSlider('#rngLibrary','#lblLibrary', v => (+v).toFixed(0));
  bindSlider('#rngPhD',   '#lblPhD',   v => (+v).toFixed(0));
  bindSlider('#rngAid',   '#lblAid',   v => (+v).toFixed(0));
  bindSlider('#rngCyber', '#lblCyber', v => (+v).toFixed(0));
  bindSlider('#rngDecarbOps','#lblDecarbOps', v => (+v).toFixed(0));
  bindSlider('#rngFacilities','#lblFacilities', v => (+v).toFixed(0));

  // show total endowment label
  $('#totalEndowmentLabel').textContent = d3.format('$.2s')(TOTAL_ENDOWMENT).replace('G','B');

  // state getters
  function getAssumptions(){
    const payoutPct = +$('#inpPayout').value || DEFAULT_PAYOUT_PCT;
    const returnPct = +$('#inpReturn').value || DEFAULT_RETURN_PCT;
    const inflPct   = +$('#inpInfl').value   || DEFAULT_INFL_PCT;
    const unresPct  = +$('#inpUnres').value  || DEFAULT_UNRES_PCT;
    return { payoutPct, returnPct, inflPct, unresPct };
  }

  function getSelections(){
    // policy toggles
    const treasuryOneTime = $('#chkTreasury').checked;
    const fedOneTime      = $('#chkFedOneTime').checked;
    const fedPermanent    = $('#chkFedPermanent').checked;

    // If permanent is ON, ignore one-time federal to avoid double count
    const useFedOneTime = fedOneTime && !fedPermanent;

    // One-time projects
    const houseOn   = $('#chkHouse').checked;
    const houseM    = +$('#rngHouse').value * 1e6;

    const labsOn    = $('#chkLabs').checked;
    const labSFk    = +$('#rngLabSF').value; // in thousands
    const labCost   = labSFk * 1000 * 1200;  // $1,200 per SF

    const grfOn     = $('#chkGRF').checked;
    const grfCost   = 37e6;

    const ghOn      = $('#chkGradHousing').checked;
    const beds      = +$('#rngBeds').value;
    const perBed    = 221000;
    const ghCost    = beds * perBed;

    const libOn     = $('#chkLibrary').checked;
    const libM      = +$('#rngLibrary').value * 1e6;

    // Recurring annual
    const phdOn     = $('#chkPhD').checked;
    const phdInc    = +$('#rngPhD').value; // $ per student
    const phdCount  = 4160;                // ~4.16k PhDs
    const phdCost   = phdInc * phdCount;   // $/yr

    const aidOn     = $('#chkAid').checked;
    const aidPct    = +$('#rngAid').value;
    const aidBase   = 275e6;
    const aidCost   = aidBase * (aidPct/100);

    const cyberOn   = $('#chkCyber').checked;
    const cyberM    = +$('#rngCyber').value * 1e6;

    const decopsOn  = $('#chkDecarbOps').checked;
    const decopsM   = +$('#rngDecarbOps').value * 1e6;

    const facOn     = $('#chkFacilities').checked;
    const facM      = +$('#rngFacilities').value * 1e6;

    return {
      policy: {
        treasuryOneTime,
        useFedOneTime,
        fedPermanent
      },
      oneTime: [
        houseOn   ? {name:'House Renewal phase', amount: houseM} : null,
        labsOn    ? {name:`Modernize wet-labs (${labSFk}k SF)`, amount: labCost} : null,
        grfOn     ? {name:'Decarbonization fund top-up (GRF)', amount: grfCost} : null,
        ghOn      ? {name:`Graduate housing (+${beds} beds)`, amount: ghCost} : null,
        libOn     ? {name:'Library renovation (phase)', amount: libM} : null,
        treasuryOneTime ? {name:'One-time $500M Treasury payment', amount: 500e6} : null,
        useFedOneTime ? {name:'One-time backfill federal research', amount: 684e6} : null
      ].filter(Boolean),
      recurring: [
        phdOn     ? {name:`Raise all PhD stipends (+$${phdInc.toLocaleString()}/student)`, amount: phdCost} : null,
        aidOn     ? {name:`Increase undergrad financial aid (+${aidPct}%)`, amount: aidCost} : null,
        cyberOn   ? {name:'Cybersecurity hardening & insurance', amount: cyberM} : null,
        decopsOn  ? {name:'Decarbonization operations', amount: decopsM} : null,
        facOn     ? {name:'Facilities renewal / deferred maintenance', amount: facM} : null,
        // Permanent federal backfill modeled separately below (if on)
      ].filter(Boolean)
    };
  }

  // compute year 1 flows and 10-yr projection
  function compute(){
    const { payoutPct, returnPct, inflPct, unresPct } = getAssumptions();
    const sel = getSelections();

    const E = TOTAL_ENDOWMENT;
    const U0 = E * (unresPct/100);           // unrestricted MV
    const payout = U0 * (payoutPct/100);     // payout available this year

    // Compose this-year planned spend
    const oneTimeSum = sel.oneTime.reduce((s,x)=> s + x.amount, 0);
    const recurringSum = sel.recurring.reduce((s,x)=> s + x.amount, 0);
    const permFedY1 = sel.policy.fedPermanent ? 684e6 : 0; // included each year if permanent

    const plannedThisYear = oneTimeSum + recurringSum + permFedY1;

    // overage / principal draw this year
    const over = Math.max(0, plannedThisYear - payout);

    // 1-year end balance
    const r = returnPct/100;
    const U1 = Math.max(0, U0 + r*U0 - over);

    // 10-year projection
    let U = U0;
    let cumulativeDraw = 0;
    const infl = 1 + inflPct/100;
    let permFed = permFedY1;
    for (let year=1; year<=10; year++){
      const Pt = U * (payoutPct/100);
      // annual recurring includes user recurring + permanent federal if on (inflated)
      const annualRecurring = recurringSum + (sel.policy.fedPermanent ? permFed : 0);
      // add one-time only in year 1
      const need = annualRecurring + (year === 1 ? oneTimeSum : 0);
      const draw = Math.max(0, need - Pt);
      cumulativeDraw += draw;
      // grow, then subtract draw
      U = Math.max(0, U + r*U - draw);
      // inflate permanent federal for next year
      if (sel.policy.fedPermanent) permFed *= infl;
    }

    return {
      U0, payout, plannedThisYear, over, U1, U10: U, cumulativeDraw,
      components: {
        oneTime: sel.oneTime,
        recurring: sel.recurring,
        permFedY1
      }
    };
  }

  // --- Renders ---
  const stockSVG = d3.select('#stock-treemap').append('svg')
    .attr('width','100%').attr('height','100%')
    .attr('viewBox','0 0 600 360');

  const flowSVG = d3.select('#flow-treemap').append('svg')
    .attr('width','100%').attr('height','100%')
    .attr('viewBox','0 0 600 360');

  // hatch pattern for "Over by"
  const defs = flowSVG.append('defs');
  const pattern = defs.append('pattern')
    .attr('id','diagonalHatch').attr('patternUnits','userSpaceOnUse')
    .attr('width',6).attr('height',6).attr('patternTransform','rotate(45)');
  pattern.append('rect').attr('width',6).attr('height',6).attr('fill','#f87171');
  pattern.append('line').attr('x1',0).attr('y1',0).attr('x2',0).attr('y2',6)
    .attr('stroke','#0b142a').attr('stroke-width',2);

  function renderStock(){
    stockSVG.selectAll('*').remove();
    const { unresPct } = getAssumptions();
    const totalW = 600, totalH = 360;
    const unresW = totalW * (unresPct/100);
    // Restricted tile
    stockSVG.append('rect')
      .attr('x',0).attr('y',0).attr('width', totalW - unresW).attr('height', totalH)
      .attr('fill','#1e293b').attr('class','treerect');
    stockSVG.append('text').attr('x', (totalW - unresW)/2).attr('y', totalH/2)
      .attr('text-anchor','middle').attr('class','label-muted')
      .text('Restricted ~80%');
    // Unrestricted tile
    stockSVG.append('rect')
      .attr('x', totalW - unresW).attr('y',0).attr('width', unresW).attr('height', totalH)
      .attr('fill','#3b82f6').attr('class','treerect');
    stockSVG.append('text').attr('x', totalW - unresW/2).attr('y', totalH/2)
      .attr('text-anchor','middle').attr('class','label')
      .text('Unrestricted ~20%');
  }

  function renderFlow(){
    flowSVG.selectAll('*').remove();
    const res = compute();
    $('#lblPayout').textContent = d3.format('$,.0f')(res.payout);
    $('#lblNeeds').textContent = d3.format('$,.0f')(res.plannedThisYear);

    const over = res.over;
    const lblOver = $('#lblOver');
    if (over > 0){
      lblOver.innerHTML = `&nbsp;|&nbsp;<span class="warning">Over by ${d3.format('$,.0f')(over)} (principal draw)</span>`;
    } else {
      const slack = res.payout - res.plannedThisYear;
      lblOver.innerHTML = `&nbsp;|&nbsp;Uncommitted this year: ${d3.format('$,.0f')(slack)}`;
    }

    // Build treemap-like layout across width
    const items = [];
    // Add one-time items
    res.components.oneTime.forEach(o=> items.push({name:o.name, value:o.amount, type:'one'}));
    // Add recurring
    res.components.recurring.forEach(o=> items.push({name:o.name, value:o.amount, type:'rec'}));
    // Add permanent federal (if any in Y1)
    if (res.components.permFedY1 > 0) items.push({name:'Permanent backfill (Year 1 slice)', value: res.components.permFedY1, type:'rec'});

    // Scale to payout
    const totalPlanned = items.reduce((s,it)=> s + it.value, 0);
    const width = 600, height = 360;
    const x = d3.scaleLinear().domain([0, Math.max(res.payout, totalPlanned, res.payout+res.over)]).range([0, width]);

    let x0 = 0;
    const colorOne = '#f59e0b', colorRec = '#ef4444';
    const g = flowSVG.append('g');

    items.forEach(it=>{
      const w = x(it.value);
      g.append('rect').attr('x', x0).attr('y', 0).attr('width', w).attr('height', height)
        .attr('fill', it.type==='one'? colorOne : colorRec).attr('opacity', 0.9);
      g.append('text').attr('x', x0 + w/2).attr('y', height/2).attr('text-anchor','middle')
        .attr('class','label')
        .text(it.name + ' — ' + d3.format('$,.0f')(it.value));
      x0 += w;
    });

    // If overage, draw hatched segment to show principal draw (past payout capacity)
    if (over > 0){
      const overW = x(over);
      g.append('rect').attr('x', x(res.payout)).attr('y', 0).attr('width', overW).attr('height', height)
        .attr('class','hatched');
      g.append('text').attr('x', x(res.payout) + overW/2).attr('y', height/2).attr('text-anchor','middle')
        .attr('class','label')
        .text('Over by ' + d3.format('$,.0f')(over) + ' (draws principal)');
    } else {
      // draw remaining capacity
      const slackW = x(res.payout - totalPlanned);
      g.append('rect').attr('x', x(totalPlanned)).attr('y', 0).attr('width', slackW).attr('height', height)
        .attr('fill','#0ea5e9').attr('opacity',0.6);
      g.append('text').attr('x', x(totalPlanned) + slackW/2).attr('y', height/2).attr('text-anchor','middle')
        .attr('class','label')
        .text('Uncommitted ' + d3.format('$,.0f')(res.payout - totalPlanned));
    }

    renderDonuts(res);
  }

  function renderDonuts(res){
    const drawDonut = (svgSel, centerSel, start, end, note) => {
      const svg = d3.select(svgSel);
      svg.selectAll('*').remove();
      const w = +svg.attr('width'), h = +svg.attr('height');
      const rOuter = Math.min(w,h)/2 - 10, rInner = rOuter - 26;
      const g = svg.append('g').attr('transform', `translate(${w/2},${h/2})`);
      const arc = d3.arc().innerRadius(rInner).outerRadius(rOuter);
      const pie = d3.pie().sort(null).value(d => d.value);
      const data = [{name:'Start', value:start}, {name:'Change', value:Math.max(0, end-start)}];
      const arcs = g.selectAll('path').data(pie(data)).enter().append('path')
        .attr('d', arc)
        .attr('fill', (d,i)=> i===0 ? '#334155' : '#3b82f6');
      // center metrics
      const pct = start>0 ? ( (end - start) / start * 100 ) : 0;
      const div = $(centerSel);
      div.innerHTML = `<div><strong>${d3.format('$,.0f')(end)}</strong></div>
                       <div class="muted">${pct>=0? '+' : ''}${pct.toFixed(1)}% vs start</div>
                       <div class="muted">${note||''}</div>`;
    };

    // 1-year donut
    drawDonut('#donut1', '#donut1-metrics', res.U0, res.U1, `1-yr principal draw: ${d3.format('$,.0f')(res.over)}`);
    // 10-year donut
    drawDonut('#donut10', '#donut10-metrics', res.U0, res.U10, `10-yr cumulative draw: ${d3.format('$,.0f')(res.cumulativeDraw)}`);
  }

  // events
  $$('#chkTreasury, #chkFedOneTime, #chkFedPermanent, #chkHouse, #rngHouse, #chkLabs, #rngLabSF, #chkGRF, #chkGradHousing, #rngBeds, #chkLibrary, #rngLibrary, #chkPhD, #rngPhD, #chkAid, #rngAid, #chkCyber, #rngCyber, #chkDecarbOps, #rngDecarbOps, #chkFacilities, #rngFacilities, #inpPayout, #inpReturn, #inpInfl, #inpUnres')
    .forEach(el => el.addEventListener('input', ()=> { renderStock(); renderFlow(); }));

  // initial render
  renderStock();
  renderFlow();
})();