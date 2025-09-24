// All imports from ONE CDN (Skypack) so React & ReactDOM share the same instance.
import React, { useEffect, useMemo, useState } from "https://cdn.skypack.dev/react@18";
import { createRoot } from "https://cdn.skypack.dev/react-dom@18/client";
import { ComposableMap, Geographies, Geography } from "https://cdn.skypack.dev/react-simple-maps@3";
import Papa from "https://cdn.skypack.dev/papaparse@5.4.1";

const e = React.createElement;
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
    const url = new URL("./ipeds_gradrate.csv", import.meta.url).toString();
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
      }
    });
  },[]);

  // Wire threshold buttons in the static HTML
  useEffect(()=>{
    const btns = Array.from(document.querySelectorAll(".threshold-btn"));
    for(const b of btns){
      const setActive = ()=>{
        btns.forEach(x=>x.classList.remove("active"));
        b.classList.add("active");
      };
      const t = parseInt(b.getAttribute("data-threshold"));
      if(t===threshold) setActive();
      b.addEventListener("click", ()=>{ setThreshold(t); setActive(); });
    }
  },[threshold]);

  const byState = useMemo(()=>{
    const map={};
    for(const r of data){
      const code=STATE_NAME_TO_CODE[r.state];
      const g=typeof r.tot_grad==="number"?r.tot_grad:NaN;
      if(!code||Number.isNaN(g)) continue;
      if(g>=threshold){ (map[code]??=[]).push(r); }
    }
    for(const k of Object.keys(map)){
      map[k].sort((a,b)=>(num(b.tot_grad)-num(a.tot_grad)) || String(a["institution name"]).localeCompare(String(b["institution name"])));
    }
    return map;
  },[data,threshold]);

  const tableRows = selectedState ? (byState[selectedState]||[]) : [];

  return e(
    "div",
    null,

    // Map
    e(
      ComposableMap,
      { projection: "geoAlbersUsa", width: 980, height: 580, style: { width: "100%", height: "auto", background: "#fff" } },
      e(
        Geographies,
        { geography: GEO_URL },
        ({ geographies }) =>
          geographies.map((geo) => {
            const name = geo.properties.name;
            const code = STATE_NAME_TO_CODE[name];
            const count = (code && byState[code]) ? byState[code].length : 0;
            const isActive = selectedState === code;

            return e(Geography, {
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
    hover && e("div", { className: "tooltip", style: { left: hover.x, top: hover.y } }, hover.text),

    // State summary
    e(
      "div",
      null,
      selectedState
        ? e(
            "div",
            { className: "state-summary" },
            `${codeToName(selectedState)} — ${tableRows.length} institution${tableRows.length===1?"":"s"} at ${threshold}%+ `,
            e("button", { className: "clear-btn", onClick: () => setSelectedState(null) }, "(clear)")
          )
        : e("div", { className: "state-summary", style: { fontWeight: 400 } },
            "Select a state to see institutions with total six-year graduation rates at or above the chosen threshold."
          )
    ),

    // Table
    selectedState &&
      e(
        "div",
        { className: "table-wrap" },
        e(
          "table",
          null,
          e(
            "thead",
            null,
            e(
              "tr",
              null,
              e("th", null, "Institution"),
              e("th", { className: "num" }, "Total"),
              e("th", { className: "num" }, "Non-resident"),
              e("th", { className: "num" }, "Pell"),
              e("th", { className: "num" }, "URM")
            )
          ),
          e(
            "tbody",
            null,
            tableRows.length > 0
              ? tableRows.map((r, i) =>
                  e(
                    "tr",
                    { key: i },
                    e("td", null, r["institution name"]),
                    e("td", { className: "num" }, e("strong", null, fmtPct(r.tot_grad))),
                    e("td", { className: "num" }, fmtPct(r.nonres_grad)),
                    e("td", { className: "num" }, fmtPct(r.pell_grad)),
                    e("td", { className: "num" }, fmtPct(r.urm_grad))
                  )
                )
              : e(
                  "tr",
                  null,
                  e("td", { colSpan: 5, style: { textAlign: "center", color: "#6B7280", padding: "1rem" } },
                    `No institutions meet the ${threshold}% threshold in this state.`
                  )
                )
          )
        )
      )
  );
}

const mount = document.getElementById("us-gradrate-map");
const root = createRoot(mount);
root.render(e(App));
