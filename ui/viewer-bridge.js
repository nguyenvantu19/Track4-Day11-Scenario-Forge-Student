/* Load the saved scenario and requested policy into the local 3D viewer. */
(() => {
  const query=new URLSearchParams(location.search),id=query.get('run'),chosen=query.get('policy')==='chosen';
  const frame=document.getElementById('viewer-frame'),notice=document.getElementById('notice');
  document.getElementById('back-link').href=`./#overview${id?'?run='+encodeURIComponent(id)+'&policy='+(chosen?'chosen':'baseline'):''}`;
  let loaded=false;
  async function load() {
    if(loaded)return;
    const doc=frame.contentDocument,input=doc?.getElementById('labFile');
    if(!input)return;
    loaded=true;
    try {
      const response=await fetch('../evidence/viewer.json',{cache:'no-store'});
      if(!response.ok)throw new Error('missing viewer');
      const data=await response.json();
      if(data.format!=='avsim-viewer/1'||!Array.isArray(data.runs))throw new Error('invalid viewer');
      const index=id?data.runs.findIndex(run=>run.id===id):0;
      if(index<0)throw new Error('unknown scenario');
      const run=data.runs[index];
      // Apply the requested policy to every selectable scene, including the exported hazard scenes.
      data.runs.forEach(scene=>scene.policy=chosen?null:{...frame.contentWindow.SimCore.POLICY});
      function labelPolicies() {
        const read=doc.getElementById('labRead');
        if(read)for(const label of read.children){
          if(label.textContent==='chính sách của bạn')label.textContent=chosen?'bản sửa (xe chính)':'policy gốc (xe chính)';
          if(label.textContent==='chính sách gốc')label.textContent=chosen?'policy gốc (bóng)':'bản sửa (bóng)';
        }
        const selected=doc.querySelector('#labRuns [aria-pressed="true"]');
        const active=selected?data.runs[Number(selected.dataset.i)]:run;
        document.getElementById('viewer-label').textContent=`${active.id} · ${chosen?'Bản sửa':'Policy gốc'} · ${data.title || 'Scenario Forge'}`;
        document.getElementById('back-link').href=`./#overview?run=${encodeURIComponent(active.id)}&policy=${chosen?'chosen':'baseline'}`;
      }
      const transfer=new frame.contentWindow.DataTransfer();
      transfer.items.add(new frame.contentWindow.File([JSON.stringify(data)],'viewer.json',{type:'application/json'}));
      input.files=transfer.files;
      const ready=new MutationObserver(()=>{
        const button=doc.querySelector(`#labRuns button[data-i="${index}"]`);
        if(!button)return;
        ready.disconnect();button.click();notice.hidden=true;labelPolicies();
        new MutationObserver(labelPolicies).observe(doc.getElementById('labRead'),{childList:true});
      });
      ready.observe(doc.getElementById('labRuns'),{childList:true});
      input.dispatchEvent(new frame.contentWindow.Event('change',{bubbles:true}));
    } catch {
      notice.textContent='Không thể nạp cảnh đã chọn. Mở phòng thí nghiệm để chọn lại hoặc nạp evidence/viewer.json vào trình xem.';
    }
  }
  frame.addEventListener('load',load);
  if(frame.contentDocument?.readyState==='complete')load();
})();
