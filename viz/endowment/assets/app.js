(function(){
  // --------- helpers kept ultra-safe ----------
  function $(s){ return document.querySelector(s); }
  function $all(s){ return Array.prototype.slice.call(document.querySelectorAll(s)||[]); }
  function fmtMoney(v){
    if (isNaN(v)) return "$0";
    // Format like $12,345,678
    return "$" + Math.round(v).toLocaleString();
  }
  function fmtDelta(v){
    // Compact $1.2B style without depending on d3's $.2s (avoids locale/minor version quirks)
    const sign = v < 0 ? "-" : (v > 0 ? "+" : "");
    const n = Math.abs(v);
    const units = [
      {k:1e12, s:"T"},
      {k:1e9,  s:"B"},
      {k:1e6,  s:"M"},
      {k:1e3,  s:"k"}
    ];
    for (const u of units){
      if (n >= u.k) return sign + "$" + (n/u.k).toFixed(2).replace(/\.00$/,"") + u.s;
    }
    return sign + "$" + Math.round(n).toLocaleString();
  }

  // --------- constants / defaults ----------
  var TOTAL_ENDOWMENT = 53.2e9;       // $
  var UNRESTRICTED_PCT = 30;          // %
  var DEFAULTS = {
    payoutPct: 5.5,
    returnPct: 7,
    inflPct: 3,
    committedPct: 90,   // % of payout earmarked for existing ops
    taxPct: 8           // % excise on investment income
  };

  // Pots for treemap (sum = 100)
  var POTS = [
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

  var IMPACT_WEIGHTS = [
    { name:"Libraries & Museums",     w:0.20 },
    { name:"Student services",        w:0.30 },
    { name:"Academic programs",       w:0.20 },
    { name:"Facilities & operations", w:0.20 },
    { name:"Other central support",   w:0.10 }
  ];

  // --------- bind sliders (defensive) ----------
  function bindSlider(id, labelId, format){
    try{
      var el = $(id), lbl = $(labelId);
      if (!el || !lbl) return;
      var fmt = format || function(v){ return v; };
      function set(){ lbl.textContent = fmt(el.value); }
      el.addEventListener('input', set);
      set();
    }catch(e){}
  }
  bindSlider('#rngHouse',     '#lblHouse',     function(v){ return (+v).toFixed(0); });
  bindSlider('#rngLabSF',     '#lblLabSF',     function(v){ return (+v).toFixed(0); });
  bindSlider('#rngBeds',      '#lblBeds',      function(v){ return (+v).toFixed(0); });
  bindSlider('#rngLibrary',   '#lblLibrary',   function(v){ return (+v).toFixed(0); });
  bindSlider('#rngPhD',       '#lblPhD',       function(v){ return (+v).toFixed(0); });
  bindSlider('#rngAid',       '#lblAid',       function(v){ return (+v).toFixed(0); });
  bindSlider('#rngCyber',     '#lblCyber',     function(v){ return (+v).toFixed(0); });
  bindSlider('#rngDecarbOps', '#lblDecarbOps', function(v){ return (+v).toFixed(0); });
  bindSlider('#rngFacilities','#lblFacilities',function(v){ return (+v).toFixed(0); });

  // --------- selections & assumptions (defensive reads) ----------
  function numVal(sel, fallback){ var el=$(sel); var v = el ? +el.value : NaN; return isFinite(v) ? v : fallback; }
  function boolVal(sel){ var el=$(sel); return !!(el && el.checked); }

  function assumptions(){
    return {
      payoutPct:    numVal('#inpPayout',   DEFAULTS.payoutPct),
      returnPct:    numVal('#inpReturn',   DEFAULTS.returnPct),
      inflPct:      numVal('#inpInfl',     DEFAULTS.inflPct),
      committedPct: numVal('#inpCommitted',DEFAULTS.committedPct),
      taxPct:       numVal('#inpTax',      DEFAULTS.taxPct),
      unresPct:     UNRESTRICTED_PCT
    };
  }

  function selections(){
    var treasuryOneTime = boolVal('#chkTreasury');
    var fedOneTime      = boolVal('#chkFedOneTime');
    var fedPermanent    = boolVal('#chkFedPermanent');
    var useFedOneTime   = fedOneTime && !fedPermanent;

    var houseOn = boolVal('#chkHouse'), houseM = numVal('#rngHouse',400)*1e6;
    var labsOn  = boolVal('#chkLabs'),  labSFk = numVal('#rngLabSF',200), labCost = labSFk*1000*1200;
    var grfOn   = boolVal('#chkGRF'),   grfCost = 37e6;
    var ghOn    = boolVal('#chkGradHousing'), beds = numVal('#rngBeds',600), perBed=221000, ghCost=beds*perBed;
    var libOn   = boolVal('#chkLibrary'), libM = numVal('#rngLibrary',150)*1e6;

    var phdOn   = boolVal('#chkPhD'),   phdInc = numVal('#rngPhD',5000), phdCount=4160, phdCost = phdInc*phdCount;
    var aidOn   = boolVal('#chkAid'),   aidPct = numVal('#rngAid',0),    aidBase=275e6, aidCost=aidBase*(aidPct/100);
    var cyberOn = boolVal('#chkCyber'), cyberM = numVal('#rngCyber',7)*1e6;
    var decopsOn= boolVal('#chkDecarbOps'), decopsM = numVal('#rngDecarbOps',15)*1e6;
    var facOn   = boolVal('#chkFacilities'), facM = numVal('#rngFacilities',75)*1e6;

    return {
      policy: { treasuryOneTime:treasuryOneTime, useFedOneTime:useFedOneTime, fedPermanent:fedPermanent },
      oneTime: [
        houseOn ? {name:'House Renewal phase', amount:houseM} : null,
        labsOn  ? {name:'Modernize wet-labs ('+labSFk+'k SF)', amount:labCost} : null,
        grfOn   ? {name:'Decarbonization fund top-up (GRF)', amount:grfCost} : null,
        ghOn    ? {name:'Graduate housing (+'+beds+' beds)', amount:ghCost} : null,
        libOn   ? {name:'Library renovation (phase)', amount:libM} : null,
        treasuryOneTime ? {name:'One-time $500M Treasury payment', amount:500e6} : null,
        useFedOneTime   ? {name:'One-time backfill federal research', amount:684e6} : null
      ].filter(Boolean),
      recurring: [
        phdOn   ? {name:'Raise all PhD stipends (+'+phdInc.toLocaleString()+"/student)", amount:phdCost} : null,
        aidOn   ? {name:'Increase undergrad financial aid (+'+aidPct+'%)', amount:aidCost} : null,
        cyberOn ? {name:'Cybersecurity hardening & insurance', amount:cyberM} : null,
        decopsOn? {name:'Decarbonization operations', amount:decopsM} : null,
        facOn   ? {name:'Facilities renewal / deferred maintenance', amount:facM} : null
      ].filter(Boolean)
    };
  }

  // --------- core compute (Option A: incremental-only, REAL) ----------
  function compute(){
    var A = assumptions();
    var sel = selections();

    var U0 = TOTAL_ENDOWMENT * (A.unresPct/100); // unrestricted start

    // returns
    var r_nom = (A.returnPct/100) * (1 - (A.taxPct/100));
    var r     = (1 + r_nom) / (1 + A.inflPct/100) - 1; // REAL

    // payout & baseline
    var payoutY0          = U0 * (A.payoutPct/100);
    var baselineNeedY0    = (A.committedPct/100) * payoutY0;
    var slackPayout0      = Math.max(0, payoutY0 - baselineNeedY0);

    // extras
    var oneTimeSum   = sel.oneTime.reduce(function(s,x){ return s + x.amount; }, 0);
    var recurringSum = sel.recurring.reduce(function(s,x){ return s + x.amount; }, 0);
    var permFedY1    = sel.policy.fedPermanent ? 684e6 : 0;
    var extraY1      = oneTimeSum + recurringSum + permFedY1;

    // year 1 capacity & consumption (incremental-only)
    var retY0_real = r * U0;
    var capacityY1 = retY0_real + slackPayout0;         // what covers extras before touching principal
    var principalConsumedY1 = Math.max(0, extraY1 - capacityY1);

    // legacy draw metric (accounting)
    var drawY0 = Math.max(0, (baselineNeedY0 + extraY1) - payoutY0);

    // 10-year evolution (incremental consumption only)
    var U_base = U0;              // baseline path (no extras)
    var U_scn  = U0;              // scenario path (with extras; used for payout comparison)
    var cumPayoutBase = 0;
    var cumPayoutScenario = 0;
    var principalConsumed10 = 0;  // sum of incremental consumption only
    var cumulativeDraw = 0;       // legacy metric
    var permFed = permFedY1;
    var infl = 1 + (A.inflPct/100);

    for (var year=1; year<=10; year++){
      // baseline
      var P_base = U_base * (A.payoutPct/100);
      var baselineNeed_base = (A.committedPct/100) * P_base;
      cumPayoutBase += P_base;
      U_base = Math.max(0, U_base + r*U_base - baselineNeed_base);

      // scenario
      var Pt = U_scn * (A.payoutPct/100);
      var baselineNeed = (A.committedPct/100) * Pt;
      var slackPayout  = Math.max(0, Pt - baselineNeed);

      var extra = recurringSum + (sel.policy.fedPermanent ? permFed : 0) + (year===1 ? oneTimeSum : 0);
      var retReal = r * U_scn;

      // incremental consumption this year
      var capacity = retReal + slackPayout;
      var consumedThisYear = Math.max(0, extra - capacity);
      principalConsumed10 += consumedThisYear;

      // legacy draw metric (accounting)
      var draw = Math.max(0, (baselineNeed + extra) - Pt);
      cumulativeDraw += draw;

      // evolve principal in real terms (baseline use treated identically in both paths)
      U_scn = Math.max(0, U_scn + retReal - (baselineNeed + extra));
      cumPayoutScenario += Pt;

      if (sel.policy.fedPermanent) permFed *= infl;
    }

    // For donuts: show remaining vs start after incremental consumption
    var U1_forDonut  = Math.max(0, U0 - principalConsumedY1);
    var U10_forDonut = Math.max(0, U0 - principalConsumed10);

    return {
      U0: U0,
      U1: U1_forDonut,
      U10: U10_forDonut,

      payoutY0: payoutY0,
      drawY0: drawY0,
      cumulativeDraw: cumulativeDraw,

      principalConsumedY1: principalConsumedY1,
      principalConsumed10: principalConsumed10,

      cumPayoutBase: cumPayoutBase,
      cumPayoutScenario: cumPayoutScenario,
      cumPayoutDelta: (cumPayoutScenario - cumPayoutBase),

      components: { oneTime: sel.oneTime, recurring: sel.recurring, permFedY1: permFedY1 }
    };
  }

  // --------- treemap ----------
  function renderStock(){
    try{
      var host = d3.select('#stock-treemap');
      if (host.empty()) return;
      host.selectAll('*').remove();

      var svg = host.append('svg')
        .attr('width','100%').attr('height','100%')
        .attr('viewBox','0 0 900 420');

      var data = POTS.map(function(d){ return Object.assign({}, d, {unrestricted: d.key==='unr'}); });

      var root = d3.treemap().size([900,420]).padding(4)(
        d3.hierarchy({children:data}).sum(function(d){ return d.share; })
      );

      var tip = d3.select('body').append('div').attr('class','tooltip').style('opacity',0);

      var g = svg.append('g');
      var nodes = g.selectAll('g.node').data(root.leaves()).enter()
        .append('g').attr('class','node')
        .attr('transform',function(d){ return 'translate('+d.x0+','+d.y0+')'; });

      nodes.append('rect')
        .attr('width',function(d){ return d.x1-d.x0; })
        .attr('height',function(d){ return d.y1-d.y0; })
        .attr('fill',function(d){ return d.data.unrestricted ? '#3b82f6' : '#1e293b'; })
        .attr('rx',10).attr('ry',10);

      nodes.on('mousemove', function(event,d){
        tip.style('opacity',1)
          .style('left', (event.pageX+12)+'px')
          .style('top',  (event.pageY+12)+'px')
          .html('<strong>'+d.data.name+'</strong><br/>Share: '+d3.format('.1f')(d.data.share)+'%<br/>'+d.data.desc);
      }).on('mouseout', function(){ tip.style('opacity',0); });
    }catch(e){
      console.error('renderStock error', e);
    }
  }

  // --------- donuts ----------
  function drawConsumptionDonut(svgSel, centerSel, start, consumed, note){
    try{
      var svg = d3.select(svgSel);
      if (svg.empty()) return;
      svg.selectAll('*').remove();

      var w = +svg.attr('width'), h = +svg.attr('height');
      if (!isFinite(w) || !isFinite(h) || w<=0 || h<=0){ w=220; h=220; }

      var rOuter = Math.min(w,h)/2 - 8, rInner = rOuter - 22;
      var g = svg.append('g').attr('transform','translate('+(w/2)+','+(h/2)+')');
      var arc = d3.arc().innerRadius(rInner).outerRadius(rOuter);

      var loss = Math.max(0, Math.min(consumed, start));
      var remaining = Math.max(0, start - loss);

      var pie = d3.pie().sort(null).value(function(d){ return d.value; });
      var data = [
        {name:'Remaining', value: remaining},
        {name:'Consumed',  value: loss}
      ];

      g.selectAll('path').data(pie(data)).enter().append('path')
        .attr('d', arc)
        .attr('fill', function(d,i){ return i===0 ? '#334155' : '#3b82f6'; });

      var end = start - loss;
      var center = $(centerSel);
      if (center){
        center.innerHTML =
          '<div><strong>'+fmtMoney(end)+'</strong></div>' +
          '<div class="muted">'+fmtDelta(end - start)+' vs start</div>' +
          '<div class="muted">'+(note||'')+'</div>';
      }
    }catch(e){
      console.error('drawConsumptionDonut error', e);
    }
  }

  function renderDonuts(res){
    try{
      drawConsumptionDonut('#donut1',  '#donut1-metrics',  res.U0, res.principalConsumedY1,
        'Y1 real principal consumed (extras only): '+fmtMoney(res.principalConsumedY1));
      drawConsumptionDonut('#donut10', '#donut10-metrics', res.U0, res.principalConsumed10,
        '10-yr real principal consumed (extras only): '+fmtMoney(res.principalConsumed10));
    }catch(e){
      console.error('renderDonuts error', e);
    }
  }

  // --------- impact ----------
  function renderImpact(res){
    try{
      var b = $('#lblPayoutBase'), n = $('#lblPayoutNew'), d = $('#lblPayoutDelta');
      if (b) b.textContent = fmtMoney(res.cumPayoutBase);
      if (n) n.textContent = fmtMoney(res.cumPayoutScenario);
      if (d) d.textContent = (res.cumPayoutDelta>=0?'+':'') + fmtMoney(res.cumPayoutDelta);

      var list = $('#impactList');
      if (!list) return;
      list.innerHTML = '';

      var shortfall = Math.abs(Math.min(0, res.cumPayoutDelta));
      IMPACT_WEIGHTS.forEach(function(x){
        var li = document.createElement('li');
        li.innerHTML = '<span>'+x.name+'</span><span>'+fmtMoney(shortfall * x.w)+'</span>';
        list.appendChild(li);
      });
    }catch(e){
      console.error('renderImpact error', e);
    }
  }

  function recomputeAndRender(){
    try{
      var res = compute();
      renderStock();
      renderDonuts(res);
      renderImpact(res);
    }catch(e){
      console.error('compute/render error', e);
    }
  }

  // Wire all inputs
  $all('#chkTreasury, #chkFedOneTime, #chkFedPermanent, #chkHouse, #rngHouse, #chkLabs, #rngLabSF, #chkGRF, #chkGradHousing, #rngBeds, #chkLibrary, #rngLibrary, #chkPhD, #rngPhD, #chkAid, #rngAid, #chkCyber, #rngCyber, #chkDecarbOps, #rngDecarbOps, #chkFacilities, #rngFacilities, #inpPayout, #inpReturn, #inpInfl, #inpCommitted, #inpTax')
    .forEach(function(el){ try{ el.addEventListener('input', recomputeAndRender); }catch(e){} });

  // Kick things off after DOM is ready (extra safety)
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', recomputeAndRender);
  }else{
    recomputeAndRender();
  }
})();
