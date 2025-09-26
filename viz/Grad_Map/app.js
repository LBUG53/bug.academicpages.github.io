/* UMD (no imports) version — expects these globals already loaded:
   React, ReactDOM, ReactSimpleMaps, Papa
   See the script tags list right below this code in my note.
*/
(() => {
  const { useEffect, useMemo, useState } = React;
  const { createRoot } = ReactDOM;
  const { ComposableMap, Geographies, Geography } = ReactSimpleMaps;

  const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

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

  function num(v){ if(v===null||v===undefined||v==="") return NaN; const n=typeof v==="number"?v:parseFloat(String(v)); return Number.isFinite(n)?n:NaN; }
  function toNum(v){ const n=num(v); return Number.isFinite(n)?n:null; }
  function fmtPct(v){ const n=num(v); return Number.isFinite(n)?`${Math.round(n)}%`:"—"; }
  function codeToName(code){ for(const [k,v] of Object.entries(STATE_NAME_TO_CODE)) if(v===code) return k; return code; }

  function App(){
    const [data,setData]=useState([]);
    const [threshold,setThreshold]=useState(70);
    const [selectedState,setSelectedState]=useState(null);
    const [hover,setHover]=useState(null); // {text,x,y}

    // Load CSV from same folder as this file
    useEffect(()=>{
      const url = "./ipeds_gradrate.csv";
      Papa.parse(url, {
        download: true, header: true, skipEmptyLines: true,
        complete: (res)=>{
          const rows=(res.data||[]).map(r=>({
            ...r,
            tot_grad: toNum(r.tot_grad),
            nonres_grad: toNum(r.nonres_grad),
            pell_grad: toNum(r.pell_grad),
            urm_grad: toNum(r.urm_grad),
          }));
          setData(rows);
        },
        error: ()=> setData([])
      });
    },[]);

    // Wire threshold buttons in the static HTML
    useEffect(()=>{
      const btns = Array.from(document.querySelectorAll(".threshold-btn"));
      const onClick = (b) => {
        const t = parseInt(b.getAttribute("data-threshold"),10);
        if (!Number.isFinite(t)) return;
        setThreshold(t);
        btns.forEach(x=>x.classList.toggle("active", x===b));
      };
      // initialize active state
      btns.forEach(b=>{
        const t = parseInt(b.getAttribute("data-threshold"),10);
        b.classList.toggle("active", t===threshold);
        b.__handler && b.removeEventListener("click", b.__handler);
        b.__handler = ()=>onClick(b);
        b.addEventListener("click", b.__handler);
      });
      return ()=> btns.forEach(b=>{
        if (b.__handler) b.removeEventListener("click", b.__handler);
      });
    },[threshold]);

    const byState = useMemo(()=>{
      const map={};
      for(const r of data){
        const code=STATE_NAME_TO_CODE[r.state] || r.STABBR || r.State || r.state_abbr;
        const g=typeof r.tot_grad==="number"?r.tot_grad:NaN;
        if(!code||Number.isNaN(g)) continue;
        if(g>=threshold){ (map[code]??=[]).push(r); }
      }
      for(const k of Object.keys(map)){
        map[k].sort((a,b)=>(num(b.tot_grad)-num(a.tot_grad)) ||
          String(a["institution name"]||a.INSTNM||a.name).localeCompare(String(b["institution name"]||b.INSTNM||b.name)));
      }
      return map;
    },[data,threshold]);

    const tableRows = selectedState ? (byState[selectedState]||[]) : [];

    return React.createElement(
      "div",
      null,

      // Map
      React.createElement(
        ComposableMap,
        { projection: "geoAlbersUsa", width: 980, height: 580, style: { width: "100%", height: "auto", background: "#fff" } },
        React.createElement(
          Geographies,
          { geography: GEO_URL },
          ({ geographies }) =>
            geographies.map((geo) => {
              const name = geo.properties.name;
              const code = STATE_NAME_TO_CODE[name];
              const count = (code && byState[code]) ? byState[code].length : 0;
              const isActive = selectedState === code;

              return React.createElement(Geography, {
                key: geo.rsmKey,
                geography: geo,
                onMouseMove: (evt) => {
                  const x = evt.clientX, y = evt.clientY;
                  setHover({ text: `${name}: ${count} institution${count===1?"":"s"}`, x, y });
                },
                onMouseLeave: () => setHover(null),
                onClick: () => setSelectedState(code || null),
                style: {
                  default: { fill: isActive ? "#2563EB" : "#E5E7EB", outline: "none", stroke: "#9CA3AF", strokeWidth: .6 },
                  hover: { fill: isActive ? "#1D4ED8" : "#D1D5DB", outline: "none", stroke: "#6B7280", strokeWidth: .8 },
                  pressed: { fill: "#1D4ED8", outline: "none" }
                }
              });
            })
        )
      ),

      // Hover tooltip
      hover && React.createElement("div", { className: "tooltip", style: { left: hover.x, top: hover.y } }, hover.text),

      // State summary
      React.createElement(
        "div",
        null,
        selectedState
          ? React.createElement(
              "div",
              { className: "state-summary" },
              `${codeToName(selectedState)} — ${tableRows.length} institution${tableRows.length===1?"":"s"} at ${threshold}%+ `,
              React.createElement("button", { className: "clear-btn", onClick: () => setSelectedState(null) }, "(clear)")
            )
          : React.createElement("div", { className: "state-summary", style: { fontWeight: 400 } },
              "Select a state to see institutions with total six-year graduation rates at or above the chosen threshold."
            )
      ),

      // Table
      selectedState &&
        React.createElement(
          "div",
          { className: "table-wrap" },
          React.createElement(
            "table",
            null,
            React.createElement(
              "thead",
              null,
              React.createElement(
                "tr",
                null,
                React.createElement("th", null, "Institution"),
                React.createElement("th", { className: "num" }, "Total"),
                React.createElement("th", { className: "num" }, "Non-resident"),
                React.createElement("th", { className: "num" }, "Pell"),
                React.createElement("th", { className: "num" }, "URM")
              )
            ),
            React.createElement(
              "tbody",
              null,
              tableRows.length > 0
                ? tableRows.map((r, i) =>
                    React.createElement(
                      "tr",
                      { key: i },
                      React.createElement("td", null, r["institution name"] || r.INSTNM || r.name),
                      React.createElement("td", { className: "num" }, React.createElement("strong", null, fmtPct(r.tot_grad))),
                      React.createElement("td", { className: "num" }, fmtPct(r.nonres_grad)),
                      React.createElement("td", { className: "num" }, fmtPct(r.pell_grad)),
                      React.createElement("td", { className: "num" }, fmtPct(r.urm_grad))
                    )
                  )
                : React.createElement(
                    "tr",
                    null,
                    React.createElement("td", { colSpan: 5, style: { textAlign: "center", color: "#6B7280", padding: "1rem" } },
                      `No institutions meet the ${threshold}% threshold in this state.`
                    )
                  )
            )
          )
        )
    );
  }

  const mount = document.getElementById("us-gradrate-map");
  if (!mount) {
    console.error("Mount element #us-gradrate-map not found.");
    return;
  }
  const root = createRoot(mount);
  root.render(React.createElement(App));
})();
