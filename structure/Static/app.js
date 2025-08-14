// ===== 1) toggleTheme() =====
function toggleTheme(){
  document.documentElement.classList.toggle("light");
}

// ===== 2) toggleManualEntry() =====
function toggleManualEntry(){
  const box = document.getElementById("manualBox");
  box.style.display = (box.style.display === "block") ? "none" : "block";
}

// Helpers
function getAxisMode(){
  return document.querySelector('input[name="axisMode"]:checked').value; // "columns" | "rows"
}
function setDataState(text){
  document.getElementById("dataState").textContent = text;
}
function getSelectedY(){
  return Array.from(document.querySelectorAll("#columnsBox input[type=checkbox]:checked")).map(x=>x.value);
}
function setHeaders(headers){
  // X selector
  const xSel = document.getElementById("xSelector");
  xSel.innerHTML = "";
  headers.forEach(h=>{
    const opt = document.createElement("option");
    opt.value = h; opt.textContent = h;
    xSel.appendChild(opt);
  });
  // Y checkboxes
  populateColumnCheckboxes(headers);
}

// ===== 3) trySampleData() =====
async function trySampleData(){
  const r = await fetch("/api/sample",{method:"POST"});
  const j = await r.json();
  if(!j.ok){ alert(j.error||"Failed to load sample"); return; }
  setHeaders(j.headers);
  setDataState("Sample data ready");
}

// ===== 4) handleFileUpload() =====
async function handleFileUpload(){
  const fi = document.getElementById("fileInput");
  if(!fi.files.length){ alert("Choose a CSV/XLSX file first."); return; }
  const fd = new FormData();
  fd.append("file", fi.files[0]);
  const r = await fetch("/api/upload",{method:"POST", body: fd});
  const j = await r.json();
  if(!j.ok){ alert(j.error||"Upload failed"); return; }
  setHeaders(j.headers);
  setDataState("File loaded");
}

// Manual submit helper
async function submitManual(){
  const text = document.getElementById("manualText").value.trim();
  if(!text){ alert("Paste CSV text first."); return; }
  const r = await fetch("/api/manual", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ csv_text: text })
  });
  const j = await r.json();
  if(!j.ok){ alert(j.error||"Manual load failed"); return; }
  setHeaders(j.headers);
  setDataState("Manual data loaded");
}

// ===== 5) populateColumnCheckboxes() =====
function populateColumnCheckboxes(headers){
  const box = document.getElementById("columnsBox");
  box.innerHTML = "";
  headers.forEach(h=>{
    const id = "col_" + h.replace(/\W+/g,"_");
    const lbl = document.createElement("label");
    lbl.innerHTML = `<input type="checkbox" id="${id}" value="${h}"><span>${h}</span>`;
    box.appendChild(lbl);
  });
}

// ===== 6) generatePlot() =====
async function generatePlot(){
  const axisMode = getAxisMode();
  const x = document.getElementById("xSelector").value || null;
  const y = getSelectedY();
  if(!x || !y.length){ alert("Select X and at least one Y."); return; }

  const r = await fetch("/api/plot",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ axisMode, x, y })
  });
  const j = await r.json();
  if(!j.ok){ alert(j.error||"Plot failed"); return; }

  const plotBox = document.getElementById("plotBox");
  plotBox.innerHTML = "";
  const img = new Image();
  img.src = "data:image/png;base64," + j.image_base64;
  plotBox.appendChild(img);
}

// ===== 7) runAnalysis() =====
async function runAnalysis(){
  const axisMode = getAxisMode();
  const x = document.getElementById("xSelector").value || null;
  const y = getSelectedY();
  if(!y.length){ alert("Select at least one Y for analysis."); return; }

  const rangeStat = document.getElementById("rangeStat").value;
  const rangeMin = parseFloat(document.getElementById("rangeMin").value || "0");
  const rangeMax = parseFloat(document.getElementById("rangeMax").value || "100");
  const overlay = document.getElementById("overlayToggle").checked;

  const r = await fetch("/api/stats",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ axisMode, y, rangeStat, rangeMin, rangeMax, overlay, x })
  });
  const j = await r.json();
  const box = document.getElementById("statsBox");

  if(!j.ok){ box.innerHTML = `<span class="muted">${j.error||"Failed"}</span>`; return; }

  // Render stats table
  box.innerHTML = renderStatsTable(j.stats);

  // Update plot with overlay image if returned
  if(j.overlay_image_base64){
    const plotBox = document.getElementById("plotBox");
    plotBox.innerHTML = "";
    const img = new Image();
    img.src = "data:image/png;base64," + j.overlay_image_base64;
    plotBox.appendChild(img);
  }
}

// ===== 8) downloadPlot() =====
function downloadPlot(){
  const name = (document.getElementById("filenameInput").value || "plot_download").trim();
  const url = `/api/plot/download?format=bmp&filename=${encodeURIComponent(name)}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.bmp`; // browser will respect Content-Disposition too
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ===== Render stats table helper =====
function renderStatsTable(stats){
  // stats = desc.T with 'median' added; shape: {col: {metric: value}}
  const cols = Object.keys(stats);
  if(cols.length === 0) return "<div class='muted'>No stats.</div>";
  const metrics = Object.keys(stats[cols[0]]);

  let html = `<table class="stat-table"><thead><tr><th>Series</th>`;
  metrics.forEach(m => html += `<th>${m}</th>`);
  html += `</tr></thead><tbody>`;

  cols.forEach(c=>{
    html += `<tr><td><b>${c}</b></td>`;
    metrics.forEach(m=>{
      let v = stats[c][m];
      if(typeof v === "number") v = Number.isInteger(v) ? v : v.toFixed(3);
      html += `<td>${v ?? ""}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  return html;
}

// Update X selector list when axis mode changes (it uses headers; for rows you'll typically set X from index labels)
document.querySelectorAll('input[name="axisMode"]').forEach(r=>{
  r.addEventListener("change", ()=>{
    // no server call; user should re-select valid X if needed
  });
});
