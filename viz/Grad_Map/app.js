/* US Grad Map v7 — default gray states, selectable blue, scrollable table w/ sticky header */
(() => {
  console.log("%c[Grad_Map] v7 loaded", "color:#2563eb;font-weight:bold");
  const mount = document.getElementById("us-gradrate-map");
  if (!mount) return console.error("Missing #us-gradrate-map");

  const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
  const CSV_URL = "./ipeds_gradrate.csv";

  let benchmark = 60; // keep 60; easier to see results after selection
  let selectedState = null;
  let institutions = [];
  let topology = null;

  const STATE_NAME_TO_CODE = {
    Alabama:"AL", Alaska:"AK", Arizona:"AZ", Arkansas:"AR", California:"CA", Colorado:"CO",
    Connecticut:"CT", Delaware:"DE", "District of Columbia":"DC", Florida:"FL", Georgia:"GA",
    Hawaii:"HI", Idaho:"ID", Illinois:"IL", Indiana:"IN", Iowa:"IA", Kansas:"KS", Kentucky:"KY",
    Louisiana:"LA", Maine:"ME", Maryland:"MD", Massachusetts:"MA", Michigan:"MI", Minnesota:"MN",
    Mississippi:"MS", Missouri:"MO", Montana:"MT", Nebraska:"NE", Nevada:"NV", "New Hampshire":"NH",
    "New Jersey":"NJ", "New Mexico":"NM", "New York":"NY", "North Carolina":"NC", "North Dakota":"ND",
    Ohio:"OH", Oklahoma:"OK", Oregon:"OR", Pennsylvania:"PA", "Rhode Island":"RI", "South Carolina":"SC",
    "South Dakota":"SD", Tennessee:"TN", Texas:"TX", Utah:"UT", Vermont:"VT", Virginia:"VA",
    Washington:"WA", "West Virginia":"WV", Wisconsin:"WI", Wyoming:"WY"
  };
  const codeToName = (code) => Object.entries(STATE_NAME_TO_CODE).find(([,v])=>v===code)?.[0] || code;

  const normKey = (k) => String(k||"").trim().toLowerCase().replace(/\s+/g,"").replace(/[_\-\/%()]/g,"");
  const toNum = (v) => {
    if (v == null || v === "") return NaN;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[% ,]/g,""));
    return Number.isFinite(n) ? n : NaN;
  };
  const fmtPct = (v) => Number.isFinite(v) ? `${Math.round(v)}%` : "—";
  const toStateCode = (s) => {
    if (!s) return null;
    const t = String(s).trim();
    if (t.length === 2) return t.toUpperCase();
    const nameKey = t.toLowerCase().replace(/\b\w/g,(m)=>m.toUpperCase());
    return STATE_NAME_TO_CODE[nameKey] || null;
  };

  // SVG & neighbors
  const svg = d3.select(mount).append("svg")
    .attr("width", "100%")
    .style("display","block")
    .style("background","#fff");
  const g = svg.append("g");
  const tooltip = d3.select("body").append("div").attr("class","tooltip").style("display","none");
  const parent = mount.parentElement;
  const stateSummary = d3.select(parent).append("div").attr("class","state-summary");
  const tableWrap = d3.select(parent).append("div").attr("class","table-wrap");   // scroll container

  // Buttons
  const syncButtons = () => {
    document.querySelectorAll(".threshold-btn").forEach(b => {
      const t = parseInt(b.getAttribute("data-threshold"),10);
      b.classList.toggle("active", t === benchmark);
    });
  };
  document.querySelectorAll(".threshold-btn").forEach(b => {
    b.addEventListener("click", () => {
      const t = parseInt(b.getAttribute("data-threshold"),10);
      if (!Number.isFinite(t)) return;
      benchmark = t;
      syncButtons();
      render();
    });
  });
  syncButtons();

  // Load
  Promise.all([
    fetch(GEO_URL).then(r=>r.json()),
    new Promise((resolve) => {
      Papa.parse(CSV_URL, { download: true, header: true, skipEmptyLines: true,
        complete: (res) => resolve(res.data || []) });
    })
  ]).then(([topo, rows]) => {
    topology = topo;

    // Header map
    const sample = rows[0] || {};
    const headerMap = {};
    Object.keys(sample).forEach(k => headerMap[normKey(k)] = k);
    const pick = (cands) => { for (const c of cands) { const hk = headerMap[normKey(c)]; if (hk) return hk; } return null; };

    const nameKey = pick(["institution name","instnm","name","college","institution"]);
    const stateKey = pick(["stabbr","state","state abbr","state code","statepostal","stateusps","stateuscode"]);
    const totKey   = pick(["tot_grad","total grad","grad rate","graduation rate","overall grad rate","c150_4_pooled","c150_l4_pooled","c1504","c150l4","c150all","c150"]);
    const nonresKey= pick(["nonres_grad","nonresident grad","nonresident","nonres"]);
    const pellKey  = pick(["pell_grad","pell completion","pell"]);
    const urmKey   = pick(["urm_grad","underrepresented minority grad","minority grad","urm"]);

    console.log("[Grad_Map v7] headers:", { nameKey, stateKey, totKey });

    institutions = rows.map(r => {
      const name = (nameKey ? r[nameKey] : (r.INSTNM||r.name||r.college||"")) || "";
      const rawState = (stateKey ? r[stateKey] : (r.state||r.STABBR||r.State||"")) || "";
      const state = toStateCode(rawState);
      return {
        name: String(name).trim(),
        state,
        tot: toNum(totKey ? r[totKey] : (r.tot_grad ?? r.GRAD_RATE)),
        nonres: toNum(nonresKey ? r[nonresKey] : r.nonres_grad),
        pell: toNum(pellKey ? r[pellKey] : r.pell_grad),
        urm: toNum(urmKey ? r[urmKey] : r.urm_grad)
      };
    }).filter(d => d.name && d.state);

    drawMap();
    render();
    window.addEventListener("resize", () => { drawMap(); render(); });
  }).catch(err => {
    console.error(err);
    d3.select(mount).append("div").style("color","#b91c1c").text("Failed to load map or data.");
  });

  function containerSize() {
    const w = Math.max(320, mount.clientWidth || mount.getBoundingClientRect().width || 980);
    const h = Math.round(w * 0.6);
    return { w, h };
  }
  function features() {
    return topojson.feature(topology, topology.objects.states).features;
  }
  function byState() {
    const out = {};
    for (const r of institutions) {
      if (Number.isFinite(r.tot) && r.tot >= benchmark) (out[r.state] ??= []).push(r);
    }
    for (const k of Object.keys(out)) out[k].sort((a,b) => (b.tot - a.tot) || a.name.localeCompare(b.name));
    return out;
  }

  function drawMap() {
    if (!topology) return;
    const { w, h } = containerSize();
    svg.attr("viewBox", `0 0 ${w} ${h}`);

    const f = { type: "FeatureCollection", features: features() };
    const projection = d3.geoAlbersUsa().fitSize([w, h], f);
    const path = d3.geoPath(projection);

    const sel = g.selectAll("path.state").data(f.features, d => d.id);
    sel.join(
      enter => enter.append("path")
        .attr("class","state")
        .attr("d", path)
        .attr("fill", "#E5E7EB")      // ALWAYS gray at draw time
        .attr("stroke", "#9CA3AF")
        .attr("stroke-width", 0.6)
        .style("pointer-events","all")
        .on("mousemove", (event, d) => {
          const code = STATE_NAME_TO_CODE[d.properties.name];
          const count = (byState()[code] || []).length;
          tooltip.style("display","block")
            .style("left", (event.clientX + 12) + "px")
            .style("top", (event.clientY + 12) + "px")
            .text(`${d.properties.name}: ${count} institution${count===1?"":"s"}`);
        })
        .on("mouseleave", () => tooltip.style("display","none"))
        .on("click", (event, d) => {
          const code = STATE_NAME_TO_CODE[d.properties.name] || null;
          // toggle selection
          selectedState = (selectedState === code) ? null : code;
          render();
        }),
      update => update.attr("d", path),
      exit => exit.remove()
    );
  }

  function render() {
    const counts = byState();

    // Color ONLY the selected state blue; all others stay gray.
    g.selectAll("path.state")
      .attr("fill", d => {
        const code = STATE_NAME_TO_CODE[d.properties.name];
        const active = selectedState && code === selectedState;
        return active ? "#2563EB" : "#E5E7EB";
      });

    // Summary
    const rows = selectedState ? (counts[selectedState] || []) : [];
    stateSummary.html("");
    if (selectedState) {
      const name = codeToName(selectedState);
      const wrap = stateSummary.append("div");
      wrap.text(`${name} — ${rows.length} institution${rows.length===1?"":"s"} at ${benchmark}%+ `);
      wrap.append("button").attr("class","clear-btn").text("(clear)").on("click", () => { selectedState = null; render(); });
    } else {
      stateSummary.style("font-weight", 400)
        .text("Select a state to see institutions with total six-year graduation rates at or above the chosen threshold.");
    }

    // Table (scrolls inside its own container; header sticks)
    tableWrap.html("");
    if (selectedState) {
      const scroller = tableWrap.append("div").attr("class","table-scroll");
      const table = scroller.append("table").attr("class","grad-table");
      const thead = table.append("thead").append("tr");
      ["Institution","Total","Non-resident","Pell","URM"].forEach((h,i)=> thead.append("th").attr("class", i===0?"":"num").text(h));

      const tbody = table.append("tbody");
      if (rows.length === 0) {
        tbody.append("tr").append("td")
          .attr("colspan",5)
          .attr("class","empty")
          .text(`No institutions meet the ${benchmark}% threshold in this state.`);
      } else {
        const tr = tbody.selectAll("tr").data(rows).join("tr");
        tr.append("td").text(d => d.name);
        tr.append("td").attr("class","num").html(d => `<strong>${fmtPct(d.tot)}</strong>`);
        tr.append("td").attr("class","num").text(d => fmtPct(d.nonres));
        tr.append("td").attr("class","num").text(d => fmtPct(d.pell));
        tr.append("td").attr("class","num").text(d => fmtPct(d.urm));
      }
    }
  }
})();
