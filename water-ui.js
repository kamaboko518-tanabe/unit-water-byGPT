(function(){
  'use strict';
  const form=document.getElementById('water-form'),result=document.getElementById('result'),message=document.getElementById('error');
  const fields=Object.keys(WaterCalc.sample).filter(k=>k!=='density'&&k!=='alpha').concat(Object.keys(WaterCalc.mixSample));
  const isBlankRequired=input=>fields.filter(k=>!WaterCalc.aggregateKeys.includes(k)).some(k=>normalized(input[k])==='');
  const fmt=(n,d=3)=>new Intl.NumberFormat('ja-JP',{maximumFractionDigits:d,minimumFractionDigits:d}).format(Math.abs(n)<0.5*Math.pow(10,-d)?0:n);
  const put=(id,text)=>{document.getElementById(id).textContent=text;};
  const airFields=['designAir','measuredAir','correction'];
  function normalized(raw){return String(raw).trim().replace(/[０-９．＋－]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0)).replace(/−/g,'-');}
  function formatAir(key){const f=document.getElementById(key),t=normalized(f.value);if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(t)&&Number.isFinite(Number(t)))f.value=(Math.round((Number(t)+Number.EPSILON)*10)/10).toFixed(1);}
  function clearError(){message.hidden=true;message.textContent='';fields.forEach(k=>document.getElementById(k).removeAttribute('aria-invalid'));}
  function resetResult(status='入力待ち'){result.hidden=true;document.getElementById('pending').hidden=false;put('fixed-water','—');put('fixed-error','—');put('fixed-state',status);document.getElementById('fixed-state').dataset.pass='pending';}
  function updateMassRange(input){
    const values=document.getElementById('mass-range-values'),hint=document.getElementById('mass-range-message');
    values.hidden=true;hint.hidden=false;
    if(fields.filter(k=>k!=='gross'&&!WaterCalc.aggregateKeys.includes(k)).some(k=>normalized(input[k])==='')){hint.textContent='配合・空気量・容器の条件を入力すると、下限と上限を表示します。';return;}
    try{
      const r=WaterCalc.massRange(input);
      if(r.integerGrossLower>r.integerGrossUpper){hint.textContent='この条件では、許容差内に収まる整数gの総質量がありません。';return;}
      put('gross-mass-low',fmt(r.integerGrossLower,0));put('gross-mass-zero',fmt(r.grossZero,0));put('gross-mass-high',fmt(r.integerGrossUpper,0));
      put('mass-range-condition','補正後空気量 '+fmt(r.air,1)+' % ／ 許容差 ±'+fmt(r.limit,3)+' kg/m³');values.hidden=false;hint.hidden=true;
    }catch(e){hint.textContent=e.message;}
  }
  function calculate(){
    clearError();const input=Object.fromEntries(fields.map(k=>[k,document.getElementById(k).value]));
    try{
      const mix=WaterCalc.deriveMix(input);input.density=mix.density;input.alpha=mix.alpha;
      put('density',new Intl.NumberFormat('ja-JP',{maximumFractionDigits:3}).format(mix.density));put('alpha',fmt(mix.alpha,3));
    }catch(e){
      put('density','—');put('alpha','—');resetResult();document.getElementById('mass-range-values').hidden=true;document.getElementById('mass-range-message').hidden=false;document.getElementById('mass-range-message').textContent='配合を入力すると質量範囲を表示します。';
      if(!isBlankRequired(input)){message.textContent=e.message;message.hidden=false;if(e.field)document.getElementById(e.field).setAttribute('aria-invalid','true');}
      return false;
    }
    updateMassRange(input);if(isBlankRequired(input)){resetResult();return false;}try{
      const r=WaterCalc.calculate(input);
      result.hidden=false;document.getElementById('pending').hidden=true;
      put('estimated',fmt(r.estimated,0));put('exact-water',fmt(r.estimated)+' kg/m³');put('deviation',(r.error>0?'+':'')+fmt(r.error)+' kg/m³');
      const roundedError=Math.sign(r.error)*Math.round(Math.abs(r.error));put('error-integer',(roundedError>0?'+':roundedError<0?'−':'')+fmt(Math.abs(roundedError),0));
      put('fixed-water',fmt(r.estimated,0));put('fixed-error',(roundedError>0?'+':roundedError<0?'−':'')+fmt(Math.abs(roundedError),0));put('fixed-state',r.pass?'許容差内':'許容差外');document.getElementById('fixed-state').dataset.pass=String(r.pass);
      put('criteria',fmt(r.water,0)+' ± '+fmt(r.limit,0)+' kg/m³');put('range',fmt(r.lower,0)+' ～ '+fmt(r.upper,0)+' kg/m³');
      put('verdict',r.pass?'許容差内':'許容差外');document.getElementById('verdict').dataset.pass=String(r.pass);
      put('mass-result',fmt(r.mass,0)+' g');put('air-result',fmt(r.air,1)+' %');put('gamma1',fmt(r.gamma1)+' kg/m³');put('gamma2',fmt(r.gamma2)+' kg/m³');
      put('mass-work',fmt(r.gross,3)+' − '+fmt(r.tare,3)+' = '+fmt(r.mass,3)+' g');put('air-work',fmt(r.measuredAir,1)+' − '+fmt(r.correction,1)+' = '+fmt(r.air,1)+' %');
      put('gamma1-work',r.density+' ÷ {1 − ('+r.designAir+' + '+r.alpha+') × 0.01}');put('gamma2-work',r.mass+' ÷ {'+r.volume+' × (1 − '+r.air+' × 0.01)}');
      put('error-work','{γ₂ × [1 − ('+r.designAir+' + '+r.alpha+') × 0.01] − '+r.density+'} ÷ (1 − γ₂ × 0.001)');put('water-work',r.water+' + ('+fmt(r.error,6)+') = '+fmt(r.estimated,6)+' kg/m³');return true;
    }catch(e){resetResult('入力エラー');message.textContent=e.message;message.hidden=false;if(e.field)document.getElementById(e.field).setAttribute('aria-invalid','true');return false;}
  }
  form.addEventListener('submit',e=>{e.preventDefault();airFields.forEach(formatAir);calculate();});
  fields.forEach(k=>document.getElementById(k).addEventListener('input',event=>{document.getElementById('sample-notice').hidden=true;if(event&&event.isComposing){resetResult();document.getElementById('mass-range-values').hidden=true;document.getElementById('mass-range-message').hidden=false;document.getElementById('mass-range-message').textContent='入力が完了すると範囲を表示します。';return;}if(airFields.includes(k)&&/\.\d{2,}$/.test(normalized(document.getElementById(k).value)))formatAir(k);calculate();}));
  airFields.forEach(k=>document.getElementById(k).addEventListener('blur',()=>{formatAir(k);calculate();}));
  fields.forEach(k=>document.getElementById(k).addEventListener('compositionend',()=>{if(airFields.includes(k))formatAir(k);calculate();}));
  document.getElementById('sample').addEventListener('click',()=>{const values={...WaterCalc.sample,...WaterCalc.mixSample};fields.forEach(k=>document.getElementById(k).value=values[k]);airFields.forEach(formatAir);document.getElementById('sample-notice').hidden=false;calculate();});
  document.getElementById('clear-measurement').addEventListener('click',()=>{['measuredAir','gross'].forEach(k=>document.getElementById(k).value='');document.getElementById('sample-notice').hidden=true;calculate();document.getElementById('measuredAir').focus();});
  airFields.forEach(formatAir);document.getElementById('startup-warning').hidden=true;document.getElementById('fixed-summary').hidden=false;calculate();
})();
