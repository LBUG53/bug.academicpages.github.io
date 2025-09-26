/* ====== US Grad Map (vanilla D3 + topojson) ====== */
(() => {
  const mount = document.getElementById("us-gradrate-map");
  if (!mount) return console.error("Missing #us-gradrate-map");

  // Config
  const WIDTH = Math.min(980, mount.clientWidth || 980);
  const HEIGHT = Math.round(WIDTH * 0.6);
  const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
  const CSV_URL = "./ipeds_gradrate.csv"; // same folder as this file

  // State
  let benchmark = 70;
  let selectedState = null;
  let institutions = []; // { name, state, tot, nonres, pell, urm }

  // Helpers
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
  const num = (v) => {
    if (v === null || v === undefined || v === "") return NaN;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[% ,]/g,""));
    return Number.isFinite(n) ? n : NaN;
  };
  const fmtPct = (v) => Number.isFinite(v) ? `${Math.round(v)}%` : "—";

  // Build containers
  const svg = d3.select(mount).append("svg")
    .attr("width", "100%")
    .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
    .style("background", "#fff");

  const g = svg.append("g");
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("display", "none");

  const tableWrap = d3.select(mount.parentElement).append("div").attr("class","table-wrap");
  const stateSummary = d3.select(mount.parentElement).insert("div", ":scope > .table-wrap")
    .attr("class", "state-summary");

  // Wire buttons
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

  // Load data
  Promise.all([
    fetch(GEO_URL).then(r=>r.json()),
    new Promise((resolve) => {
      Papa.parse(CSV_URL, {
        download: true, header: true, skipEmptyLines: true,
        complete: (res) => resolve(res.data || [])
      });
    })
  ]).then(([topology, rows]) => {
    // Normalize institutions
    institutions = rows.map(r => {
      const name = r["institution name"] || r.INSTNM || r.name || r.college || "";
      const state = r.state || r.STABBR || r.State || "";
      return {
        name: String(name).trim(),
        state: String(state).trim().toUpperCase(),
        tot: num(r.tot_grad ?? r.GRAD_RATE ?? r.graduation_rate ?? r.grad_rate ?? r.C150_4_POOLED ?? r.C150_L4_POOLED),
        nonres: num(r.nonres_grad),
        pell: num(r.pell_grad),
        urm: num(r.urm_grad)
      };
    }).filter(d => d.name && d.state);

    // Draw map
    const states = topojson.feature(topology, topology.objects.states);
    const projection = d3.geoAlbersUsa().fitSize([WIDTH, HEIGHT], states);
    const path = d3.geoPath(projection);

    g.selectAll("path.state")
      .data(states.features)
      .join("path")
      .attr("class","state")
      .attr("d", path)
      .attr("fill", d => {
        const code = STATE_NAME_TO_CODE[d.properties.name];
        const count = byState()[code]?.length || 0;
        return count > 0 ? "#2563EB" : "#E5E7EB";
      })
      .attr("stroke", "#9CA3AF")
      .attr("stroke-width", 0.6)
      .on("mousemove", (event, d) => {
        const code = STATE_NAME_TO_CODE[d.properties.name];
        const count = byState()[code]?.length || 0;
        tooltip.style("display","block")
          .style("left", (event.clientX + 12) + "px")
          .style("top", (event.clientY + 12) + "px")
          .text(`${d.properties.name}: ${count} institution${count===1?"":"s"}`);
      })
      .on("mouseleave", () => tooltip.style("display","none"))
      .on("click", (event, d) => {
        selectedState = STATE_NAME_TO_CODE[d.properties.name] || null;
        render();
      });

    render();
  }).catch(err => {
    console.error(err);
    d3.select(mount).append("div").style("color","#b91c1c").text("Failed to load map or data.");
  });

  // Derived
  function byState() {
    const out = {};
    for (const r of institutions) {
      if (Number.isFinite(r.tot) && r.tot >= benchmark) {
        (out[r.state] ??= []).push(r);
      }
    }
    for (const k of Object.keys(out)) {
      out[k].sort((a,b) => (b.tot - a.tot) || a.name.localeCompare(b.name));
    }
    return out;
  }

  // Render table + summary + state fill updates
  function render() {
    // update fills based on current threshold
    g.selectAll("path.state").attr("fill", d => {
      const code = STATE_NAME_TO_CODE[d.properties.name];
      const count = byState()[code]?.length || 0;
      const active = selectedState && code === selectedState;
      return active ? "#1D4ED8" : (count > 0 ? "#2563EB" : "#E5E7EB");
    });

    const rows = selectedState ? (byState()[selectedState] || []) : [];

    // summary
    stateSummary.html("");
    if (selectedState) {
      const name = codeToName(selectedState);
      const wrap = stateSummary.append("div");
      wrap.text(`${name} — ${rows.length} institution${rows.length===1?"":"s"} at ${benchmark}%+ `);
      wrap.append("button")
        .attr("class","clear-btn")
        .text("(clear)")
        .on("click", () => { selectedState = null; render(); });
    } else {
      stateSummary
        .style("font-weight", 400)
        .text("Select a state to see institutions with total six-year graduation rates at or above the chosen threshold.");
    }

    // table
    tableWrap.html("");
    if (selectedState) {
      const table = tableWrap.append("table");
      const thead = table.append("thead").append("tr");
      ["Institution","Total","Non-resident","Pell","URM"].forEach((h,i)=>{
        thead.append("th").attr("class", i===0?"":"num").text(h);
      });
      const tbody = table.append("tbody");
      if (rows.length === 0) {
        const tr = tbody.append("tr");
        tr.append("td")
          .attr("colspan",5)
          .style("text-align","center")
          .style("color","#6B7280")
          .style("padding","1rem")
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
