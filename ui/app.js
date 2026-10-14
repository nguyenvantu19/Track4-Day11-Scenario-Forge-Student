/* Scenario Forge local dashboard. Simulation is provided by the unchanged SimCore. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const PATHS = {
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    layers:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
    chart:'<path d="M4 3v17h17M8 15l4-5 4 2 5-7"/>',
    file:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M8 13h8M8 17h6"/>',
    route:'<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 7v6a4 4 0 0 0 4 4h4a4 4 0 0 0 0-8h-2m6 8v-4"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 3M12 17h.01"/>',
    'arrow-up-right':'<path d="M6 18 18 6M6 6h12v12"/>',
    'arrow-right':'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    refresh:'<path d="M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
    play:'<path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none"/>',
    pause:'<path d="M7 5v14M17 5v14" stroke-width="4"/>',
    restart:'<path d="M5 6v6h6M5 12a7 7 0 1 1 2 5"/>',
    skip:'<path d="m4 5 10 7-10 7ZM18 5v14"/>',
    shield:'<path d="m12 3 8 3v5c0 5-5 8-8 10-3-2-8-5-8-10V6l8-3Zm-4 9 3 3 5-6"/>',
    search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V4H4v11h4"/>',
    alert:'<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3h.01"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    car:'<path d="m5 9 2-5h10l2 5M4 9h16v10H4V9Zm0 7h16M7 12h1m8 0h1M6 19v2m12-2v2"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };
  function icon(name) { return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] || PATHS.grid}</svg>`; }
  function icons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  const number = (n, digits = 0) => Number.isFinite(n) ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(n) : '—';
  const pct = (n, digits = 2) => Number.isFinite(n) ? number(n * 100, digits) + '%' : '—';
  const scientific = n => Number.isFinite(n) ? n.toExponential(2).replace('.', ',') : '—';
  const LABELS = {bus_bypass:'Lách qua xe buýt',crosswalk_block:'Chặn lối người đi bộ',cut_in:'Cắt làn',rear_ended:'Va chạm từ phía sau',replay:'Phát lại log',mine:'Người băng ngang'};
  const DESCRIPTIONS = {
    bus_bypass:'Xe hàng xóm lách qua xe buýt đang dừng. Một khoảng trống nhỏ có thể trở thành xung đột.',
    crosswalk_block:'Người đi bộ bước ra sau xe buýt. Planner phanh muộn và dừng chắn lối qua đường.',
    replay:'Giao thông giữ nguyên quỹ đạo trong log, dù planner phản ứng khác người lái ban đầu.',
    mine:'Người đi nhanh băng ngang ngoài vạch. Phép thử mới cho khả năng khái quát của planner.'
  };
  const VIEW_NAMES = {overview:'Tổng quan',scenarios:'Thư viện kịch bản',evaluation:'Đánh giá planner',report:'Báo cáo bài lab'};
  const HEADINGS = {
    overview:['Thử nghiệm hôm nay','Khám phá những tình huống hiếm. Hiểu rõ hơn cách planner phản ứng.'],
    scenarios:['Mỗi kịch bản, một câu chuyện','Những tình huống được tìm ra từ CEM, log phát lại và phép thử tự thiết kế.'],
    evaluation:['Đo lường, rồi mới kết luận','So sánh trên dữ liệu TEST. Giữ cả các cận trên và giới hạn của phép thử.'],
    report:['Từ dữ liệu đến bài học','Chín câu trả lời, bằng chứng thực nghiệm và những điều còn chưa biết.']
  };
  const state = {data:{},runs:[],current:null,policy:'baseline',R:null,ghost:null,t:0,playing:false,speed:1,view:'overview',filter:'all',search:'',raf:0,last:0,reportLoaded:false};
  const S = window.SimCore;
  let toastTimer;
  function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 3300); }
  function metric(label, value, foot, symbol) { return `<div class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon(symbol)}</span></div><div class="metric-value">${value}</div><div class="metric-foot">${foot}</div></div>`; }

  async function loadData(announce = false) {
    const refresh = $('refresh-button'); refresh.disabled = true;
    const names = ['meta','world','viewer','mc','hunt','estimate','fix','mine','replay'];
    const results = await Promise.allSettled(names.map(async name => {
      const response = await fetch(`../evidence/${name}.json`, {cache:'no-store'});
      if (!response.ok) throw new Error(name);
      return response.json();
    }));
    const missing = [];
    results.forEach((r,i) => { if (r.status === 'fulfilled') state.data[names[i]] = r.value; else {state.data[names[i]] = null; missing.push(names[i]);} });
    const viewer = state.data.viewer;
    state.runs = viewer?.format === 'avsim-viewer/1' && Array.isArray(viewer.runs) ? viewer.runs : [];
    $('nav-count').textContent = state.runs.length;
    const meta = state.data.meta;
    if (meta?._run?.mssv) {
      $('profile-id').textContent = meta._run.mssv;
      $('download-package').href = `../Lab11_NguyenVanTu_${encodeURIComponent(meta._run.mssv)}.zip`;
    }
    $('town-title').textContent = meta?._run?.town || '—';
    $('load-error').hidden = missing.length === 0 && state.runs.length > 0;
    if (!$('load-error').hidden) $('load-error').textContent = `Chưa có đủ kết quả (${missing.join(', ') || 'kịch bản'}). Chạy run_lab.ps1 all trong thư mục dự án, rồi bấm Cập nhật dữ liệu.`;
    $('loading').hidden = true;
    renderMetrics(); renderScenarios(); renderEvaluation(); renderDiscovery();
    $('scenario-select').innerHTML = state.runs.map(r => `<option value="${esc(r.id)}">${esc(r.id)} · ${esc(LABELS[r.label] || r.label)}</option>`).join('');
    $('scenario-select').disabled = !state.runs.length;
    const oldId = state.current?.id;
    if (state.runs.length) setRun(state.runs.find(r => r.id === oldId) || state.runs[0]);
    state.reportLoaded = false;
    applyRoute(); refresh.disabled = false;
    if (announce) toast('Đã cập nhật dữ liệu và mô phỏng.');
  }

  function renderMetrics() {
    const {mc,meta,fix} = state.data;
    const completed = ['world','replay','mc','hunt','estimate','fix','mine','export'].filter(name => meta?.steps?.[name] && !meta.steps[name].quick && state.data[name==='export'?'viewer':name]).length;
    $('overview-metrics').innerHTML = [
      metric('Kịch bản tự nhiên', number(mc?.n), '<span class="pill">Monte Carlo</span>Mẫu từ phân phối thị trấn', 'layers'),
      metric('Thất bại được ghi nhận', number(mc?.crashes), `Trong ${number(mc?.n)} lần chạy tự nhiên`, 'alert'),
      metric('Xác suất thất bại · MC', pct(mc?.p), `Wilson 95%: ${pct(mc?.lo)} – ${pct(mc?.hi)}`, 'chart'),
      metric('Tiến độ bài lab', `${completed}<span class="unit">/ 8 bước</span>`, `<span class="pill">${meta?._run?.quick ? 'Chạy thử' : 'Ngân sách đầy đủ'}</span>${state.runs.length} cảnh đã lưu`, 'check')
    ].join('');
    const b = fix?.baseline_test, c = fix?.chosen_test;
    const loss = b && c ? (1 - c.progress / b.progress) : NaN;
    $('evaluation-metrics').innerHTML = [
      metric('Point estimate · gốc', scientific(b?.fail), 'Tỷ lệ thất bại trên TEST', 'car'),
      metric('Point estimate · bản sửa', scientific(c?.fail), 'Các kiểu chưa thấy vẫn có cận trên', 'shield'),
      metric('Quãng đường · bản sửa', `${number(c?.progress,1)}<span class="unit">m</span>`, `Giảm ${pct(loss,3)} so với gốc`, 'route'),
      metric('Cận trên · bản sửa', pct(c?.fail_hi,3), 'Gồm cận cho kiểu chưa ghi nhận hit', 'chart')
    ].join('');
    $('data-provenance').textContent = meta?._run?.quick ? 'Dữ liệu chạy thử · chưa dùng để nộp' : 'Ngân sách đầy đủ · Kết quả có thể tái lập';
  }

  function miniMap(kind) {
    const ped = kind === 'crosswalk_block' || kind === 'mine';
    return `<svg viewBox="0 0 180 100" aria-hidden="true"><rect width="180" height="100" fill="#ecf1e8"/><g transform="rotate(-22 90 50)"><path d="M-20 28H210V76H-20Z" fill="#d0d9cf"/><path d="M-20 51h230" stroke="#f7f9ef" stroke-width="2" stroke-dasharray="10 8"/><path d="M-20 76h230M-20 28h230" stroke="#c0cfbd" stroke-width="3"/>${ped ? '<path d="M120 29v46m6-46v46m6-46v46m6-46v46" stroke="#fff" stroke-width="3"/>' : '<rect x="100" y="57" width="40" height="12" rx="3" fill="#8da491"/>'}<rect x="65" y="35" width="26" height="13" rx="3" fill="#4f9a73"/><rect x="69" y="37" width="8" height="9" rx="2" fill="#d1e5cc" opacity=".65"/><rect x="42" y="37" width="18" height="10" rx="2" fill="#b5c7ae"/>${ped ? '<circle cx="129" cy="40" r="3" fill="#b49057"/>' : '<rect x="93" y="41" width="24" height="12" rx="3" fill="#b7a17a"/>'}</g><circle cx="28" cy="13" r="9" fill="#bccfb0"/><circle cx="149" cy="87" r="12" fill="#bccfb0"/></svg>`;
  }
  function renderDiscovery() {
    $('discover-grid').innerHTML = ['bus_bypass','crosswalk_block','mine'].map(kind => {
      const run = state.runs.find(r => r.label === kind);
      const count = state.runs.filter(r => r.label === kind).length;
      return `<button class="discover-card" ${run ? `data-run="${esc(run.id)}"` : 'disabled'}><div class="mini-map">${miniMap(kind)}</div><div><h3>${LABELS[kind]}</h3><p>${kind === 'bus_bypass' ? 'Khi khe nhỏ trở thành rủi ro' : kind === 'mine' ? 'Rắc rối ngoài thế giới đã biết' : 'Dừng xe vẫn có thể là thất bại'}</p><span class="category-tag">${count} kịch bản · ${kind === 'mine' ? 'Tự thiết kế' : 'Tìm kiếm CEM'}</span></div>${icon('arrow-right')}</button>`;
    }).join('');
  }
  function renderScenarios() {
    const filters = [['all','Tất cả'],...Object.keys(LABELS).filter(m => state.runs.some(r => r.label === m)).map(m => [m,LABELS[m]])];
    $('scenario-filters').innerHTML = filters.map(([key,label]) => `<button class="filter-tab ${state.filter === key ? 'active' : ''}" data-filter="${key}" aria-pressed="${state.filter === key}">${esc(label)}</button>`).join('');
    const query = state.search.toLocaleLowerCase('vi');
    const visible = state.runs.filter(r => (state.filter === 'all' || r.label === state.filter) && `${r.id} ${LABELS[r.label] || r.label}`.toLocaleLowerCase('vi').includes(query));
    $('scenario-grid').innerHTML = visible.map(r => `<article class="card scenario-tile"><div class="tile-heading"><span class="eyebrow">${esc(r.id)}</span><span class="tag ${r.label === 'mine' ? 'mint' : 'neutral'}">${r.label === 'mine' ? 'Tự thiết kế' : r.label === 'replay' ? 'Log phát lại' : 'CEM'}</span></div><div class="mini-map">${miniMap(r.label)}</div><h3>${esc(LABELS[r.label] || r.label)}</h3><p>${esc(DESCRIPTIONS[r.label] || '')}</p><div class="tile-properties"><span>μ = ${number(r.params.mu,1)}</span><span>${r.params.mu < .65 ? 'Đường ướt' : 'Đường khô'}</span><span>${r.others === 'replay' ? 'Phát lại' : 'Phản ứng'}</span></div><button class="button secondary" data-run="${esc(r.id)}">Mở kịch bản${icon('arrow-right')}</button></article>`).join('');
    $('scenario-empty').hidden = visible.length > 0;
  }
  function compareRow(label, value, maximum, chosen, detail) {
    const width = maximum > 0 ? Math.max(.4,Math.min(100,value / maximum * 100)) : 0;
    return `<div class="compare-row"><div class="compare-label"><span>${label}</span><strong>${pct(value,3)}</strong></div><div class="compare-bar"><div class="compare-fill ${chosen ? 'chosen' : ''}" style="width:${width}%"></div></div><div class="compare-detail">${detail}</div></div>`;
  }
  function renderEvaluation() {
    const {fix,mine,estimate} = state.data;
    $('chosen-policy-label').textContent = fix?.chosen?.policy ? Object.entries(fix.chosen.policy).map(([k,v]) => `${k} = ${number(v,2)}`).join(' · ') : 'Chưa có policy';
    const b=fix?.baseline_test, c=fix?.chosen_test;
    $('policy-comparison').innerHTML = b && c ? compareRow('Policy gốc',b.fail,b.fail,false,`Cận trên: ${pct(b.fail_hi,3)} · Quãng đường: ${number(b.progress,1)} m`) + compareRow('Bản sửa',c.fail,b.fail,true,`Cận trên: ${pct(c.fail_hi,3)} · Quãng đường: ${number(c.progress,1)} m`) : '<p class="card-copy">Chưa có kết quả TEST.</p>';
    const mb=mine?.baseline, mc=mine?.chosen;
    const maximum=Math.max(mb?.p || 0, mc?.p || 0);
    $('hazard-comparison').innerHTML = mb && mc ? compareRow('Policy gốc',mb.p,maximum,false,`${mb.avoidable}/${mb.n} lỗi tránh được · Wilson: ${pct(mb.lo)}–${pct(mb.hi)}`) + compareRow('Bản sửa',mc.p,maximum,true,`${mc.avoidable}/${mc.n} lỗi tránh được · Wilson: ${pct(mc.lo)}–${pct(mc.hi)}`) : '<p class="card-copy">Chưa có phép quét rắc rối mới.</p>';
    $('is-table').innerHTML = estimate?.seeds ? `<table><thead><tr><th>SEED</th><th>KIỂU THẤT BẠI</th><th>ƯỚC LƯỢNG / CẬN</th><th>HITS</th><th>ESS</th><th>TOP SHARE</th></tr></thead><tbody>${estimate.seeds.flatMap(seed => Object.entries(seed.per).map(([mode,e]) => `<tr><td>${seed.seed}</td><td>${esc(LABELS[mode] || mode)}</td><td>${e.hits ? scientific(e.p) : `Chưa có hit · cận ${pct(e.upper_zero_hits)}`}</td><td>${e.hits}</td><td>${number(e.ess,1)}</td><td>${pct(e.top_share,1)}</td></tr>`)).join('')}</tbody></table>` : '<p class="card-copy">Chưa có ước lượng IS.</p>';
  }

  function egoEvent(R) { return R?.events.find(e => e.a === 'ego' || e.b === 'ego'); }
  function stop() { state.playing=false; cancelAnimationFrame(state.raf); syncPlay(); }
  function syncPlay() { $('play-button').innerHTML=icon(state.playing?'pause':'play'); $('play-button').setAttribute('aria-label',state.playing?'Dừng mô phỏng':'Phát mô phỏng'); $('play-button').setAttribute('aria-pressed',String(state.playing)); }
  function setRun(run, preserveTime = false) {
    stop(); state.current=run;
    const chosen=state.data.fix?.chosen?.policy || state.data.viewer?.policy;
    document.querySelector('[data-policy="chosen"]').disabled=!chosen;
    if (!chosen) state.policy='baseline';
    try {
      const log=run.others==='replay'?S.rollout({ego:'human',others:'reactive',params:run.params,hazards:run.hazards}):null;
      const options={ego:'planner',others:run.others || 'reactive',params:run.params,hazards:run.hazards,log};
      state.R=S.rollout({...options,policy:state.policy==='baseline'?S.POLICY:{...S.POLICY,...chosen}});
      state.ghost=S.rollout({...options,policy:state.policy==='baseline'?{...S.POLICY,...chosen}:S.POLICY});
    } catch (error) { state.R=null;state.ghost=null;toast('Không thể mô phỏng kịch bản này.');console.error(error);return; }
    if (!preserveTime) state.t=Math.max(0,(egoEvent(state.R)?.t ?? 3.5)-3.5);
    state.t=Math.min(S.T_END,state.t);
    $('scenario-select').value=run.id;
    $('scenario-id').textContent=run.id;
    $('scenario-name').textContent=LABELS[run.label] || run.label;
    document.getElementById('viewer-link').href=`viewer.html?run=${encodeURIComponent(run.id)}&policy=${state.policy}`;
    $('scenario-description').textContent=DESCRIPTIONS[run.label] || '';
    $('scene-mode').textContent=`${run.params.mu < .65?'Đường ướt':'Đường khô'} · μ ${number(run.params.mu,1)}`;
    $('town-title').nextElementSibling.textContent=run.others==='replay'?'Phát lại log':'Phản ứng';
    const props=[['Mặt đường',run.params.mu < .65?'Ướt':'Khô'],['Khe nhập làn',`${number(run.params.cutGap,1)} m`],['Người đi bộ quan sát',run.params.pedLook?'Có':'Không'],['Policy xe chính',state.policy==='baseline'?'Policy gốc':'Bản sửa']];
    $('scenario-properties').innerHTML=props.map(([a,b])=>`<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('');
    document.querySelectorAll('[data-policy]').forEach(el=>{const active=el.dataset.policy===state.policy;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
    const event=egoEvent(state.R);
    $('outcome-box').classList.toggle('safe',!event);
    $('outcome-box').innerHTML=event?`${icon('alert')}<div><strong>${event.kind==='block'?'Chặn lối người đi bộ':'Va chạm được ghi nhận'}</strong><span>Tại ${number(event.t,2)} s · ${esc(event.a==='ego'?event.b:event.a)}</span></div>`:`${icon('shield')}<div><strong>Không có thất bại ego</strong><span>Trong 24 giây của kịch bản này</span></div>`;
    $('failure-button').disabled=!event;
    updateFrame();
  }
  function pickRun(id) {
    const run=state.runs.find(r=>r.id===id);
    if(!run) return;
    setRun(run); location.hash=`overview?run=${encodeURIComponent(id)}&policy=${state.policy}`; setView('overview');
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function setView(view) {
    state.view=view in VIEW_NAMES?view:'overview';
    document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==`view-${state.view}`);
    document.querySelectorAll('[data-view]').forEach(el=>{const active=el.dataset.view===state.view;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
    $('breadcrumb-view').textContent=VIEW_NAMES[state.view];
    const [title,subtitle]=HEADINGS[state.view];
    $('page-title').innerHTML=`${esc(title)}<span class="title-dot">.</span>`;
    $('page-subtitle').textContent=subtitle;
    if(state.view!=='overview')stop();
    if(state.view==='overview')requestAnimationFrame(updateFrame);
    if(state.view==='report'&&!state.reportLoaded)loadReport();
  }
  function applyRoute() {
    const [view,query]=location.hash.slice(1).split('?');
    const params=new URLSearchParams(query || ''),runId=params.get('run'),policy=params.get('policy');
    const changed=['baseline','chosen'].includes(policy)&&policy!==state.policy;
    if(changed)state.policy=policy;
    const run=state.runs.find(r=>r.id===runId) || state.current;
    if(run&&(changed||run.id!==state.current?.id))setRun(run,changed&&run.id===state.current?.id);
    setView(view || 'overview');
  }
  function play() {
    if(!state.R)return;
    if(state.playing){stop();return;}
    if(state.t>=S.T_END)state.t=0;
    state.playing=true;state.last=performance.now();syncPlay();state.raf=requestAnimationFrame(tick);
  }
  function tick(now) {
    if(!state.playing)return;
    const dt=Math.min(.25,(now-state.last)/1000);state.last=now;
    state.t=Math.min(S.T_END,state.t+dt*state.speed);updateFrame();
    if(state.t>=S.T_END){stop();return;}
    state.raf=requestAnimationFrame(tick);
  }
  function pose(R,index,t=state.t) {
    const frame=Math.min(S.NF-1,Math.max(0,Math.floor(t/S.DT)));
    const next=Math.min(S.NF-1,frame+1),u=Math.min(1,Math.max(0,t/S.DT-frame));
    const a=(frame*R.actors.length+index)*7,b=(next*R.actors.length+index)*7;
    const values=[];for(let j=0;j<7;j++)values.push(R.F[a+j]*(1-u)+R.F[b+j]*u);
    return values;
  }
  function fitCanvas(canvas) {
    const box=canvas.getBoundingClientRect(),ratio=Math.min(2,window.devicePixelRatio || 1);
    if(!box.width||!box.height)return null;
    const width=Math.round(box.width*ratio),height=Math.round(box.height*ratio);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);
    return {ctx,w:box.width,h:box.height};
  }
  function roundRect(ctx,x,y,w,h,r) {ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function drawScene() {
    const setup=fitCanvas($('scene'));if(!setup||!state.R)return;
    const {ctx,w,h}=setup,R=state.R,ego=pose(R,0),scale=Math.max(3.4,Math.min(7.2,w/105));
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#eaf0e9';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#dfe7db';ctx.lineWidth=.5;
    for(let x=0;x<w;x+=25){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=0;y<h;y+=25){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    ctx.save();ctx.translate(w*.31,h*.54);ctx.rotate(-.21);ctx.scale(scale,scale);ctx.translate(-ego[0],-ego[1]);
    ctx.fillStyle='#dbe3d6';ctx.fillRect(-220,-11,550,22);ctx.fillRect(69,-55,22,110);
    ctx.fillStyle='#cdd8ce';ctx.fillRect(-220,-7,550,14);ctx.fillRect(73,-55,14,110);
    ctx.strokeStyle='#eff3e9';ctx.lineWidth=.18;ctx.setLineDash([2.3,2.1]);
    [-3.5,3.5].forEach(z=>{ctx.beginPath();ctx.moveTo(-220,z);ctx.lineTo(330,z);ctx.stroke();});
    ctx.beginPath();ctx.moveTo(80,-55);ctx.lineTo(80,55);ctx.stroke();ctx.setLineDash([]);
    ctx.strokeStyle='#bdc8b4';ctx.lineWidth=.17;[-.25,.25].forEach(z=>{ctx.beginPath();ctx.moveTo(-220,z);ctx.lineTo(330,z);ctx.stroke();});
    ctx.fillStyle='#f5f7ed';for(let z=-6.7;z<7;z+=1.55)ctx.fillRect(S.ROAD.walkX-1.5,z,3,.8);
    const buildings=[[25,-34,31,19],[94,-35,20,18],[139,-34,33,19],[197,-32,27,17],[41,16,24,21],[132,15,30,20],[207,16,28,18]];
    buildings.forEach(([x,z,bw,bh])=>{ctx.fillStyle='#c8d4be';roundRect(ctx,x+.8,z+1,bw,bh,1.5);ctx.fill();ctx.fillStyle='#dce4d3';roundRect(ctx,x,z,bw,bh,1.5);ctx.fill();ctx.fillStyle='#e5ebde';ctx.fillRect(x+2,z+2,bw-4,bh-4);});
    [[10,-14],[40,-14],[94,-15],[120,-17],[182,-14],[231,-15],[16,15],[108,17],[180,16],[254,17]].forEach(([x,z])=>{ctx.fillStyle='#bbccac';ctx.beginPath();ctx.arc(x+.4,z+.4,1.8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#c5d6b4';ctx.beginPath();ctx.arc(x,z,1.6,0,Math.PI*2);ctx.fill();});
    ctx.strokeStyle='#83b69b';ctx.lineWidth=.36;ctx.setLineDash([1.2,.8]);ctx.beginPath();ctx.moveTo(ego[0]+2.8,ego[1]);ctx.lineTo(ego[0]+43,ego[1]);ctx.stroke();ctx.setLineDash([]);
    if($('ghost-toggle').checked&&state.ghost)drawActor(ctx,state.ghost.actors[0],pose(state.ghost,0),true);
    R.actors.forEach((a,i)=>drawActor(ctx,a,pose(R,i),false));
    const event=egoEvent(R);
    if(event&&state.t+1e-6>=event.t){ctx.strokeStyle='#c38959';ctx.lineWidth=.35;ctx.beginPath();ctx.arc(event.x,event.z,2.9,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
    const v=ego[4]*3.6;
    ctx.fillStyle='#ffffffdd';roundRect(ctx,w-72,13,57,23,5);ctx.fill();ctx.fillStyle='#5d7e63';ctx.font='600 10px Segoe UI';ctx.textAlign='center';ctx.fillText(`${number(v,0)} km/h`,w-44,28);
    const line=$('scene').parentElement.querySelector('.scene-scale span');line.style.width=`${scale*10}px`;
  }
  function drawActor(ctx,a,p,ghost) {
    ctx.save();ctx.translate(p[0],p[1]);ctx.rotate(Math.atan2(p[3],p[2]));
    if(ghost)ctx.globalAlpha=.35;
    if(a.kind==='ped'){
      ctx.fillStyle=a.id.startsWith('H')?'#b97843':'#b59353';ctx.beginPath();ctx.arc(0,0,.48,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f4eddb';ctx.lineWidth=.13;ctx.stroke();
    } else {
      const length=a.dims.len,width=a.dims.wid;
      const color=ghost?'#8db39a':a.id==='ego'?'#318368':a.id==='C2'?'#b29b70':a.kind==='bus'?'#8eab90':a.id==='TG'?'#87988b':'#a6b9a9';
      ctx.fillStyle='#73856d23';roundRect(ctx,-length/2+.2,-width/2+.2,length,width,.34);ctx.fill();
      ctx.fillStyle=color;roundRect(ctx,-length/2,-width/2,length,width,.3);ctx.fill();
      ctx.strokeStyle=ghost?'#658b70':'#f0f5e467';ctx.lineWidth=.12;if(ghost)ctx.setLineDash([.3,.22]);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle=ghost?'#dbe9d155':'#e3ebd8b0';roundRect(ctx,-length*.1,-width*.35,length*.3,width*.7,.16);ctx.fill();
      if(a.id==='ego'&&!ghost){ctx.fillStyle='#245d49';ctx.beginPath();ctx.arc(-.8,0,.36,0,Math.PI*2);ctx.fill();}
      if(a.kind==='bus'){ctx.fillStyle='#d8e4cf';for(let x=-length*.32;x<length*.25;x+=1.2)ctx.fillRect(x,-width*.33,.8,width*.66);}
    }
    ctx.restore();
  }
  function drawSpeedChart() {
    const setup=fitCanvas($('speed-chart'));if(!setup||!state.R)return;
    const {ctx,w,h}=setup;ctx.clearRect(0,0,w,h);
    let max=1;[state.R,state.ghost].forEach(R=>{for(let f=0;f<S.NF;f++)max=Math.max(max,R.F[f*R.actors.length*7+4]);});
    const graph=R=>{for(let f=0;f<S.NF;f++){const x=f/(S.NF-1)*w,y=h-5-R.F[f*R.actors.length*7+4]/max*(h-13);f?ctx.lineTo(x,y):ctx.moveTo(x,y);}};
    ctx.strokeStyle='#e6eee3';ctx.lineWidth=.8;[.25,.5,.75].forEach(f=>{ctx.beginPath();ctx.moveTo(0,h*f);ctx.lineTo(w,h*f);ctx.stroke();});
    if($('ghost-toggle').checked){ctx.strokeStyle='#b5c6ae';ctx.lineWidth=1.2;ctx.setLineDash([3,3]);ctx.beginPath();graph(state.ghost);ctx.stroke();ctx.setLineDash([]);}
    ctx.beginPath();graph(state.R);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fillStyle='#5d977912';ctx.fill();
    ctx.strokeStyle='#5c9978';ctx.lineWidth=1.6;ctx.beginPath();graph(state.R);ctx.stroke();
    const x=state.t/S.T_END*w,y=h-5-pose(state.R,0)[4]/max*(h-13);ctx.strokeStyle='#b6cbb4';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();ctx.fillStyle='#4e906c';ctx.beginPath();ctx.arc(x,y,2.7,0,Math.PI*2);ctx.fill();
  }
  function updateFrame() {
    if(!state.R)return;
    $('timeline').value=state.t;
    $('time-read').innerHTML=`${state.t.toFixed(2)} <span>/ 24.00 s</span>`;
    $('ego-speed').textContent=number(pose(state.R,0)[4]*3.6,0);
    drawScene();drawSpeedChart();
  }

  function inlineMarkdown(text) {return esc(text).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');}
  function markdown(source) {
    const lines=source.split(/\r?\n/),output=[],toc=[];let i=0;
    while(i<lines.length){
      const line=lines[i];if(!line.trim()){i++;continue;}
      if(/^#{1,3} /.test(line)){const level=line.match(/^#+/)[0].length,title=line.slice(level+1),id=level===1?'report-title':`report-section-${toc.length}`;if(level===2)toc.push({title,id});output.push(`<h${level} id="${id}">${inlineMarkdown(title)}</h${level}>`);i++;continue;}
      if(line.startsWith('|')&&lines[i+1]?.match(/^\|[\s|:-]+\|$/)){
        const cells=l=>l.split('|').slice(1,-1).map(x=>inlineMarkdown(x.trim()));
        const head=cells(line);i+=2;const rows=[];while(i<lines.length&&lines[i].startsWith('|'))rows.push(cells(lines[i++]));
        output.push(`<div class="table-scroll"><table><thead><tr>${head.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);continue;
      }
      const image=line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if(image){const path=image[2];if(/^evidence\/shots\/[A-Za-z0-9_-]+\.png$/.test(path))output.push(`<img src="../${esc(path)}" alt="${esc(image[1])}" loading="lazy">`);i++;continue;}
      const paragraph=[line];i++;while(i<lines.length&&lines[i].trim()&&!/^#{1,3} |^\||^!\[/.test(lines[i]))paragraph.push(lines[i++]);output.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    }
    return {html:output.join(''),toc};
  }
  async function loadReport() {
    $('report-content').textContent='Đang mở báo cáo…';
    try {
      const response=await fetch('../REPORT.md',{cache:'no-store'});if(!response.ok)throw new Error('report');
      const source=await response.text(), rendered=markdown(source.split(/\r?\n/).slice(3).join('\n'));
      $('report-content').innerHTML=rendered.html;
      $('report-toc').innerHTML=rendered.toc.map(({title,id})=>`<a href="#${id}" data-report-anchor="${id}">${esc(title)}</a>`).join('');
      state.reportLoaded=true;
    } catch { $('report-content').textContent='Chưa có báo cáo. Tạo REPORT.md rồi cập nhật dữ liệu.'; }
  }

  icons();
  $('refresh-button').addEventListener('click',()=>loadData(true));
  $('scenario-select').addEventListener('change',e=>pickRun(e.target.value));
  $('inspect-scenario').addEventListener('click',()=>location.hash='scenarios');
  $('play-button').addEventListener('click',play);
  $('restart-button').addEventListener('click',()=>{stop();state.t=0;updateFrame();});
  $('timeline').addEventListener('input',e=>{stop();state.t=Number(e.target.value);updateFrame();});
  $('play-speed').addEventListener('change',e=>state.speed=Number(e.target.value));
  $('failure-button').addEventListener('click',()=>{const event=egoEvent(state.R);if(event){stop();state.t=event.f*S.DT;updateFrame();}});
  $('ghost-toggle').addEventListener('change',updateFrame);
  $('scenario-search').addEventListener('input',e=>{state.search=e.target.value;renderScenarios();});
  $('help-button').addEventListener('click',()=>$('help-dialog').showModal());
  $('mobile-help').addEventListener('click',()=>$('help-dialog').showModal());
  $('help-dialog').addEventListener('click',e=>{if(e.target===$('help-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  $('copy-command').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('python serve_ui.py --open');toast('Đã sao chép lệnh chạy.');}catch{toast('Lệnh chạy: python serve_ui.py --open');}});
  document.addEventListener('click',e=>{
    const run=e.target.closest('[data-run]');if(run)pickRun(run.dataset.run);
    const policy=e.target.closest('[data-policy]');if(policy&&state.current){state.policy=policy.dataset.policy;setRun(state.current,true);history.replaceState(null,'',`#overview?run=${encodeURIComponent(state.current.id)}&policy=${state.policy}`);}
    const filter=e.target.closest('[data-filter]');if(filter){state.filter=filter.dataset.filter;renderScenarios();}
    const go=e.target.closest('[data-goto]');if(go)location.hash=go.dataset.goto;
    const anchor=e.target.closest('[data-report-anchor]');if(anchor){e.preventDefault();$(anchor.dataset.reportAnchor)?.scrollIntoView({behavior:'smooth',block:'start'});}
  });
  document.addEventListener('keydown',e=>{
    if(state.view!=='overview'||$('help-dialog').open||e.target.closest('input,select,textarea,button,a'))return;
    if(e.code==='Space'){e.preventDefault();play();}
    if(e.code==='ArrowLeft'||e.code==='ArrowRight'){e.preventDefault();stop();state.t=Math.min(S.T_END,Math.max(0,state.t+(e.code==='ArrowRight'?S.DT:-S.DT)));updateFrame();}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('hashchange',applyRoute);
  new ResizeObserver(()=>{if(state.view==='overview')updateFrame();}).observe($('scene').parentElement);
  loadData().catch(error=>{console.error(error);$('loading').hidden=true;$('load-error').hidden=false;$('load-error').textContent='Không thể mở dữ liệu. Hãy chạy python serve_ui.py rồi mở địa chỉ localhost.';$('refresh-button').disabled=false;});
})();
