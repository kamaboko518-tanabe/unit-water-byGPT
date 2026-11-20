(function(root){
  'use strict';
  const sample={water:161,density:2330,designAir:4.5,alpha:0.293,limit:15,measuredAir:5,correction:0,volume:7.037,tare:6321,gross:22680};
  const labels={water:'配合上の単位水量',density:'配合上の単位容積質量',designAir:'設計空気量',alpha:'浸潤補正係数 α',limit:'許容差',measuredAir:'測定空気量',correction:'骨材修正係数',volume:'下容器容積',tare:'エアメータの質量',gross:'エアメータ＋試料の質量'};
  const mixSample={cement:293,s1:822,s2:0,s3:0,g1:633,g2:421,g3:0};
  const aggregateKeys=['s1','s2','s3','g1','g2','g3'];
  function deriveMix(input){
    const components={};
    ['water',...Object.keys(mixSample)].forEach(key=>{
      const raw=String(input[key]??'').trim().replace(/[０-９．＋－]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0)).replace(/−/g,'-');
      const name=key==='water'?'W':key==='cement'?'C':key.toUpperCase();
      if(raw===''&&aggregateKeys.includes(key)){components[key]=0;return;}
      if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)||!Number.isFinite(Number(raw)))fail(key,name+'を数値で入力してください。');
      const value=Number(raw);if(value<0||((key==='water'||key==='cement')&&value===0))fail(key,name+'の単位量を確認してください。');components[key]=value;
    });
    const density=Object.values(components).reduce((sum,value)=>sum+value,0),alpha=components.cement*0.001;
    if(!Number.isFinite(density)||!Number.isFinite(alpha))fail('cement','配合の合計が計算範囲外です。');
    return {density,alpha,components};
  }
  function fail(field,message){const e=new Error(message);e.field=field;throw e;}
  function prepare(input,skipGross=false){
    const v={};Object.keys(sample).filter(k=>!skipGross||k!=='gross').forEach(k=>{const t=String(input[k]??'').trim().replace(/[０-９．＋－]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0)).replace(/−/g,'-');if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(t)||!Number.isFinite(Number(t)))fail(k,labels[k]+'を数値で入力してください。');v[k]=Number(t);});
    ['designAir','measuredAir','correction'].forEach(k=>{v[k]=Math.round((v[k]+Number.EPSILON)*10)/10;});
    ['water','density','volume',...(!skipGross?['gross']:[])].forEach(k=>{if(v[k]<=0)fail(k,labels[k]+'は0より大きい値にしてください。');});
    ['tare','alpha','correction','limit'].forEach(k=>{if(v[k]<0)fail(k,labels[k]+'は0以上にしてください。');});
    ['designAir','measuredAir'].forEach(k=>{if(v[k]<0||v[k]>=100)fail(k,labels[k]+'は0以上100未満にしてください。');});
    if(v.designAir+v.alpha>=100)fail('alpha','設計空気量とαの合計は100未満にしてください。');
    if(!skipGross&&v.gross<=v.tare)fail('gross','総質量は、エアメータ単体より大きくしてください。');
    const air=v.measuredAir-v.correction;if(air<0||air>=100)fail('correction','試料中の空気量が0以上100未満になるよう確認してください。');
    return {...v,air};
  }
  function calculate(input){
    const v=prepare(input),air=v.air;
    const mass=v.gross-v.tare,factor=1-(v.designAir+v.alpha)*0.01,gamma1=v.density/factor,gamma2=mass/(v.volume*(1-air*0.01));
    if(!Number.isFinite(gamma2)||gamma2<=1000+1e-9)fail('gross','空気を除いた密度が1000 kg/m³以下です。質量・容積・空気量を確認してください。');
    const error=(gamma2*factor-v.density)/(1-gamma2*0.001),estimated=v.water+error;
    if(!Number.isFinite(estimated)||estimated<0)fail('gross','推定単位水量が計算範囲外です。入力値と単位を確認してください。');
    return {...v,air,mass,gamma1,gamma2,error,estimated,pass:Math.abs(error)<=v.limit+1e-9,lower:v.water-v.limit,upper:v.water+v.limit};
  }
  function massRange(input){
    const v=prepare(input,true),factor=1-(v.designAir+v.alpha)*0.01;
    if(v.water-v.limit<0||factor-v.limit*0.001<=0)fail('limit','許容差が計算可能な範囲を超えています。規格値を確認してください。');
    const endpoints=[-v.limit,v.limit].map(error=>{
      const gamma=(v.density+error)/(factor+error*0.001);
      if(!Number.isFinite(gamma)||gamma<=1000+1e-9)fail('density','質量範囲を計算できません。配合・許容差を確認してください。');
      return gamma*v.volume*(1-v.air*0.01);
    });
    const lower=Math.min(...endpoints),upper=Math.max(...endpoints);
    const grossZero=v.density/factor*v.volume*(1-v.air*0.01)+v.tare;
    return {lower,upper,grossZero,grossLower:lower+v.tare,grossUpper:upper+v.tare,integerLower:Math.ceil(lower),integerUpper:Math.floor(upper),integerGrossLower:Math.ceil(lower+v.tare),integerGrossUpper:Math.floor(upper+v.tare),air:v.air,limit:v.limit};
  }
  const api={calculate,massRange,deriveMix,mixSample,aggregateKeys,sample,labels};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WaterCalc=api;
})(typeof globalThis!=='undefined'?globalThis:this);
